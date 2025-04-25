import {ControllerHelper} from "../helpers/controllerHelper";
import {NodeTable} from "../lib/datatable/NodeTable";
import {DataAccessor} from "../lib/v4/DataAccessor";
import {Adminizer} from "../lib/Adminizer";

export default async function listJson(req: ReqType, res: ResType) {
    try {
        let entity = ControllerHelper.findEntityObject(req);
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

        let dataAccessor = new DataAccessor(req, entity, "list");
        let fields = dataAccessor.getFieldsConfig();
        const nodeTable = new NodeTable(req.body, entity.model, fields);

        // @ts-ignore
        await nodeTable.output((err: Error, data: []) => {
            if (err) {
                Adminizer.log.error(err);
            }

            // Directly send this data as output to Datatable
            return res.send(data)
        }, dataAccessor)
    } catch (error) {
        Adminizer.log.error(error)
    }
};
