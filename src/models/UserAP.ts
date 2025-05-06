import { GroupAP } from "./GroupAP";

export default {
  id: {
    type: "number",
    autoIncrement: true,
    primaryKey: true
  },
  login: {
    type: "string",
    required: true,
    unique: true
  },
  fullName: {
    type: "string",
    required: true
  },
  email: {
    type: "string"
  },
  passwordHashed: {
    type: "string"
  },
  password: {
    type: "string"
  },
  timezone: {
    type: "string"
  },
  expires: {
    type: "string"
  },
  locale: {
    type: "string"
  },
  isDeleted: {
    type: "boolean"
  },
  isActive: {
    type: "boolean"
  },
  isAdministrator: {
    type: "boolean"
  },
  groups: {
    collection: "GroupAP",
    via: "users"
  },
  widgets: {
    type: "json"
  },
  isConfirmed: {
    type: "boolean"
  }
}

export interface UserAP {
  id: number;
  login: string;
  fullName: string;
  email?: string;
  passwordHashed?: string;
  /** @deprecated */
  password?: string;
  timezone?: string;
  expires?: string;
  locale?: string;
  isDeleted?: boolean;
  isActive?: boolean;
  isAdministrator?: boolean;
  groups?: GroupAP[];
  widgets?: Record<string, unknown>;
  isConfirmed?: boolean;
}
