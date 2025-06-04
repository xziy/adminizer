import { AbstractCatalog, Item } from "../../lib/v4/catalog/AbstractCatalog";


interface NodeModel<TDataType> {
	text: string;
	droppable: boolean;
	// isExpanded: boolean;
	id: string;
	parent: string;
	data?: TDataType;
	children?: NodeModel<TDataType>[];

	isSelected?: boolean;
	isVisible?: boolean;
	isDraggable?: boolean;
	isSelectable?: boolean;
	path?: number[];
	pathStr?: string;
	level?: number;
	isFirstChild?: boolean;
	isLastChild?: boolean;
}

interface NodeData extends Item {
}

interface obj {
	[key: string]: string;
}

interface RequestData {
	reqNode: NodeModel<NodeData>[];
	reqParent: NodeModel<NodeData>;
	_method: string;
}

/**
 * @deprecated Now is React
 * // TODO: refactor for react name
 */
export class VueCatalog {
	catalog: AbstractCatalog;

	constructor(_catalog: AbstractCatalog) {
		this.catalog = _catalog;
	}

	setId(id: string) {
		this.catalog.setId(id);
	}

	getItemType(type: string) {
		return this.catalog.getItemType(type);
	}

	/**
	 * @deprecated reason: migration for intertia
	 * // TODO: need passing custom React module
	 */

	getAddHTML(item: any, req: ReqType) {
		return this.catalog.getAddHTML(item, req);
	}

	/**
	 * @deprecated reason: migration for intertia
	 * TODO need passing custom React module
	 */
	getEditHTML(item: any, id: string | number, req: ReqType, modelId: string | number) {
		return this.catalog.getEditHTML(item, id, req, modelId)
	}

	getitemTypes() {
		return this.catalog.getitemTypes();
	}

	getLocales(req: ReqType) {

		let obj: obj = {
			"Delete": "",
			"Edit": "",
			"create": "",
			"Search": "",
			"Select Item type": "",
			"Select Items": "",
			"Save": "",
			"No, cancel": "",
			"Are you sure?": "",
			"Yes, I'm sure": "",
			"Select Ids": "",
			"OR": "",
			"Open in a new window": ""
		}
		obj[this.catalog.name] = ""
		for (const actionHandler of this.catalog.actionHandlers) {
			obj[actionHandler.name] = ""
		}

		let messages = obj

		let outMessages: obj = {}
		for (const mess of Object.keys(messages)) {
			outMessages[mess] = req.i18n.__(mess)
		}
		return {
			...outMessages,
		}
	}

	async getActions(items: NodeModel<any>[], type: string) {
		let arrItems = []
		for (const item of items) {
			arrItems.push(await this.catalog.find(item.data))
		}
		if (type === 'tools') {
			return (await this.catalog.getActions(arrItems))?.filter(e => e.displayTool);
		} else {
			return (await this.catalog.getActions(arrItems))?.filter(e => e.displayContext);
		}
	}

	async handleAction(actionId: string, items: any[], config: any, req: ReqType) {
		let arrItems = []
		for (const item of items) {
			arrItems.push(await this.catalog.find(item.data))
		}
		return this.catalog.handleAction(actionId, arrItems, config, req);
	}

	/**
	 * @deprecated reason: migration for intertia
	 * // TODO: need passing custom React module
	 */
	async getPopUpHTML(actionId: string) {
		return this.catalog.getPopUpHTML(actionId);
	}

	async getLink(actionId: string) {
		return this.catalog.getLink(actionId);
	}

	//Below are the methods that require action

	async getCatalog() {
		let rootItems = await this.catalog.getChilds(0);
		return VueCatalogUtils.arrayToNode(rootItems, this.catalog.getGroupType().type);
	}

	async createItem(data: any, req: ReqType) {
		//data = VueCatalogUtils.refinement(data);
		if (this.catalog.slug !== "navigation") {
			let item = data.record;
			item.parenId = data.parenId;
			return await this.catalog.createItem(item, req);
		} else {
			return await this.catalog.createItem(data, req);
		}
	}

	async getChilds(data: any, req: ReqType) {
		data = VueCatalogUtils.refinement(data);
		return VueCatalogUtils.arrayToNode(await this.catalog.getChilds(data.id, undefined, req), this.catalog.getGroupType().type);
	}

	// Moved into actions
	// getCreatedItems(data: any) {
	//   data = VueCatalogUtils.refinement(data);
	//   return this.catalog.getChilds(data.id);
	// }

	async search(s: string, req: ReqType) {
		let searchResult = await this.catalog.search(s, undefined, req);
		let itemsTree = AbstractCatalog.buildTree(searchResult);
		return VueCatalogUtils.treeToNode(itemsTree, this.catalog.getGroupType().type);
	}

	async updateTree(data: RequestData, req: ReqType): Promise<any> {
		// console.dir(data, {depth: null})
		// return
		let reqNodes = data.reqNode;
		let reqParent = data.reqParent;
		// if (!Array.isArray(data.reqNode)) {
		// 	reqNodes = [data.reqNode];
		// }
		//
		// let reqParent = data.reqParent ?? {
		// 	children: VueCatalogUtils.arrayToNode(await this.catalog.getChilds(0), ''),
		// 	data: {id: 0}
		// };
		// console.log(reqParent)
		// return
		// if (reqParent.data.id === 0) {
		// 	reqParent.data.id = null;
		// }
		//
		// if (reqParent.data.id === undefined) {
		// 	throw `reqParent.data.id not defined`
		// }

		// It’s unclear why he’s coming reqNodes
		// for (const reqNode of reqNodes) {
		//
		// 	const item = await this.catalog.find(reqNode.data, req);
		// 	if (!item) {
		// 		throw `reqNode Item not found`
		// 	}
		// }

		// Update all items into parent (for two reason: update parent, updare sorting order)
		let sortCount = 0;
		for (const childNode of reqParent.children) {
			// console.log(childNode)
			// return
			childNode.data.sortOrder = sortCount;
			childNode.data.parentId = reqParent.data.id
			await this.catalog.updateItem(childNode.data.id, childNode.data.type, childNode.data, req);
			sortCount++;
		}
		return Promise.resolve('ok')
	}


	async updateItem(item: any, modelId: string, data: any, req: ReqType) {
		//data = VueCatalogUtils.refinement(data);
		if (this.catalog.slug !== "navigation") {
			return await this.catalog.updateModelItems(data.modelId, data.type, data.record, req);
		} else {
			return await this.catalog.updateModelItems(modelId, item.type, data, req);
		}
	}
	async deleteItem(items: NodeModel<any>[], req: ReqType) {
		for (const item1 of items) {
			if (item1.children?.length) {
				await this.deleteItem(item1.children, req)
			}
			await this.catalog.deleteItem(item1.data.type, item1.data.id, req)
		}
		return { ok: true }
	}
}

export class VueCatalogUtils {
	/**
	 * Removes unnecessary data from the front
	 */
	public static refinement<T extends NodeModel<any>>(nodeModel: T) {
		return nodeModel.data;
	}

	public static arrayToNode<T extends Item>(items: T[], groupTypeName: string): NodeModel<T>[] {
		return items.map(node => VueCatalogUtils.toNode(node, groupTypeName));
	}

	public static toNode<T extends NodeData>(data: T, groupTypeName: string): NodeModel<T> {
		return {
			data: data,
			droppable: data.type === groupTypeName,
			id: data.id as string,
			text: data.name,
			parent: data.parentId as string,
		};
	}

	public static expandTo<T extends NodeData>(vueCatalogData: NodeModel<T>, theseItemIdsNeedToBeOpened: (string | number)[]): NodeModel<T> {
		function expand(node: NodeModel<T>): void {
			if (theseItemIdsNeedToBeOpened.includes(node.data.id)) {
				// node.isExpanded = true;
			}

			if (node.children) {
				for (const child of node.children) {
					expand(child);
				}
			}
		}

		theseItemIdsNeedToBeOpened.forEach(id => {
			expand(vueCatalogData);
		});

		return vueCatalogData;
	}

	public static treeToNode(tree: Item[], groupTypeName: string): NodeModel<Item>[] {
		function buildNodes(items: Item[]): NodeModel<Item>[] {
			return items.map(item => {
				const node = VueCatalogUtils.toNode(item, groupTypeName);
				if (item.childs && item.childs.length > 0) {
					// Sort the children before building their nodes
					item.childs.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
					node.children = buildNodes(item.childs);
					// node.isExpanded = !node.droppable;
				}
				return node;
			});
		}

		return buildNodes(tree);
	}
}

