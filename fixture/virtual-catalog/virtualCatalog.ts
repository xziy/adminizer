import {
    AbstractCatalog,
    AbstractGroup,
    AbstractItem,
    ActionHandler,
    Item
} from "../../dist/lib/v4/catalog/AbstractCatalog";
import {AdminpanelConfig, ModelConfig, NavigationConfig} from "../../dist/interfaces/adminpanelConfig";
import {Adminizer} from "../../dist";
import {NavItem} from "../../src/lib/v4/catalog/Navigation";


class TestCatalogStorageService {
    protected storageMap: Map<string | number, NavItem> = new Map();
    protected model: string
    protected readonly adminizer: Adminizer

    constructor(adminizer: Adminizer, model: string) {
        this.adminizer = adminizer;
        this.model = model.toLowerCase()
        this.initModel()
    }

    protected async initModel() {
        // Direct call by model adapter
        const model = await this.adminizer.modelHandler.model.get(this.model)["_findOne"]({id: 1});
        if (model) {
            Adminizer.log.info(`Found existing text catalog model`);
            await this.populateFromTree(model.tree);
        } else {
            const tree = {tree: [] as any};
            // Direct call by model adapter
            await this.adminizer.modelHandler.model.get(this.model)["_create"](tree);
            Adminizer.log.info(`Created a new test catalog model`);
        }
    }

    public async buildTree(): Promise<any> {
        const rootElements: NavItem[] = await this.findElementsByParentId(0, null);
        const buildSubTree = async (elements: NavItem[]): Promise<any[]> => {
            const tree = [];
            for (const element of elements) {
                const children = await this.findElementsByParentId(element.id, null);
                tree.push({
                    ...element,
                    children: await buildSubTree(children)
                });
            }
            return tree;
        };

        let tree = await buildSubTree(rootElements);

        function sortTree(items: any[]) {
            items.sort((a, b) => a.sortOrder - b.sortOrder);

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.children) {
                    sortTree(item.children);
                }
            }
        }

        sortTree(tree)
        return tree
    }

    public async populateFromTree(tree: any[]): Promise<void> {
        const traverseTree = async (node: any, parentId: string | number | null = 0): Promise<void> => {
            const {children, ...itemData} = node;
            const item = {...itemData, parentId} as NavItem;
            await this.setElement(item.id, item, true);

            if (children && children.length > 0) {
                for (const child of children) {
                    await traverseTree(child, item.id);
                }
            }
        };

        for (const node of tree) {
            await traverseTree(node);
        }
    }

    public async setElement(id: string | number, item: NavItem, init: boolean = false): Promise<NavItem> {
        this.storageMap.set(item.id, item);
        if (!init) await this.saveToDB()
        // This like fetch in DB
        return this.findElementById(item.id);
    }

    public async removeElementById(id: string | number): Promise<void> {
        this.storageMap.delete(id);
        setTimeout(async () => {
            await this.saveToDB()
        }, 500)

    }

    public async findElementById(id: string | number): Promise<NavItem | undefined> {
        return this.storageMap.get(id);
    }

    public async findElementByModelId(modelId: string | number): Promise<NavItem[] | undefined> {
        const elements: NavItem[] = [];
        for (const item of this.storageMap.values()) {
            if (item.modelId === modelId) {
                elements.push(item)
            }
        }
        return elements;
    }

    public async saveToDB() {
        let tree = await this.buildTree()

        try {
            // Direct call by model adapter
            await this.adminizer.modelHandler.model.get(this.model)["_update"](
                {id: 1},
                {tree: tree}
            )
        } catch (e) {
            console.log(e)
            throw 'navigation model update error'
        }
    }

    public async findElementsByParentId(parentId: string | number, type: string | null): Promise<NavItem[]> {
        const elements: NavItem[] = [];
        for (const item of this.storageMap.values()) {
            if (type === null && item.parentId === parentId) {
                elements.push(item);
                continue;
            }
            if (item.parentId === parentId && item.type === type) {
                elements.push(item);
            }
        }
        return elements;
    }

    public async getAllElements(): Promise<NavItem[]> {
        return Array.from(this.storageMap.values());
    }

    public async search(s: string, type: string): Promise<NavItem[]> {
        const lowerCaseQuery = s.toLowerCase(); // Convert query to lowercase for case-insensitive search
        const matchedElements: NavItem[] = [];

        for (const item of this.storageMap.values()) {
            // Check if item type matches the specified type
            if (item.type === type) {
                // Search by name
                if (item.name.toLowerCase().includes(lowerCaseQuery)) {
                    matchedElements.push(item);
                }
            }
        }

        return matchedElements;
    }
}

class StorageHandler {
    private static instance: TestCatalogStorageService = null

    private constructor() {}

    public static setStorage(storage: TestCatalogStorageService): void {
        this.instance = storage;
    }

    public static getStorage(): TestCatalogStorageService {
        return this.instance;
    }
}

export class TestCatalog extends AbstractCatalog {
    readonly name: string = 'Test Catalog';
    readonly slug: string = 'test-catalog';
    public readonly icon: string = "bug_report";
    public readonly actionHandlers: ActionHandler[] = []
    public idList: string[] = []

    constructor(adminizer: Adminizer, model: string) {
        let storage = new TestCatalogStorageService(adminizer, model);
        StorageHandler.setStorage(storage);
        let items = []
        items.push(new TestItem(adminizer))
        items.push(new TestGroup(adminizer))
        super(adminizer, items);
    }
}

export class TestItem extends AbstractItem<Item> {
    type: string = "item";
    adminizer: Adminizer
    name: string = "Test Item";
    allowedRoot: boolean = true;
    icon: string = 'sell';
    actionHandlers: ActionHandler[] = []

    constructor(adminizer: Adminizer) {
        super();
        this.adminizer = adminizer;
    }

    async find(itemId: string | number, catalogId: string, req?: ReqType): Promise<Item> {
        return await StorageHandler.getStorage().findElementById(itemId);
    }

    update(itemId: string | number, data: Item, catalogId: string, req?: ReqType): Promise<Item> {
        throw new Error("Method not implemented.");
    }

    updateModelItems(modelId: string | number, data: any, catalogId: string, req?: ReqType): Promise<Item> {
        throw new Error("Method not implemented.");
    }

    create(data: Item, catalogId: string, req?: ReqType): Promise<Item> {
        throw new Error("Method not implemented.");
    }

    deleteItem(itemId: string | number, catalogId: string, req?: ReqType): Promise<void> {
        throw new Error("Method not implemented.");
    }

    getAddTemplate(req: ReqType): Promise<{
        type: "component" | "navigation.item" | "navigation.group" | "navigation.link" | "model";
        data: any;
    }> {
        let type: 'component'

        return Promise.resolve({
            type: type,
            data: {

            }
        })
    }

    getEditTemplate(id: string | number, catalogId: string, req: ReqType, modelId?: string | number): Promise<{
        type: "component" | "navigation.item" | "navigation.group" | "navigation.link" | "model";
        data: any;
    }> {
        throw new Error("Method not implemented.");
    }

    async getChilds(parentId: string | number, catalogId: string, req?: ReqType): Promise<Item[]> {
        return await StorageHandler.getStorage().findElementsByParentId(parentId, this.type);
    }

    search(s: string, catalogId: string, req?: ReqType): Promise<Item[]> {
        throw new Error("Method not implemented.");
    }
}

class TestGroup extends TestItem {
    name: string = "Test Group";
    public readonly type: string = "group";
    public readonly isGroup: boolean = true;
    public icon: string = "folder";
}