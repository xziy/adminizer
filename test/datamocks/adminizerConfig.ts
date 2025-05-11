import { AdminpanelConfig } from "src";

const routePrefix = "/adminizer";

const models: AdminpanelConfig["models"] = {
    test: {
        title: 'Test model',
        model: 'test',
        userAccessRelation: 'owner',
        fields: {
            createdAt: false,
            updatedAt: false,
            title: {
                title: 'Title',
                type: 'string',
                required: true
            }
        },
        list: {
            // fields: {
            //     owner: false,
            // }
        },
        add: {
            // fields: {
            //     ownerId: false,
            //     exampleId: false
            // }
        },
        icon: 'receipt'
    }
};

const config: AdminpanelConfig = {
    routePrefix: routePrefix,
    // routePrefix: "/admin",
    auth: {
        enable: false
    },
    registration: {
        enable: true,
        defaultUserGroup: "guest",
        confirmationRequired: false
    },
    // auth: {
    //     enable: true,
    //     description: "Login `demo`, password `demo`"
    // },
    dashboard: false,
    forms: {
        data: {
            global: {
                field1: {
                    title: 'Field1',
                    type: 'string',
                    value: 'Some string',
                    required: true,
                },
                field2: {
                    title: 'Field2',
                    type: 'text',
                    value: 'Some text',
                    required: true,
                    tooltip: 'tooltip for field2',
                },
                json: {
                    title: 'Json',
                    type: 'jsoneditor'
                },
            }
        }
    },
    navbar: {
        additionalLinks: [
            {
                id: '1',
                link: `${routePrefix}/form/global`,
                title: 'Global Settings',
                type: 'self',
                icon: 'build',
                accessRightsToken: 'read-global-form'
            },
            {
                id: '2',
                link: `${routePrefix}/module-test`,
                type: 'self',
                title: 'Test Module',
                icon: '360',
                accessRightsToken: 'read-global-form'
            }
        ]
    },
    sections: [
        {
            id: "0",
            title: 'Website 1',
            link: '#',
            type: 'self',
            icon: 'circle',
            subItems: [
                {
                    id: "0",
                    title: 'Sub 1',
                    type: 'blank',
                    link: 'https://example.com',
                    icon: 'language'
                },
                {
                    id: "1",
                    title: 'Sub 2',
                    link: 'https://google.com',
                    type: 'blank',
                    icon: 'share'
                },
                {
                    id: "2",
                    title: 'Sub 3 Sub 3 Sub 3 Sub 3',
                    link: `${routePrefix}/form/global`,
                    type: 'self',
                    icon: 'insert_link'
                },
                {
                    id: "3",
                    title: 'Sub 4',
                    link: 'https://google.com',
                    type: 'blank',
                    icon: 'insert_link'
                }
            ]
        },
        {
            id: "1",
            title: 'Website 2 Website 2 Website 2',
            link: 'https://example.com',
            type: 'blank',
            icon: 'insert_link'
        },
        {
            id: "2",
            title: 'Website 3',
            type: 'blank',
            link: 'https://example.com',
            icon: 'share'
        },
        {
            id: "3",
            title: 'Website 1',
            type: 'blank',
            link: 'https://example.com',
            icon: 'language'
        },
        {
            id: "4",
            title: 'Website 2 Website 2 Website 2',
            type: 'blank',
            link: 'https://example.com',
            icon: 'insert_link'
        },
    ],
    brand: {
        link: {
            id: "0",
            type: 'blank',
            title: 'Demo adminpanel',
            link: 'https://example.com',
        }
    },
    welcome: {
        title: 'Demo adminpanel project',
        text: 'restaurant and delivery food solution www.example.com'
    },
    administrator: {
        login: process.env.ADMIN_LOGIN === undefined ? 'admin' : process.env.ADMIN_LOGIN,
        password: process.env.ADMIN_PASS === undefined ? '45345345FF38' : process.env.ADMIN_PASS
    },
    translation: {
        locales: ['en', 'ru', 'de', 'ua'],
        path: 'config/locales', // relative path to translations directory
        defaultLocale: 'en'
    },
    models: models,
    //@ts-ignore
    generator: {},
    globalSettings: { // Global project settings
        enableMigrations: true
    },
    migrations: {
        path: 'mg_path', // path to migrations
        //config: string | object // db-migrate config
    },
    showVersion: true,
};

export default config
