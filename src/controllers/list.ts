import {ControllerHelper} from "../helpers/controllerHelper";
import {DataAccessor} from "../lib/v4/DataAccessor";
import {Column, NodeTable} from "../lib/datatable/NodeTable";
import {Adminizer} from "../lib/Adminizer";
import {NodeOutput} from "../lib/datatable/NodeTable";
import {inertiaListHelper} from "../helpers/inertiaListHelper";
import {Field, Fields} from "../helpers/fieldsHelper";
import {BaseFieldConfig} from "../interfaces/adminpanelConfig";

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
    let start = "0";
    if (req.query.page) {
        if (req.query.page === '1') {
            start = "0";
        } else {
            start = ((+req.query.page - 1) * +req.query.count).toString();
        }
    }
    const count = req.query.count ? req.query.count.toString() : "5"

    const orderColumn = req.query.column ? req.query.column.toString() : "1" // if no column is set, default to first column
    const direction = req.query.direction === "asc" ? 'asc' : "desc"

    const {columns, nodeTreeColumns} = setColumns(fields, orderColumn, direction)

    const mockRequestBody = {
        draw: "1",
        start: start,
        length: count,
        order: [
            {
                column: orderColumn,
                dir: direction
            }
        ],
        columns: [
            {
                data: "0",          // actions column
                searchable: "true",
                orderable: "true",
                search: { value: "", regex: false }
            },
            ...nodeTreeColumns
        ],
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
                columns: columns,
                data: data,
            }
        });
    }, dataAccessor)
    ;
}

function setColumns(fields: Fields, column: string, direction: string){
    let columns: Record<string, object> = {}
    let nodeTreeColumns: Column[] = []
    let i = 1
    for (const key of Object.keys(fields)) {
        let field = fields[key] as Field

        columns[key] = {
            ...field.config as BaseFieldConfig,
            data: String(i),
            direction: String(i) === column ? direction : undefined // set direction if column is selected
        }

        nodeTreeColumns.push({
            data: String(i),
            searchable: 'true',
            orderable: 'true',
            search: { value: "", regex: false }
        })
        i++
    }
    return {
        columns: columns,
        nodeTreeColumns: nodeTreeColumns
    }
}
