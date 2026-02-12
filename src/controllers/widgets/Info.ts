import {InfoBase} from "../../lib/widgets/abstractInfo";

export async function widgetInfoController(req: ReqType, res: ResType) {
	let widgetId = req.params.widgetId;
	if (!widgetId) {
		return res.status(404).send({ error: 'Not Found' });
	}

	if (req.adminizer.config.auth.enable) {
		if (!req.user) {
			return res.redirect(`${req.adminizer.config.routePrefix}/model/userap/login`);
		} else if (!req.adminizer.accessRightsHelper.hasPermission(`widget-${widgetId}`, req.user)) {
			return res.sendStatus(403);
		}
	}

	let widget = req.adminizer.widgetHandler.getById(widgetId) as InfoBase;
	if (widget === undefined) {
		return res.status(404).send({ error: 'Not Found' });
	}

	/** get state */
	if (req.method.toUpperCase() === 'GET') {
		try {
			let text = await widget.getInfo(req);
			return res.send(text)
		} catch (e) {
			return res.status(500).send({ error: e.message || 'Internal Server Error' });
		}
	}
}
