import {Entity} from "../interfaces/types";
import {Fields} from "./fieldsHelper";
import inertiaActionsHelper, {Actions} from "./inertiaActionsHelper";

interface listProps extends Record<string | number | symbol, unknown> {
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
    searchBtn: string,
    resetBtn: string,
    entity: {
        name: string;
        uri: string
    },
    inlineActions: Actions[]
}

export function inertiaListHelper(entity: Entity, req: ReqType, fields: Fields) {
    const actionType = 'list';
    let props = {
        thActionsTitle: req.i18n.__('Actions'),
        actions: [],
        inlineActions: [],
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
        notFoundContent: req.i18n.__('No records found !'),
        searchBtn: req.i18n.__('Search'),
        resetBtn: req.i18n.__('Reset'),
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

    if (req.adminizer.menuHelper.hasInlineActions(entity.config, 'list')) {
        for (const inlineAction of req.adminizer.menuHelper.getInlineActions(entity.config, 'list')) {
            if (req.adminizer.accessRightsHelper.hasPermission(inlineAction.accessRightsToken, req.session.UserAP)) {
                props.inlineActions.push({
                    icon: inlineAction.icon,
                    id: inlineAction.id,
                    type: inlineAction.type,
                    link: inlineAction.link,
                    title: req.i18n.__(inlineAction.title),
                })
            }
        }
    }

    return props
}
