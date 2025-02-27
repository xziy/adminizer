import { AbstractCatalog, ActionHandler } from "../../dist/lib/catalog/AbstractCatalog";
import {catalogController} from "../../dist/controllers/catalog/Catalog";
import {GroupWithLink} from "./GroupWithLink";
import {GroupNative} from "./GroupNative";
import {PageItem} from "./Page";
import {Update} from "./Actions/Group/Update";

const util = require('util')
import CatalogGroupNav from "../api/models/CatalogGroupNav";
import CatalogPageNav from "../api/models/CatalogPageNav";
import {Item} from "../../src/lib/catalog/AbstractCatalog";

interface NodeData extends Item {
}

class NavigationCatalog extends AbstractCatalog {
    readonly actionHandlers: ActionHandler[] = [];
    readonly icon: string;
    readonly name: string = 'navigation';
    readonly secondPanel: AbstractCatalog | null;
    readonly slug: string = 'navigation';
    readonly maxNestingDepth: number | null = 3;

    constructor() {
        super([
            // new GroupNative(),
            new GroupWithLink(),
            new PageItem()
        ]);
        this.addActionHandler(new Update())
    }


    async getCatalog(): Promise<{ nodes: NodeData<any>[] }> {
        let groupsDB = await CatalogGroupNav.find({
            label: this.id,
            level: 1 //@ts-ignore
        }).populate('groups').sort('catalogOrder ASC')

        let pagesDB = await CatalogPageNav.find({
            label: this.id,
            level: 1 //@ts-ignore
        }).populate('pages').sort('catalogOrder ASC')

        let res: NodeModel<any>[] = []
        for (const groupDB of groupsDB) {
            res.push({
                children: [],
                data: {
                    ...groupDB.groups.data,
                    id: groupDB.groups.id,
                    type: groupDB.type,
                    parent: groupDB.parentID
                },
                isLeaf: false,
                isExpanded: false,
                ind: groupDB.catalogOrder,
                title: groupDB.groups.title,
                level: groupDB.level
            })
        }

        for (const pageDB of pagesDB) {
            res.push({
                data: {
                    slug: pageDB.pages.slug,
                    id: pageDB.pages.id,
                    type: pageDB.type,
                    parent: pageDB.parentID
                },
                isLeaf: true,
                isExpanded: false,
                ind: pageDB.catalogOrder,
                title: pageDB.pages.title,
                level: pageDB.level
            })
        }

        return {nodes: res}
    }

    /**
     *
     * @param reqNode
     */
    async removeChildsDB(reqNode: NodeModel<any>): Promise<void> {
        let parent = (await CatalogGroupNav.find({
            where: {label: this.id, groups: reqNode.data.parent}
        }))[0]

        let newChilds = parent.childs.filter((e: string) => e !== reqNode.data.id)
        console.log('newChilds: ', newChilds)
        console.log('reqNode: ', reqNode)
        await CatalogGroupNav.update({
            where: {label: this.id, groups: reqNode.data.parent}
        }).set({
            childs: newChilds
        })
    }

    /**
     *
     * @param reqParent
     */
    async setChildsDB(reqParent: any): Promise<void> {
        let childs = []
        for (const child of reqParent.children) {
            let type = child.data.type
            let criteria = {}

            if (type === 'group_2' || type === 'group_1') {
                await CatalogGroupNav.update({label: this.id, groups: child.data.id}, {
                    level: child.level,
                    catalogOrder: child.ind,
                    parentID: reqParent.data.id
                })
            }
            if (type === 'page') {
                await CatalogPageNav.update({label: this.id, pages: child.data.id}, {
                    level: child.level,
                    catalogOrder: child.ind,
                    parentID: reqParent.data.id
                })
            }

            if (reqParent.data.id) childs.push(child.data.id)

        }
        if (reqParent.data.id) {
            await CatalogGroupNav.update({label: this.id, groups: reqParent.data.id}, {
                childs: childs
            })
        }
    }

    /**
     *
     * @param data
     */
    async setSortOrder(data: { reqNode: NodeModel<any>, reqParent: any }): Promise<any> {
        // console.log('data: ', data)
        try {
            await this.setChildsDB(data.reqParent)
            if (data.reqNode.children.length > 0) {
                for (const child of data.reqNode.children) {
                    await this.setLevel(child)
                }
            }
            if (data.reqNode.data.parent) {
                let newNode;
                if (data.reqNode.data.type === 'group_2' || data.reqNode.data.type === 'group_1') {
                    newNode = (await CatalogGroupNav.find({label: this.id, groups: data.reqNode.data.id}))[0]
                }
                if (data.reqNode.data.type === 'page') {
                    newNode = (await CatalogPageNav.find({label: this.id, pages: data.reqNode.data.id}))[0]
                }
                if (newNode.parentID !== data.reqNode.data.parent) {
                    await this.removeChildsDB(data.reqNode)
                }
            }
            return Promise.resolve({ok: true})
        } catch (e) {
            return e
        }
    }

    async setLevel(child: NodeModel<any>) {
        if (child.data.type === 'group_2' || child.data.type === 'group_1') {
            await CatalogGroupNav.update({label: this.id, groups: child.data.id}).set({
                level: child.level
            })
        }
        if (child.data.type === 'page') {
            await CatalogPageNav.update({label: this.id, pages: child.data.id}).set({
                level: child.level
            })
        }
    }

    async getChilds(data: any): Promise<{ nodes: NodeModel<any>[] }> {
        let res: NodeModel<any>[] = []
        let groupsDB = (await CatalogGroupNav.find({label: this.id, groups: data.data.id}))[0]
        for (const child of groupsDB.childs) {
            let childDBGroup = await CatalogGroupNav.find({label: this.id, groups: child}).populate('groups')
            let childDBPage = await CatalogPageNav.find({label: this.id, pages: child}).populate('pages')
            if (childDBGroup.length > 0) {
                res.push({
                    children: [],
                    data: {
                        ...childDBGroup[0].groups.data,
                        id: childDBGroup[0].groups.id,
                        type: childDBGroup[0].type,
                        parent: childDBGroup[0].parentID
                    },
                    isLeaf: false,
                    isExpanded: false,
                    ind: childDBGroup[0].catalogOrder,
                    title: childDBGroup[0].groups.title,
                    level: childDBGroup[0].level
                })
            }
            if (childDBPage.length > 0) {
                res.push({
                    children: [],
                    data: {
                        id: childDBPage[0].pages.id,
                        type: childDBPage[0].type,
                        parent: childDBPage[0].parentID,
                        slug: childDBPage[0].pages.slug
                    },
                    isLeaf: true,
                    isExpanded: false,
                    ind: childDBPage[0].catalogOrder,
                    title: childDBPage[0].pages.title,
                    level: childDBPage[0].level
                })
            }

        }
        // console.log(res)
        return {nodes: res}
    }

    async search(s: string): Promise<{ nodes: NodeModel<any>[] }> {
        let res: NodeModel<any>[] = []
        let items;
        let groupsDB = await GroupCatalog.find({where: {title: {contains: s}}}).populate('navigation')
        if (groupsDB.length > 0) {
            items = groupsDB
        } else {
            items = await Page.find({where: {title: {contains: s}}}).populate('navigation')
        }
        for (const item of items) {
            for (const navigationElement of item.navigation) {
                if (navigationElement.children?.length) {
                    //
                } else if (navigationElement.parentID) {
                    let parents = await this.getRecursiveParent(navigationElement.parentID, [])
                    let result = await this.getRecurciveChilds(parents, item, 0, [])
                    console.log(util.inspect(result, {showHidden: false, depth: null, colors: true}))
                    return
                } else {
                    if (navigationElement.type === 'group_1' || navigationElement.type === 'group_2') {
                        res.push({
                            children: [],
                            data: {
                                ...item.data,
                                id: item.id,
                                type: navigationElement.type,
                                parent: navigationElement.parentID,
                                search: true
                            },
                            isLeaf: false,
                            isExpanded: true,
                            ind: navigationElement.catalogOrder,
                            title: item.title,
                            level: navigationElement.level
                        })
                    } else {
                        res.push({
                            children: [],
                            data: {
                                id: item.id,
                                type: navigationElement.type,
                                parent: navigationElement.parentID,
                                slug: item.slug,
                                search: true
                            },
                            isLeaf: true,
                            isExpanded: false,
                            ind: navigationElement.catalogOrder,
                            title: item.title,
                            level: navigationElement.level
                        })
                    }
                }
            }
        }
        return {nodes: res}
    }

    async getRecurciveChilds(parents: string[], foundNode: CatalogGroupNav | CatalogPageNav, level: number, initRes: NodeModel<any>[]) {
        let res = initRes
        let group = (await CatalogGroupNav.find({label: this.id, groups: parents[level]}).populate('groups'))[0]
        if (level === 0) {
            res.push({
                children: [],
                data: {
                    ...group.groups.data,
                    id: group.groups.id,
                    type: group.type,
                    parent: group.parentID
                },
                isLeaf: false,
                isExpanded: true,
                ind: group.catalogOrder,
                title: group.groups.title,
                level: group.level
            })
            let children = await this.getChilds({data: {id: parents[0]}})
            res[0].children = children.nodes
        } else {
            let children = await this.getChilds({data: {id: group.parentID}})
            // Здесь должен быть какой-то рекурсивный поиск потомков
            res[0].children.find(e => e.data.id === parents[level]).children = children.nodes
        }

        if (level < parents.length - 1) {
            return await this.getRecurciveChilds(parents, foundNode, level + 1, res)
        }
        return res
    }


    async getRecursiveParent(id: string, initItems: string[]): Promise<string[]> {
        let group: CatalogGroupNav = (await CatalogGroupNav.find({label: this.id, groups: id}).populate('groups'))[0]
        let items: string[] = initItems
        if (initItems.length === 0) {
            items.push(id)
        }
        if (group.parentID) {
            items = [...items, group.parentID]
            return await this.getRecursiveParent(group.parentID, items)
        }
        return items.reverse();
    }
}


const setCatalogs = () => {
    let catalog = new NavigationCatalog()

    CatalogHandler.add(catalog)
}

module.exports = {setCatalogs}
