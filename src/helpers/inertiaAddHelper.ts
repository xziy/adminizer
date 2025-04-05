import {Entity} from "../interfaces/types";
import inertiaActionsHelper, {Actions} from "./inertiaActionsHelper";

interface listProps extends Record<string | number | symbol, unknown>{
    actions: Actions[],
    btnBack: {
        title: string;
        link: string;
    },
}

export default function inertiaAddHelper(req: ReqType, entity: Entity) {
    const actionType = 'add';
    let props: listProps = {
        actions: [],
        btnBack: {
            title: req.i18n.__('Back'),
            link: entity.uri
        },
    }
    props.actions = inertiaActionsHelper(actionType, entity, req)

    return props
}
