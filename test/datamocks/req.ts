import { Adminizer } from "../../src";

export function buildMockReq(adminizer: Adminizer): ReqType {
  return {
    originalUrl: "/admin/model/example",
    params: {},

    adminizer: {
      config: {
        routePrefix: "admin",
        models: {
          example: {
            model: "example",
            fields: {
              title: { type: "string" },
              guardedField: {
                type: "string",
                groupsAccessRights: ["admin", "editor"]
              }
            },
            add: {
              fields: {
                title: {},
                guardedField: {}
              }
            },
            edit: {
              fields: {
                title: {},
                guardedField: {
                  groupsAccessRights: ["admin", "manager"]
                }
              }
            }
          }
        },
        registration: {
          defaultUserGroup: "default user group",
          enable: false,
          confirmationRequired: false
        }
      },
      modelHandler: {
        model: {
          get: (name: string) => adminizer.modelHandler.model.get(name)
        }
      }
    }
  };
}
