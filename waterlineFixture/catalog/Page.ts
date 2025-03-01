import { ActionHandler, BaseItem, Item } from "../../dist/lib/catalog/AbstractCatalog";
import Page from "../api/models/Page";
import { Populated } from "../types/waterline";

export class PageItem extends BaseItem<Item> {
    isGroup: boolean;
    find(itemId: string | number, catalogId: string): Promise<Item> {
        throw new Error("Method not implemented.");
    }
    updateModelItems(modelId: string | number, data: any, catalogId: string): Promise<Item> {
        throw new Error("Method not implemented.");
    }
    getChilds(parentId: string | number | null, catalogId: string): Promise<Item[]> {
        throw new Error("Method not implemented.");
    }
    search(s: string, catalogId: string): Promise<Item[]> {
        throw new Error("Method not implemented.");
    }
    readonly actionHandlers: ActionHandler[] = [];
    readonly icon: string;
    readonly id: string;
    readonly name: string = 'Page';
    readonly parentId: string | number | null;
    readonly type: string = 'page';
    readonly allowedRoot: boolean = true
    readonly level: number;


    // @ts-ignore
    getAddHTML(req: ReqType) {
        let type: 'link' = 'link'
        return {
            type: type,
            data: '/admin/model/page/add?without_layout=true'
        }
    }
    async getEditHTML(id: string) {
        let type: 'link' = 'link'
        return {
            type: type,
            data: `/admin/model/page/edit/${id}?without_layout=true`
        }
    }

    async update(id: string, data: any): Promise<any> {
        delete data['id']
        try{
            let resDB = await Page.update({id: id}).set({
                title: data.title,
                text: data.text,
                gallery: data.gallery,
                about: data.about
            }).fetch()
            if(resDB) return {ok: true}
        } catch (e){
            return e
        }
    }


    async create<T>(data: T, catalogId: string): Promise<T> {
        try {
            let node: Item
            let newNode: { id?: string; type?: string; updatedAt?: number; createdAt?: number; label?: string; catalogOrder?: number; parentID?: string; level?: number; pages: Populated<Page>; }
            if (!data.isNew) {
                let page = (await Page.find({id: data.id}))[0]
                if (page) {
                    let nodeDB = await CatalogPageNav.create({
                        label: catalogId,
                        level: 1,
                        catalogOrder: data.sortOrder,
                        pages: page.id,
                        type: this.type,
                        parentID: ''
                    }).fetch()
                    newNode = (await CatalogPageNav.find({id: nodeDB.id}).populate('pages'))[0]
                }
            } else {
                let page = await Page.create(data).fetch()
                if (page) {
                    let nodeDB = await CatalogPageNav.create({
                        label: catalogId,
                        level: 1,
                        catalogOrder: data.sortOrder,
                        pages: page.id,
                        type: this.type,
                        parentID: ''
                    }).fetch()
                    newNode = (await CatalogPageNav.find({id: nodeDB.id}).populate('pages'))[0]
                }
            }
            node = {
                children: [],
                data: {
                    id: newNode.pages.id,
                    type: newNode.type,
                    parent: newNode.parentID,
                    slug: newNode.pages.slug
                },
                isLeaf: true,
                isExpanded: false,
                ind: newNode.catalogOrder,
                title: newNode.pages.title,
                level: newNode.level
            }
            return {node: node}
        } catch (e) {
            return e
        }
    }

    async getCreatedItems(id: string): Promise<{ items: { id: string; title: string }[] }> {
        let pages = await Page.find()
        let items = []
        for (const page of pages) {
            items.push({
                id: page.id,
                title: page.title
            })
        }
        return {items: items}
    }

    deleteItem(itemId: string | number): Promise<void> {
        return Promise.resolve(undefined);
    }

}
