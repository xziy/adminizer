import {Entity} from "../interfaces/types";
import {Fields} from "./fieldsHelper";

type Action = {
    title: string;
    link: string;
}

interface listProps {
    actions: {
        link: string;
        id: string;
        title: string;
        icon: string;
    }[],
    thActionsTitle: string,
    crudActions: {
        createTitle: string;
        editTitle: string;
        viewsTitle: string;
    }
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
            viewsTitle: ''
        },
        entity: {
            name: entity.name,
            uri: entity.uri
        }
    } as listProps

    if (entity.config.add && req.adminizer.accessRightsHelper.hasPermission(`create-${entity.name}-model`, req.session.UserAP)) {
        props.crudActions.createTitle = req.i18n.__('create')
    }
    if (req.adminizer.accessRightsHelper.hasPermission(`update-${entity.name}-model`, req.session.UserAP)) {
        props.crudActions.editTitle = req.i18n.__('Edit')
    }
    if (req.adminizer.accessRightsHelper.hasPermission(`read-${entity.name}-model`, req.session.UserAP)) {
        props.crudActions.viewsTitle = req.i18n.__('Views')
    }
    if (req.adminizer.menuHelper.hasGlobalActions(entity.config, actionType)) {
        const actions = req.adminizer.menuHelper.getGlobalActions(entity.config, actionType)
        if (actions && actions.length > 0) {
            actions.forEach(function (action) {
                if (req.adminizer.accessRightsHelper.hasPermission(action.accessRightsToken, req.session.UserAP)) {
                    props.actions.push({
                        link: action.link,
                        id: action.id,
                        title: action.title,
                        icon: action.icon
                    })
                }
            })
        }
    }
    return props
}
