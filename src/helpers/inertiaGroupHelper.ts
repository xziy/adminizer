import {AccessRightsToken, Entity} from "../interfaces/types";

interface Field {
    label: string;
    type: string;
    name: string;
    tooltip?: string;
    value: string | boolean | Record<string, string>[];
}

interface groupedTokens {
    header: string,
    fields: Field[]
}

interface listProps extends Record<string | number | symbol, unknown>{
    edit: boolean;
    view: boolean;
    btnBack: {
        title: string;
        link: string;
    },
    btnSave: {
        title: string;
    },
    postLink: string,
    head: string,
    userHead: string,
    fields: Field[],
    users: Field[]
    groupedTokens: groupedTokens[]
}

export function inertiaGroupHelper(
    entity: Entity, req: ReqType, users: ModelsAP["UserAP"][],
    groupedTokens: {
        [key: string]: AccessRightsToken[]
    },
    group?: ModelsAP["GroupAP"], view: boolean = false) {
    let props: listProps = {
        edit: !!group,
        view: view,
        btnBack: {
            title: req.i18n.__('Back'),
            link: entity.uri
        },
        btnSave: {
            title: req.i18n.__('Save')
        },
        postLink: group ? `${entity.uri}/edit/${group.id}` : `${entity.uri}/add`,
        head: req.i18n.__('Group settings'),
        userHead: '',
        fields: [
            {
                label: req.i18n.__('Group name'),
                type: 'text',
                name: 'name',
                value: group?.name ?? ''
            },
            {
                label: req.i18n.__('Group description'),
                type: 'text',
                name: 'description',
                value: group?.description ?? ''
            },
        ],
        users: [],
        groupedTokens: []
    }
    if (users?.length) {
        props.userHead = req.i18n.__('Members')
        for (const user of users) {
            let userGroupsIds: number[] = []
            if (user.groups && user.groups.length) {
                userGroupsIds = user.groups.map((group) => {
                    return group.id
                })
            }
            props.users.push({
                label: user.fullName,
                type: 'checkbox',
                name: `user-checkbox-${user.id}`,
                value: group ? userGroupsIds.includes(group.id) : false
            })
        }
    }
    if (Object.keys(groupedTokens).length) {
        for (let [department, tokens] of Object.entries(groupedTokens)) {
            let header = department
            let fields: Field[] = []
            for (let token of tokens) {
                fields.push({
                    label: token.name,
                    tooltip: token.description,
                    name: `token-checkbox-${token.id}`,
                    value: group ? (group.tokens && group.tokens.includes(token.id)) : false,
                    type: 'checkbox'
                })
            }
            props.groupedTokens.push({
                header: header,
                fields: fields
            })
        }
    }
    return props
}
