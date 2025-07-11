import { MediaManagerHandler } from "../../lib/media-manager/MediaManagerHandler";
import { MediaManagerAdapter } from "./mediaManagerAdapter";

export async function mediaManagerController(req: ReqType, res: ResType) {
	const method = req.method.toUpperCase();
	let id = req.params.id ? req.params.id : '';

	if (req.adminizer.config.auth.enable) {
		if (!req.user) {
			return res.redirect(`${req.adminizer.config.routePrefix}/model/userap/login`);
		} else if (!req.adminizer.accessRightsHelper.hasPermission(`catalog-${id}`, req.user)) {
			return res.sendStatus(403);
		}
	}

	if (!id) {
		return res.sendStatus(404)
	}
	const _manager = MediaManagerHandler.get(id)
	const manager = new MediaManagerAdapter(_manager)
	if (method === 'GET') {
		const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
		await delay(500);
		return await manager.get(req, res)
	}

	if (method === 'POST') {
		if (req.path.endsWith('/upload')) {
			return await manager.upload(req, res);
		}
		// switch (req.body._method) {
		// 	case 'addMeta':
		// 		return await manager.setMeta(req, res)
		// 	case 'getMeta':
		// 		return await manager.getMeta(req, res)
		// 	case 'variant':
		// 		return await manager.uploadVariant(req, res)
		// 	case 'getChildren':
		// 		return await manager.getVariants(req, res)
		// 	case 'search':
		// 		return await manager.search(req, res)
		// }
	}
	if (method === 'DELETE') {
		return await manager.delete(req, res)
	}
}
