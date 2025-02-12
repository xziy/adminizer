import { ControllerHelper } from "../helpers/controllerHelper";
import {DataAccessor} from "../lib/v4/DataAccessor";

export default async function list(req: ReqType, res: ResType) {
  let entity = ControllerHelper.findEntityObject(req);
  if (!entity.model) {
    return res.status(404).send({ error: 'Not Found' });
  }

  if (req.adminizer.config.auth) {
    if (!req.session.UserAP) {
      return res.redirect(`${req.adminizer.config.routePrefix}/model/userap/login`);
    } else if (!req.adminizer.accessRightsHelper.hasPermission(`read-${entity.name}-model`, req.session.UserAP)) {
      return res.sendStatus(403);
    }
  }

  let dataAccessor = new DataAccessor(req, entity, "list");
  let fields = dataAccessor.getFieldsConfig();

  res.viewAdmin(null,{
    entity: entity,
    fields: fields,
  });
}
