import {AdminpanelConfig} from "../dist/interfaces/adminpanelConfig";

const routePrefix = "/adminizer";

const models: AdminpanelConfig["models"] = {
    example: {
        title: 'Exapmle Form example from file',
        model: 'example',
        tools: [
            {
                id: '1',
                link: '/test/404',
                title: 'Some new action',
                icon: 'reorder',
            },
            {
                id: '2',
                link: `${routePrefix}/form/global`,
                title: 'Form example',
                icon: 'payment',
                accessRightsToken: 'read-example-form'
            },
            {
                id: '3',
                link: '#',
                title: 'Form example from file Form example from file',
                icon: 'touch_app',
                accessRightsToken: 'read-exampleFromFile-form'
            }
        ],
        fields: {
            createdAt: false,
            updatedAt: false,
            title: {
                title: 'Title',
                type: 'string',
                required: true
            },
            description: {
                title: 'Textarea',
                type: 'text',
                tooltip: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Hic, nisi.'
            },
            sort: {
                type: 'boolean',
                title: 'Boolean'
            },
            range: {
                type: 'range',
                title: 'Range',
                options: {
                    min: 10,
                    max: 80
                }
            },
            select: {
                title: 'Select',
                isIn: ['one', 'two', 'three']
            },
            date: {
                title: 'Date',
                type: 'date',
            },
            month: {
                title: 'Month',
                type: 'month',
            },
            datetime: {
                title: 'Date and time',
                type: 'datetime',
            },
            time: {
                title: 'time',
                type: 'time',
            },
            number: {
                title: 'Number',
                type: 'number',
            },
            color: {
                title: 'color',
                type: 'color',
            },
            week: {
                title: 'Week',
                type: 'week',
            },
            editor: {
                title: 'Editor',
                type: 'wysiwyg',
                options: {
                    name: 'react-simple',
                    // items: [
                    //     // 'sourceEditing', // This is for test, see full list of items in src/lib/controls/wysiwyg/CKeditor.ts
                    //     // 'showBlocks',
                    //     // '|',
                    //     'heading',
                    //     '|',
                    //     'bold',
                    //     'italic',
                    //     'underline',
                    //     '|',
                    //     // 'horizontalLine',
                    //     'link',
                    //     'insertImageViaUrl',
                    //     'insertTable',
                    //     'blockQuote',
                    //     '|',
                    //     'alignment',
                    //     '|',
                    //     'bulletedList',
                    //     'numberedList',
                    //     'outdent',
                    //     'indent',
                    // ]
                }
            }
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
                        link: 'test',
                        title: 'Google',
                        icon: 'insert_link'
                    },
                    {
                        id: "2",
                        link: 'test2',
                        title: 'Google1',
                        icon: 'insert_link'
                    },
                    {
                        id: "3",
                        link: 'test3',
                        title: 'Google2',
                        icon: 'insert_link'
                    }
                ]
            }
        },
        icon: 'inbox'
    },
};

// @ts-ignore
// @ts-ignore
const config: AdminpanelConfig = {
    routePrefix: routePrefix,
    // routePrefix: "/admin",
    // auth: true,
    // registration: {
    //     enable: true,
    //     defaultUserGroup: "test",
    //     confirmationRequired: false
    // },
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
        additionalLinks: [
            {
                id: '1',
                link: `${routePrefix}/form/global`,
                title: 'Global Settings',
                icon: 'build',
                accessRightsToken: 'read-global-form'
            },
            {
                id: '2',
                link: `${routePrefix}/module-test`,
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
            icon: 'circle',
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
            id: "0",
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
    }
};

export default config
