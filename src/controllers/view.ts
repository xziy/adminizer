import {ControllerHelper} from "../helpers/controllerHelper";
import {DataAccessor} from "../lib/v4/DataAccessor";
import {Adminizer} from "../lib/Adminizer";

export default async function view(req: ReqType, res: ResType) {
  // Check id
  if (!req.params.id) {
    return res.status(404).send({error: 'Not Found'});
  }

  let entity = ControllerHelper.findEntityObject(req);
  if (!entity.config.view) {
    return res.redirect(`${req.adminizer.config.routePrefix}/${entity.uri}`);
  }

  if (!entity.model) {
    return res.status(404).send({error: 'Not Found'});
  }

  if (req.adminizer.config.auth) {
    if (!req.session.UserAP) {
      return res.redirect(`${req.adminizer.config.routePrefix}/model/userap/login`);
    } else if (!req.adminizer.accessRightsHelper.hasPermission(`read-${entity.name}-model`, req.session.UserAP)) {
      return res.sendStatus(403);
    }
  }

  let dataAccessor = new DataAccessor(req, entity, "view");
  let fields = dataAccessor.getFieldsConfig();

  let record;
  try {
    record = await entity.model.findOne({id: req.params.id}, dataAccessor);
  } catch (e) {
    Adminizer.log.error('Admin edit error: ');
    Adminizer.log.error(e);
    return res.status(500).send({error: 'Internal Server Error'});
  }

  res.viewAdmin(null, {
    entity: entity,
    record: record,
    fields: fields
  });
};
