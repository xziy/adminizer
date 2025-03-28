'use strict'
import {AdminpanelConfig} from "../interfaces/adminpanelConfig";
import {FileStorageHelper} from "../helpers/fileStorageHelper";
import timezones from "../lib/timezones";

/**
 * Default admin config
 */
var adminpanelConfig: AdminpanelConfig = {
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
    userap: {
      title: "Users AP",
      model: "userap",
      icon: "people",
      add: {
        controller: "../controllers/addUser"
      },
      edit: {
        controller: "../controllers/editUser"
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
          groups: false
        }
      }
    },
    groupap: {
      title: "Groups AP",
      model: "groupap",
      icon: "group_add",
      add: {
        controller: "../controllers/addGroup"
      },
      edit: {
        controller: "../controllers/editGroup"
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
