import {CatalogHandler} from "../../lib/v4/catalog/CatalogHandler";
import {VueCatalog} from "./FrontentCatalogAdapter";
import {Adminizer} from "../../lib/Adminizer";

export async function catalogController(req: ReqType, res: ResType) {
	const slug = req.params.slug;
	let id = req.params.id ? req.params.id : '';

	const postfix = id ? `${slug}-${id}` : `${slug}`
	if (req.adminizer.config.auth.enable) {
		if (!req.user) {
			return res.redirect(`${req.adminizer.config.routePrefix}/model/userap/login`);
		} else if (!req.adminizer.accessRightsHelper.hasPermission(`catalog-${postfix}`, req.user)) {
			return res.sendStatus(403);
		}
	}

	if (slug === 'navigation' && !id) {
		return res.sendStatus(404)
	}

	const _catalog = CatalogHandler.getCatalog(slug)
	if (_catalog === undefined) return res.sendStatus(404);

	const idList = await _catalog.getIdList();

	if (id) {
		if (idList.length && !idList.includes(id)) {
			Adminizer.log.error(`Catalog with id \`${id}\` not found`)
			return res.sendStatus(404);
		}
	}

	const method = req.method.toUpperCase();
	if (method === 'GET') {
        return  req.Inertia.render({
            component: 'catalog',
            props: null
        })
	}

	if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
		const data = req.body
		const frontendCatalog = new VueCatalog(_catalog);
		if (!frontendCatalog) return res.status(404);

		frontendCatalog.setId(id)
		const item = frontendCatalog.getItemType(data.type)
		switch (method) {
			case 'POST':
				switch (data._method) {
					case 'getAddTemplate':
						return res.json(await frontendCatalog.getAddTemplate(item, req))
					case 'getEditTemplate':
						return res.json(await frontendCatalog.getEditTemplate(item, data.id, req, data.modelId))
					case 'getCatalog':
						{
							const __catalog = await frontendCatalog.getCatalog();
							return res.json({
								items: frontendCatalog.getitemTypes(),
								catalog: {
									nodes: __catalog,
									movingGroupsRootOnly: _catalog.movingGroupsRootOnly ?? false,
									catalogName: _catalog.name,
									catalogId: _catalog.id,
									catalogSlug: _catalog.slug,
									idList: idList
								},
								toolsActions: await frontendCatalog.getActions([], 'tools')
							})
						}
					case 'createItem':
						return res.json({'data': await frontendCatalog.createItem(data.data, req)})
					case 'getChilds':
						return res.json({data: await frontendCatalog.getChilds(data.data, req)})
					case 'getActions':
						return res.json({data: await frontendCatalog.getActions(data.items, data.type)})
					case 'search':
						return res.json({data: await frontendCatalog.search(data.s, req)})
					case "getLocales":
						return res.json({data: frontendCatalog.getLocales(req)})
				}
				break;
			case 'PUT':
				switch (data._method) {
					case 'updateTree':
						return res.json({data: await frontendCatalog.updateTree(data.data, req)})
					case 'getLink':
						return res.json({data: await frontendCatalog.getLink(data.actionId)})
					case 'handleAction':
						return res.json({data: await frontendCatalog.handleAction(data.data.actionID, data.data.items, data.data.config, req)})
					case 'getPopUpHTML':
						return res.json({data: await frontendCatalog.getPopUpTemplate(data.actionId)})
					case 'updateItem':
						return res.json({data: await frontendCatalog.updateItem(item, data.modelId, data.data, req)})
				}
				break
			case 'DELETE':
				return res.json({data: await frontendCatalog.deleteItem(data.data, req)})
		}
	}
}
