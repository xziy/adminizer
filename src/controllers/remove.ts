import {ControllerHelper} from "../helpers/controllerHelper";
import {deleteRelationsMediaManager} from "../lib/media-manager/helpers/MediaManagerHelper";
import {ModelAnyField, ModelAnyInstance} from "../lib/v4/model/AbstractModel";
import {DataAccessor} from "../lib/v4/DataAccessor";
import {Adminizer} from "../lib/Adminizer";

export default async function remove(req: ReqType, res: ResType) {
  // Checking id of the record
  if (!req.params.id) {
    Adminizer.log.error(new Error('Admin panel: No id for record provided'));
    return res.status(404).send({error: 'Not Found'});
  }

  let entity = ControllerHelper.findEntityObject(req);
  if (!entity.model) {
    Adminizer.log.error(new Error('Admin panel: no model found'));
    return res.status(404).send({error: 'Not Found'});
  }

  if (!entity.config.remove) {
    return res.redirect(`${req.adminizer.config.routePrefix}/${entity.uri}`);
  }

  if (req.adminizer.config.auth) {
    if (!req.session.UserAP) {
      return res.redirect(`${req.adminizer.config.routePrefix}/model/userap/login`);
    } else if (!req.adminizer.accessRightsHelper.hasPermission(`delete-${entity.name}-model`, req.session.UserAP)) {
      return res.sendStatus(403);
    }
  }

  /**
   * Searching for record by model
   */
  let record: ModelAnyInstance;
  let dataAccessor;
  try {
    dataAccessor = new DataAccessor(req, entity, "remove");
    record = await entity.model.findOne({id: req.params.id}, dataAccessor) as ModelAnyInstance;
  } catch (e) {
    if (req.accepts('json')) {
      return res.json({
        success: false,
        message: e.message
      });
    }
    return res.status(500).send({error: e.message || 'Internal Server Error'});
  }

  if (!record) {
    let msg = 'Admin panel: No record found with id: ' + req.params.id;
    if (req.accepts('json')) {
      return res.json({
        success: false,
        message: msg
      });
    }
    return res.status(404).send({error: 'Not Found'});
  }
  // adminizer.log.debug('admin > remove > record > ', record);

  let destroyedRecord;
  try {
    const fieldId = entity.config.identifierField ?? req.adminizer.config.identifierField;
    const q: Record<string, ModelAnyField> = {}
    q[fieldId] = record[fieldId]
    destroyedRecord = await entity.model.destroy(q, dataAccessor)

    // delete relations media manager
    await deleteRelationsMediaManager(req.adminizer, entity.name, destroyedRecord)
  } catch (e) {
    Adminizer.log.error('adminpanel > error', e);
  }

  if (destroyedRecord) {
    req.session.messages.adminSuccess.push('Record was removed successfully');
  } else {
    req.session.messages.adminError.push('Record was not removed');
  }

  res.redirect(`${req.adminizer.config.routePrefix}/${entity.uri}`);
};
