import { Entity } from "../../src/interfaces/types";

export default {
  "name": "Test",
  "uri": "/admin/model/Test",
  "type": "model",
  "config": {
    "list": {
      "fields": {
        "title": { "title": "Title", "tooltip": "Main title of the item" },
        "number": { "title": "Number", "type": "number" },
        "color": { "title": "Color", "type": "color" }
      }
    },
    "add": {
      "fields": {
        "title": false,
        "guardedField": {
          "title": "Restricted Field",
          "groupsAccessRights": ["admin", "editor"],
          "type": "string"
        }
      }
    },
    "edit": {
      "fields": {
        "title": { "title": "Title", "type": "string", "required": true },
        "color": { "title": "Color", "type": "color" },
        "guardedField": {
          "title": "Restricted Field",
          "groupsAccessRights": ["admin", "manager"]
        }
      }
    },
    "remove": true,
    "view": true,
    "title": "Test Model Example",
    "model": "test",
    "fields": {
      "title": { "title": "Title", "tooltip": "Item Description", "required": true },
      "number": { "title": "Number", "type": "number" },
      "guardedField": {
        "title": "Guarded Field",
        "groupsAccessRights": ["admin", "editor"],
        "type": "string"
      },
      "selfAssociation": {
        "title": "Self Association",
        "type": "association",
        "model": "test"
      }
    },
    "icon": "123",
    "userAccessRelation": "userField"
  },
  "model": {
    "modelname": "Test",
    "attributes": {
      "title": { "type": "string" },
      "number": { "type": "number" },
      "color": {"type": "string"},
      "guardedField": { "type": "string" },
      "selfAssociation": { "model": "Test" },
      "userField": { "model": "UserAP" }
    },
    "primaryKey": "id",
    "identity": "Test"
  }
} as unknown as Entity
