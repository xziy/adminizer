import {Entity} from "../interfaces/types";

interface Field {
    label: string;
    type: string;
    name: string;
    tooltip?: string;
    value: string | boolean | Record<string, string>[];
}

interface listProps{
    back: {
        title: string;
        link: string;
    },
    postLink: string,
    head: string,
    groupHead: string,
    fields: Field[]
    groups: Field[]
}

export function inertiaUserHelper(entity: Entity, req: ReqType, groups: ModelsAP["GroupAP"][]) {
    let props: listProps = {
        back: {
            title: req.i18n.__('Back'),
            link: entity.uri
        },
        postLink: `${entity.uri}/add`,
        head: req.i18n.__('User settings'),
        groupHead: req.i18n.__('User groups'),
        fields: [
            {
                label: req.i18n.__('Login'),
                type: 'text',
                name: 'login',
                value: ''
            },
            {
                label: req.i18n.__('Full name'),
                type: 'text',
                name: 'fullName',
                value: ''
            },
            {
                label: req.i18n.__('E-mail'),
                type: 'email',
                name: 'email',
                value: ''
            },
            {
                label: req.i18n.__('Timezone'),
                type: 'select',
                name: 'timezone',
                value: ''
            },
            {
                label: req.i18n.__('Profile expires'),
                type: 'date',
                name: 'date',
                value: ''
            },
        ],
        groups: []
    }
    if (req.adminizer.config.translation) {
        props.fields.push({
            label: req.i18n.__('Locale'),
            type: 'select',
            name: 'locale',
            value: ''
        })
    }
    if (req.session.UserAP.isAdministrator) {
        props.fields.push({
            label: req.i18n.__('Is Administrator'),
            type: 'checkbox',
            name: 'isAdmin',
            value: false
        })
        props.fields.push({
            label: req.i18n.__('Is confirmed'),
            type: 'checkbox',
            name: 'isConfirmed',
            value: false
        })
    }
    props.fields.push({
        label: req.i18n.__('Password'),
        type: 'password',
        name: 'userPassword',
        tooltip: req.i18n.__('Leave this field empty if you don&apos;t want to change the password'),
        value: ''
    })
    props.fields.push({
        label: req.i18n.__('Repeat password'),
        type: 'password',
        name: 'repeatUserPassword',
        value: ''
    })
    if (!req.session.UserAP.isAdministrator && groups.length) {
        for (let group of groups) {
            props.groups.push({
                label: group.name,
                type: 'checkbox',
                name: `group-checkbox-${group.id}`,
                value: false
            })
        }
    }
    return props;
}
