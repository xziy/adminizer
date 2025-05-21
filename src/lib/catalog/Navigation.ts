import {AbstractCatalog, AbstractGroup, AbstractItem, ActionHandler, Item} from "./AbstractCatalog";
import {AdminpanelConfig, ModelConfig, NavigationConfig} from "../../interfaces/adminpanelConfig";
import * as fs from "node:fs";

import {v4 as uuid} from "uuid";
import {Adminizer} from "../Adminizer";
import inertiaAddHelper from "../../helpers/inertiaAddHelper";

export interface NavItem extends Item {
	urlPath?: any;
	modelId?: string | number;
	targetBlank?: boolean
}


class StorageService {
	protected storageMap: Map<string | number, NavItem> = new Map();
	protected id: string
	protected model: string
	protected readonly adminizer: Adminizer

	constructor(adminizer: Adminizer, id: string, model: string) {
		this.adminizer = adminizer;
		this.id = id
		this.model = model.toLowerCase()
		this.initModel()
	}

	protected async initModel() {
		try {
			// TODO refactor CRUD functions for DataAccessor usage
			const navigation = await this.adminizer.modelHandler.model.get(this.model)["_findOne"]({ label: this.id });

			if (navigation) {
				Adminizer.log.info(`Found existing navigation: ${this.id}`);
				await this.populateFromTree(navigation.tree);
			} else {
				const newNavigation = { label: this.id, tree: [] as any };
				// TODO refactor CRUD functions for DataAccessor usage
				await this.adminizer.modelHandler.model.get(this.model)["_create"](newNavigation);
				Adminizer.log.info(`Created a new navigation: ${this.id}`);
			}
		} catch (error) {
			throw error;
		}
	}

	public getId() {
		return this.id
	}

	public async buildTree(): Promise<any> {
		const rootElements: NavItem[] = await this.findElementsByParentId(null, null);
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
		const traverseTree = async (node: any, parentId: string | number | null = null): Promise<void> => {
			const {children, ...itemData} = node;
			const item = {...itemData, parentId} as NavItem;
			await this.setElement(item.id, item);

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


	public async setElement(id: string | number, item: NavItem): Promise<NavItem> {
		this.storageMap.set(item.id, item);
		await this.saveToDB()
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
        console.log({label: this.id},
            {tree: tree})
		try {
			// TODO refactor CRUD functions for DataAccessor usage
           await this.adminizer.modelHandler.model.get(this.model)["_update"](
				{label: this.id},
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

export class StorageServices {
	protected static storages: StorageService[] = []

	public static add(storage: StorageService) {
		this.storages.push(storage)
	}

	public static get(id: string) {
		return this.storages.find(storage => storage.getId() === id)
	}

	public static getAll() {
		return this.storages
	}
}

export class Navigation extends AbstractCatalog {
	readonly name: string = 'Navigation';
	readonly slug: string = 'navigation';
	public readonly icon: string = "box";
	public readonly actionHandlers: ActionHandler[] = []
	public idList: string[] = []

	constructor(adminizer: Adminizer, config: NavigationConfig) {
		let items = []
		for (const configElement of config.items) {
			items.push(new NavigationItem(
				adminizer,
				configElement.title,
				configElement.model,
				config.model,
				configElement.urlPath
			))
		}
		items.push(new NavigationGroup(adminizer, config.groupField))
		items.push(new LinkItem(adminizer))
		for (const section of config.sections) {
			StorageServices.add(new StorageService(adminizer, section, config.model))
		}
		super(adminizer, items);
		this.movingGroupsRootOnly = config.movingGroupsRootOnly
		this.idList = config.sections ?? []
	}

	async getIdList(){
		return this.idList
	}
}

class NavigationItem extends AbstractItem<NavItem> {
	readonly allowedRoot: boolean = true;
	readonly icon: string;
	readonly name: string;
	readonly type: string;
	protected model: string;
	protected navigationModel: string;
	public readonly actionHandlers: ActionHandler[] = []
	public readonly urlPath: any;
	public readonly adminizer: Adminizer

	constructor(adminizer: Adminizer, name: string, model: string, navigationModel: string, urlPath: any) {
		super();
		this.name = name
		this.navigationModel = navigationModel
		this.model = model.toLowerCase()
		this.type = model.toLowerCase()
		this.urlPath = urlPath
		let configModel = adminizer.config.models[this.model] as ModelConfig
		this.icon = configModel?.icon ?? 'file'
		this.adminizer = adminizer;
	}

	async create(data: any, catalogId: string): Promise<NavItem> {
		let storage = StorageServices.get(catalogId)
		let storageData = null
		if (data._method === 'select') {
			// TODO refactor CRUD functions for DataAccessor usage
			let record = await this.adminizer.modelHandler.model.get(this.model)["_findOne"]({id: data.record})
			storageData = await this.dataPreparation({
				record: record,
				parentId: data.parentId,
				targetBlank: data.targetBlank
			}, catalogId)
		} else {
			storageData = await this.dataPreparation(data, catalogId)
		}
		return await storage.setElement(data.id, storageData) as NavItem;
	}

    protected async dataPreparation(data: any, catalogId: string, sortOrder?: number) {
        let storage = StorageServices.get(catalogId);
        let urlPath = eval('`' + this.urlPath + '`');
        let parentId = data.parentId ? data.parentId : 0; // changed from null to 0
        return {
            id: uuid(),
            modelId: data.record.id,
            targetBlank: data.targetBlank ?? data.record.targetBlank,
            name: data.record.name ?? data.record.title ?? data.record.id,
            parentId: parentId,
            sortOrder: sortOrder ?? (await storage.findElementsByParentId(parentId, null)).length,
            icon: this.icon,
            type: this.type,
            urlPath: urlPath
        };
    }

	async updateModelItems(modelId: string | number, data: any, catalogId: string): Promise<NavItem> {
		let storage = StorageServices.get(catalogId)
		let items = await storage.findElementByModelId(modelId)
		let urlPath = eval('`' + this.urlPath + '`')
		for (const item of items) {
			item.name = data.record.name
			item.urlPath = urlPath
			if (item.id === data.record.treeId) {
				item.targetBlank = data.record.targetBlank
			}
			await storage.setElement(item.id, item);
		}
		return Promise.resolve(undefined)
	}

	async update(itemId: string | number, data: any, catalogId: string): Promise<NavItem> {
		let storage = StorageServices.get(catalogId)
		return await storage.setElement(itemId, data);
	}

	async deleteItem(itemId: string | number, catalogId: string): Promise<void> {
		let storage = StorageServices.get(catalogId)
		return await storage.removeElementById(itemId);
	}

	async find(itemId: string | number, catalogId: string): Promise<NavItem> {
		let storage = StorageServices.get(catalogId)
		return await storage.findElementById(itemId);
	}

	async getAddHTML(req: ReqType): Promise<{
        type: 'component' | 'navigation.item' | 'navigation.group' | 'model',
        data: {
            items: { id: string; name: string}[],
            model: string,
            labels?: Record<string, string>,
        }
    }> {
		let type: 'navigation.item' = 'navigation.item'
		// TODO refactor CRUD functions for DataAccessor usage
		let itemsDB = await this.adminizer.modelHandler.model.get(this.model)["_find"]({})
        let items = itemsDB.map((item: any) => {
            return{
                id: item.id,
                name: item.name ?? item.title ?? item.id
            }
        })
		return {
			type: type,
            data: {
                items: items,
                model: this.model,
                labels: {
                    selectTitle: `${req.i18n.__('Select')} ${req.i18n.__(this.name + 's')}`,
                    createTitle: `${req.i18n.__('create new')} ${req.i18n.__(this.name + 's')}`,
                    OR: req.i18n.__('OR')
                }
            }
		}
	}

	async getChilds(parentId: string | number | null, catalogId: string): Promise<NavItem[]> {
		let storage = StorageServices.get(catalogId)
		return await storage.findElementsByParentId(parentId, this.type);
	}

	async getEditHTML(id: string | number, catalogId: string, req: ReqType, modelId: string | number): Promise<{
		type: "link" | "html" | "jsonForm";
		data: string
	}> {
		let item = await this.find(id, catalogId)
		let type: 'html' = 'html'

		// This dirty hack is here because the field of view is disappearing
		req.i18n.setLocale(req.user.locale);
		const __ = (s: string) => {
			return req.i18n.__(s)
		}

		return Promise.resolve({
			type: type,
			// data: ejs.render(fs.readFileSync(ViewsHelper.getViewPath('./../../views/ejs/navigation/itemHTMLEdit.ejs'), 'utf8'), {item: item, __: __})
            data: ''
		})
	}

	async search(s: string, catalogId: string): Promise<NavItem[]> {
		let storage = StorageServices.get(catalogId)
		return await storage.search(s, this.type);
	}

}

class NavigationGroup extends AbstractGroup<NavItem> {
	readonly allowedRoot: boolean = true;
	readonly name: string = "Group";
	readonly groupField: object[]
	public readonly adminizer: Adminizer

	constructor(adminizer: Adminizer, groupField: object[]) {
		super();
		this.groupField = groupField
		this.adminizer = adminizer;
	}

	async create(data: any, catalogId: string): Promise<NavItem> {
		let storage = StorageServices.get(catalogId)

		let storageData = await this.dataPreparation(data, catalogId)
		delete data.name
		delete data.parentId
		storageData = {...storageData, ...data}

		return await storage.setElement(storageData.id, storageData) as NavItem;
	}

    protected async dataPreparation(data: any, catalogId: string, sortOrder?: number) {
        let storage = StorageServices.get(catalogId);
        let parentId = data.parentId ? data.parentId : 0; // changed from null to 0
        return {
            id: uuid(),
            name: data.name,
            targetBlank: data.targetBlank,
            parentId: parentId,
            sortOrder: sortOrder ?? (await storage.findElementsByParentId(parentId, null)).length,
            icon: this.icon,
            type: this.type
        };
    }

	async deleteItem(itemId: string | number, catalogId: string): Promise<void> {
		let storage = StorageServices.get(catalogId)
		return await storage.removeElementById(itemId);
	}

	async find(itemId: string | number, catalogId: string): Promise<NavItem> {
		let storage = StorageServices.get(catalogId)
		return await storage.findElementById(itemId);
	}

	async update(itemId: string | number, data: any, catalogId: string): Promise<NavItem> {
		let storage = StorageServices.get(catalogId)
		return await storage.setElement(itemId, data);
	}

	async updateModelItems(modelId: string | number, data: NavItem, catalogId: string): Promise<NavItem> {
		let storage = StorageServices.get(catalogId)
		return await storage.setElement(modelId, data);
	}

	getAddHTML(req: ReqType):Promise<{
        type: 'component' | 'model' | string,
        data: {
            items?: { name: string, required: boolean }[] | Record<string, any>[],
            model?: string,
            labels?: Record<string, string>,
        }
    }>  {
		let type: 'navigation.group' = 'navigation.group'
        let resItems: { name: string; required: boolean; }[] = []
        if (this.groupField.length) {
            resItems = this.groupField.map((field: any) => {
                return {
                    name: field.name,
                    required: field.required
                }
            })
        }
		return Promise.resolve({
			type: type,
            data: {
                items: resItems,
                labels: {
                    openInNewWindow: req.i18n.__('Open in a new window'),
                    title: req.i18n.__('Title'),
                    save: req.i18n.__('Save')
                }
            }
		})
	}

	async getChilds(parentId: string | number | null, catalogId: string): Promise<NavItem[]> {
		let storage = StorageServices.get(catalogId)
		return await storage.findElementsByParentId(parentId, this.type);
	}

	async getEditHTML(id: string | number, catalogId: string, req: ReqType, modelId?: string | number): Promise<{
		type: "link" | "html" | "jsonForm";
		data: string
	}> {
		let type: 'html' = 'html'
		let item = await this.find(id, catalogId)

		// This dirty hack is here because the field of view is disappearing
		req.i18n.setLocale(req.user.locale);
		const __ = (s: string) => {
			return req.i18n.__(s)
		}

		return Promise.resolve({
			type: type,
			// data: ejs.render(fs.readFileSync(ViewsHelper.getViewPath('./../../views/ejs/navigation/GroupHTMLEdit.ejs'), 'utf8'), {
			// 	fields: this.groupField,
			// 	item: item,
			// 	__: __
			// }),
            data: ''
		})
	}

	async search(s: string, catalogId: string): Promise<NavItem[]> {
		let storage = StorageServices.get(catalogId)
		return await storage.search(s, this.type);
	}
}

class LinkItem extends NavigationGroup {
	readonly allowedRoot: boolean = true;
	readonly icon: string = 'external-link-alt';
	readonly name: string = 'Link';
	readonly type: string = 'link';
	readonly isGroup: boolean = false;

	constructor(adminizer: Adminizer) {
		super(adminizer, []);
	}

	getAddHTML(req: ReqType): Promise<{ type: "link" | "html" | "jsonForm"; data: string }> {
		let type: 'html' = 'html'
		req.i18n.setLocale(req.user.locale);

		const __ = (s: string) => {
			return req.i18n.__(s)
		}
		return Promise.resolve({
			type: type,
			// data: ejs.render(fs.readFileSync(ViewsHelper.getViewPath('./../../views/ejs/navigation/LinkItemAdd.ejs'), 'utf8'), {__: __}),
            data: ''
		})
	}

	async getEditHTML(id: string | number, catalogId: string, req: ReqType): Promise<{
		type: "link" | "html" | "jsonForm";
		data: string
	}> {
		let type: 'html' = 'html'
		let item = await this.find(id, catalogId)

		req.i18n.setLocale(req.user.locale);
		const __ = (s: string) => {
			return req.i18n.__(s)
		}

		return Promise.resolve({
			type: type,
			// data: ejs.render(fs.readFileSync(ViewsHelper.getViewPath('./../../views/ejs/navigation/LinkItemEdit.ejs'), 'utf8'), {
			// 	fields: this.groupField,
			// 	item: item,
			// 	__: __
			// }),
            data: ''
		})
	}

}
