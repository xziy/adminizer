import {Entity} from "../interfaces/types";
import {Fields} from "./fieldsHelper";

interface listProps {
    create: {
        title: string;
        link: string;
    },
    actions: {
        link: string;
        id: string;
        title: string;
        icon: string;
    }[]
}

export function inertiaListHelper(entity: Entity, req: ReqType, fields: Fields) {
    const actionType = 'list';
    let props = {
        create: {},
        actions: []
    } as listProps

    if (entity.config.add && req.adminizer.accessRightsHelper.hasPermission(`create-${entity.name}-model`, req.session.UserAP)) {
        props.create = {
            title: req.i18n.__('create'),
            link: `${entity.uri}/add`
        }
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
