import {AdminpanelConfig} from "../dist/interfaces/adminpanelConfig";

const models: AdminpanelConfig["models"] = {
    example: {
        title: 'Exapmle Form example from file',
        model: 'example',
        fields: {
            createdAt: false,
            updatedAt: false,
            title: 'Title',
        },
        list: {
            fields: {},
            actions: {
                global: [
                    {
                        id: "1",
                        link: '#',
                        title: 'Google',
                        icon: 'insert_link'
                    }
                ],
                inline: [
                    {
                        id: "1",
                        link: '#',
                        title: 'Google',
                        icon: 'insert_link'
                    },
                    {
                        id: "2",
                        link: '#',
                        title: 'Google1',
                        icon: 'insert_link'
                    },
                    {
                        id: "3",
                        link: '#',
                        title: 'Google2',
                        icon: 'insert_link'
                    }
                ]
            }
        },
        icon: 'inbox'
    },
};

export default {
    routePrefix: "/adminizer",
    // routePrefix: "/admin",
    // auth: true,
    dashboard: true,
    forms: {
        path: 'forms',
        data: {
            global: {
                field1: {
                    title: 'Field1',
                    type: 'string',
                    value: 'Some string',
                    required: true,
                    tooltip: 'tooltip for field1',
                    description: 'some description'
                },
            }
        }
    },
    navbar: {
        additionalLinks: [{
            id: 4,
            link: '/adminizer/form/global',
            title: 'Global Settings',
            icon: 'build',
            accessRightsToken: 'read-global-form'
        }]
    },
    sections: [
        {
            id: "0",
            title: 'Website 1',
            link: '#',
            icon: 'mask',
            subItems: [
                {
                    id: "0",
                    title: 'Sub 1',
                    link: 'https://webresto.org',
                    icon: 'language'
                },
                {
                    id: "1",
                    title: 'Sub 2',
                    link: '#',
                    icon: 'share'
                },
                {
                    id: "2",
                    title: 'Sub 3 Sub 3 Sub 3 Sub 3',
                    link: '#',
                    icon: 'insert_link'
                },
                {
                    id: "3",
                    title: 'Sub 4',
                    link: '#',
                    icon: 'insert_link'
                }
            ]
        },
        {
            id: "1",
            title: 'Website 2 Website 2 Website 2',
            link: 'https://webresto.org',
            icon: 'insert_link'
        },
        {
            id: "2",
            title: 'Website 3',
            link: 'https://webresto.org',
            icon: 'share'
        },
        {
            id: "3",
            title: 'Website 1',
            link: 'https://webresto.org',
            icon: 'language'
        },
        {
            id: "4",
            title: 'Website 2 Website 2 Website 2',
            link: 'https://webresto.org',
            icon: 'insert_link'
        },
    ],
    brand: {
        link: {
            title: 'WebResto adminpanel',
            link: 'https://webresto.org',
        }
    },
    welcome: {
        title: 'Webresto adminpanel project',
        text: 'restaurant and delivery food solution www.webresto.org'
    },
    administrator: {
        login: process.env.ADMIN_LOGIN === undefined ? 'admin' : process.env.ADMIN_LOGIN,
        password: process.env.ADMIN_PASS === undefined ? '45345345FF38' : process.env.ADMIN_PASS
    },
    translation: {
        locales: ['en', 'ru', 'de', 'ua'],
        path: 'config/locales/adminpanel', // relative path to translations directory
        defaultLocale: 'en'
    },
    models: models,
    generator: {},
    globalSettings: { // Global project settings
        enableMigrations: true
    },
    migrations: {
        path: 'mg_path', // path to migrations
        //config: string | object // db-migrate config
    }
};
