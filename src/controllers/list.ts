import {ControllerHelper} from "../helpers/controllerHelper";
import {DataAccessor} from "../lib/v4/DataAccessor";
import {NodeTable} from "../lib/datatable/NodeTable";
import {Adminizer} from "../lib/Adminizer";
import {NodeOutput} from "../lib/datatable/NodeTable";
import {inertiaListHelper} from "../helpers/inertiaListHelper";

export default async function list(req: ReqType, res: ResType) {
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

    const header = inertiaListHelper(entity, req, fields)

    const mockRequestBody = {
        draw: "1",
        start: "0",
        length: "10",
        // @ts-ignore
        order: [],
        // @ts-ignore
        columns: [],
        search: {value: "", regex: false}
    };

    const nodeTable = new NodeTable(mockRequestBody, entity.model, fields);

    await nodeTable.output((err: Error, data: NodeOutput) => {
        if (err) {
            Adminizer.log.error(err);
        }
        return req.Inertia.render({
            component: 'list',
            props: {
                header: header,
                columns: fields,
                data: data,
            }
        });
    }, dataAccessor)

    // res.viewAdmin(null,{
    //   entity: entity,
    //   fields: fields,
    // });
}
