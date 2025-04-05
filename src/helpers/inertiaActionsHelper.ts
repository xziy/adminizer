import {Entity} from "../interfaces/types";
import {ActionType} from "../interfaces/adminpanelConfig";

export interface Actions {
    link: string;
    id: string;
    title: string;
    icon: string;
}

export default  function inertiaActionsHelper(actionType: ActionType, entity: Entity, req: ReqType) {
    let resActions: Actions[] = []
    if (req.adminizer.menuHelper.hasGlobalActions(entity.config, actionType)) {
        const actions = req.adminizer.menuHelper.getGlobalActions(entity.config, actionType)
        if (actions && actions.length > 0) {
            actions.forEach(function (action) {
                if (req.adminizer.accessRightsHelper.hasPermission(action.accessRightsToken, req.session.UserAP)) {
                    resActions.push({
                        link: action.link,
                        id: action.id,
                        title: action.title,
                        icon: action.icon
                    })
                }
            })
        }
    }
    return resActions
}
