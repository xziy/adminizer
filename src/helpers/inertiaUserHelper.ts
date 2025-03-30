import {Entity} from "../interfaces/types";

interface listProps{
    back: {
        title: string;
        link: string;
    },
    postLink: string,
    head: string,
    groupHead: string,
    fields: {
        label: string,
        type: string,
        name: string,
        tooltip?: string
    }[]
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
                name: 'login'
            },
            {
                label: req.i18n.__('Full name'),
                type: 'text',
                name: 'fullName'
            },
            {
                label: req.i18n.__('E-mail'),
                type: 'email',
                name: 'email'
            },
            {
                label: req.i18n.__('Timezone'),
                type: 'email',
                name: 'select'
            },
            {
                label: req.i18n.__('Profile expires'),
                type: 'date',
                name: 'date'
            },
        ]
    }
    if (req.adminizer.config.translation) {
        props.fields.push({
            label: req.i18n.__('Locale'),
            type: 'select',
            name: 'locale'
        })
    }
    if (req.session.UserAP.isAdministrator) {
        props.fields.push({
            label: req.i18n.__('Is Administrator'),
            type: 'checkbox',
            name: 'isAdmin'
        })
        props.fields.push({
            label: req.i18n.__('Is confirmed'),
            type: 'checkbox',
            name: 'isConfirmed'
        })
    }
    props.fields.push({
        label: req.i18n.__('Password'),
        type: 'password',
        name: 'userPassword',
        tooltip: req.i18n.__('Leave this field empty if you don&apos;t want to change the password')
    })
    props.fields.push({
        label: req.i18n.__('Repeat password'),
        type: 'password',
        name: 'repeatUserPassword'
    })
    if (!req.session.UserAP.isAdministrator && groups.length) {
        for (let group of groups) {
            props.fields.push({
                label: group.name,
                type: 'checkbox',
                name: `group-checkbox-${group.id}`
            })
        }
    }
    return props;
}
