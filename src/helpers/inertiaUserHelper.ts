import {Entity} from "../interfaces/types";

interface Field {
    label: string;
    type: string;
    name: string;
    tooltip?: string;
    value: string | boolean | Record<string, string>[];
}

interface listProps {
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
    groupHead: string,
    fields: Field[]
    groups: Field[]
    locales: Record<string, string>[],
}

export function inertiaUserHelper(entity: Entity, req: ReqType, groups: ModelsAP["GroupAP"][], user?: ModelsAP["UserAP"], view: boolean = false) {
    let props: listProps = {
        edit: !!user,
        view: view,
        btnBack: {
            title: req.i18n.__('Back'),
            link: entity.uri
        },
        btnSave: {
            title: req.i18n.__('Save')
        },
        postLink: user ? `${entity.uri}/edit/${user.id}` : `${entity.uri}/add`,
        head: req.i18n.__('User settings'),
        groupHead: req.i18n.__('User groups'),
        fields: [
            {
                label: req.i18n.__('Login'),
                type: 'text',
                name: 'login',
                value: user?.login ?? ''
            },
            {
                label: req.i18n.__('Full name'),
                type: 'text',
                name: 'fullName',
                value: user?.fullName ?? ''
            },
            {
                label: req.i18n.__('E-mail'),
                type: 'email',
                name: 'email',
                value: user?.email ?? ''
            },
            {
                label: req.i18n.__('Timezone'),
                type: 'select',
                name: 'timezone',
                value: user?.timezone ?? ''
            }
        ],
        groups: [],
        locales: []
    }
    if (req.adminizer.config.translation) {
        let locales: Record<string, string>[] = []
        for (let locale of req.adminizer.config.translation.locales) {
            locales.push({
                label: locale,
                value: locale
            })
        }
        props.locales = locales
        props.fields.push({
            label: req.i18n.__('Locale'),
            type: 'select',
            name: 'locale',
            value: user?.locale ?? ''
        })
    }
    if (req.session.UserAP.isAdministrator) {
        props.fields.push({
            label: req.i18n.__('Profile expires'),
            type: 'date',
            name: 'date',
            value: user?.expires ?? ''
        })
        props.fields.push({
            label: req.i18n.__('Is Administrator'),
            type: 'checkbox',
            name: 'isAdmin',
            value: user?.isAdministrator ?? false
        })
        props.fields.push({
            label: req.i18n.__('Is confirmed'),
            type: 'checkbox',
            name: 'isConfirmed',
            value: user?.isConfirmed ?? false
        })
    }
    props.fields.push({
        label: req.i18n.__('Password'),
        type: 'password',
        name: 'userPassword',
        tooltip: req.i18n.__("Leave this field empty if you don't want to change the password"),
        value: ''
    })
    props.fields.push({
        label: req.i18n.__('Repeat password'),
        type: 'password',
        name: 'repeatUserPassword',
        value: ''
    })
    if (!req.session.UserAP.isAdministrator && groups.length) {
        let userGroupsIds: number[] = []
        if (user) {
            userGroupsIds = user.groups.map((group) => {
                return group.id
            })
        }
        for (let group of groups) {
            props.groups.push({
                label: group.name,
                type: 'checkbox',
                name: `group-checkbox-${group.id}`,
                value: userGroupsIds.includes(group.id)
            })
        }
    }
    return props;
}
