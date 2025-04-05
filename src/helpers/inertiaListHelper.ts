import {Entity} from "../interfaces/types";
import {Fields} from "./fieldsHelper";
import inertiaActionsHelper, {Actions} from "./inertiaActionsHelper";

interface listProps extends Record<string | number | symbol, unknown>{
    actions: Actions[],
    thActionsTitle: string,
    crudActions: {
        createTitle: string;
        editTitle: string;
        viewsTitle: string;
        deleteTitle: string
    },
    delModal: {
        yes: string,
        no: string
        text: string
    },
    notFoundContent: string,
    entity: {
        name: string;
        uri: string
    }
}

export function inertiaListHelper(entity: Entity, req: ReqType, fields: Fields) {
    const actionType = 'list';
    let props = {
        thActionsTitle: req.i18n.__('Actions'),
        actions: [],
        crudActions: {
            createTitle: '',
            editTitle: '',
            viewsTitle: '',
            deleteTitle: ''
        },
        entity: {
            name: entity.name,
            uri: entity.uri
        },
        delModal: {
            yes: req.i18n.__('Yes'),
            no: req.i18n.__('No'),
            text: req.i18n.__('Are you sure?')
        },
        notFoundContent: req.i18n.__('No records found !')
    } as listProps

    if (entity.config.add && req.adminizer.accessRightsHelper.hasPermission(`create-${entity.name}-model`, req.session.UserAP)) {
        props.crudActions.createTitle = req.i18n.__('create')
    }
    if (req.adminizer.accessRightsHelper.hasPermission(`update-${entity.name}-model`, req.session.UserAP)) {
        props.crudActions.editTitle = req.i18n.__('Edit')
    }
    if (req.adminizer.accessRightsHelper.hasPermission(`read-${entity.name}-model`, req.session.UserAP)) {
        props.crudActions.viewsTitle = req.i18n.__('View')
    }
    if (req.adminizer.accessRightsHelper.hasPermission(`delete-${entity.name}-model`, req.session.UserAP)) {
        props.crudActions.deleteTitle = req.i18n.__('Delete')
    }

    props.actions = inertiaActionsHelper(actionType, entity, req)

    return props
}
