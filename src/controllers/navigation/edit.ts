import {ControllerHelper} from "../../helpers/controllerHelper";
import {DataAccessor} from "../../lib/v4/DataAccessor";

export default async function edit(req: ReqType, res: ResType) {
	if (req.adminizer.config.auth.enable) {
		if (!req.user) {
			return res.redirect(`${req.adminizer.config.routePrefix}/model/userap/login`);
		}
	}

	let entity = ControllerHelper.findEntityObject(req);
	let dataAccessor = new DataAccessor(req.adminizer, req.user, entity, "edit");
	let record: any = await entity.model.findOne({id: req.params.id}, dataAccessor);
	return res.redirect(`${req.adminizer.config.routePrefix}/catalog/navigation/${record.label}`)
}
