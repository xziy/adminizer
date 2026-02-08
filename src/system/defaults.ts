'use strict'
import {AdminpanelConfig} from "../interfaces/adminpanelConfig";
import {FileStorageHelper} from "../helpers/fileStorageHelper";
import timezones from "../lib/timezones";
import addUser from "../controllers/addUser.js";
import editUser from "../controllers/editUser.js";
import addGroup from "../controllers/addGroup.js";
import editGroup from "../controllers/editGroup.js";

/**
 * Default admin config
 */
let adminpanelConfig: AdminpanelConfig = {
    /** Default route prefix */
    routePrefix: '/adminizer',

    /**
     * Name of model identifier field
     */
    identifierField: 'id',

    /**
     * Policies
     */
    policies: [],

    /**
     * Base navbar configuration
     */
    navbar: {
        // List of additional actions
        additionalLinks: []
    },

    brand: {
        link: null
    },

    /**
     * List of admin pages
     */
    models: {
        UserAP: {
            title: "Users",
            model: "userap",
            icon: "people",
            navbar: {
                section: "System"
            },
            add: {
                controller: addUser
            },
            edit: {
                controller: editUser
            },
            fields: {
                login: {
                    title: 'User login',
                },
                fullName: {
                    title: 'Full Name'
                },
                password: {
                    title: 'Password',
                },
                apiToken: false,
                apiTokenCreatedAt: false,
                isAdministrator: {
                    title: 'is administrator'
                },
                isConfirme: {
                    title: 'is confirme'
                }
            },
            list: {
                fields: {
                    createdAt: false,
                    updatedAt: false,
                    id: false,
                    email: false,
                    passwordHashed: false,
                    timezone: false,
                    locale: false,
                    isDeleted: false,
                    isActive: false,
                    groups: false,
                    apiToken: false,
                    apiTokenCreatedAt: false
                }
            }
        },
        GroupAP: {
            title: "Groups",
            model: "groupap",
            icon: "group_add",
            navbar: {
                section: "System"
            },
            add: {
                controller: addGroup
            },
            edit: {
                controller: editGroup
            },
            list: {
                fields: {
                    createdAt: false,
                    updatedAt: false,
                    id: false,
                }
            }
        },
        FilterAP: {
            title: "Filters",
            model: "filterap",
            icon: "filter_alt",
            navbar: {
                visible: false,
                section: "System"
            },
            userAccessRelation: "owner",
            list: {
                fields: {
                    conditions: false,
                    groupIds: false,
                    apiKey: false,
                    schemaVersion: false,
                    createdAt: false,
                    updatedAt: false
                }
            }
        },
        FilterColumnAP: {
            title: "Filter Columns",
            model: "filtercolumnap",
            icon: "view_column",
            navbar: {
                visible: false,
                section: "System"
            },
            list: {
                fields: {
                    createdAt: false,
                    updatedAt: false
                }
            }
        }
    },

    translation: {
        locales: ['en', 'ru'],
        path: `config/locales/adminpanel`,
        defaultLocale: 'en'
    },

    forms: {
        path: `api/adminpanel-forms`,
        data: {},
        get: async function (slug, key) {
            return FileStorageHelper.get(slug, key)
        },
        set: async function (slug, key, value) {
            FileStorageHelper.set(slug, key, value)
        }
    },

    /**
     * List of sections in head
     */
    sections: [],
    package: {version: "4.0.0"},
    showVersion: true,
    timezones: timezones,
    styles: [],
    scripts: {
        header: [],
        footer: []
    },

    security: {
        csrf: true
    },

    registration: {
        enable: false,
        defaultUserGroup: "guest",
        confirmationRequired: true
    },

    auth: {
        enable: false,
        captcha: true
    },
    bind: {
        public: true
    },
    notifications: {
        enabled: false
    },
    filtersEnabled: true,
    aiAssistant: {
        enabled: false,
        defaultModel: 'dummy',
        models: ['dummy']
    },
    cors: {
        enabled: false,
        origin: 'http://localhost:8080',
        path: 'api/*'
    },
    mediamanager: {
        fileStoragePath: '.tmp/public',
    }
}


export function setDefaultConfig(config: AdminpanelConfig) {
    adminpanelConfig = config;
}

export function getDefaultConfig() {
    return adminpanelConfig;
}

export function defaults() {
    return {
        adminpanel: adminpanelConfig
    }
}
