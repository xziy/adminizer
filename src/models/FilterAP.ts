import { FilterColumnAP } from "./FilterColumnAP";
import { UserAP } from "./UserAP";

export type FilterVisibility = "private" | "public" | "groups";
export type FilterSortDirection = "ASC" | "DESC";

export type FilterOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "like"
  | "ilike"
  | "startsWith"
  | "endsWith"
  | "in"
  | "notIn"
  | "between"
  | "isNull"
  | "isNotNull"
  | "regex"
  | "custom";

export interface FilterCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value: unknown;
  logic?: "AND" | "OR" | "NOT";
  children?: FilterCondition[];
  relation?: string;
  relationField?: string;
  customHandler?: string;
  customHandlerParams?: unknown;
  rawSQL?: string;
  rawSQLParams?: unknown[];
}

export default {
  id: {
    type: "string",
    primaryKey: true,
    uuid: true
  },
  name: {
    type: "string",
    required: true
  },
  description: {
    type: "string"
  },
  modelName: {
    type: "string",
    required: true
  },
  slug: {
    type: "string",
    required: true,
    unique: true
  },
  conditions: {
    type: "json",
    defaultsTo: []
  },
  sortField: {
    type: "string"
  },
  sortDirection: {
    type: "string",
    defaultsTo: "ASC"
  },
  visibility: {
    type: "string",
    defaultsTo: "private"
  },
  owner: {
    model: "UserAP",
    required: true
  },
  groupIds: {
    type: "json",
    defaultsTo: []
  },
  apiEnabled: {
    type: "boolean",
    defaultsTo: false
  },
  apiKey: {
    type: "string"
  },
  icon: {
    type: "string"
  },
  color: {
    type: "string"
  },
  isPinned: {
    type: "boolean",
    defaultsTo: false
  },
  isSystemFilter: {
    type: "boolean",
    defaultsTo: false
  },
  version: {
    type: "number",
    defaultsTo: 1
  },
  schemaVersion: {
    type: "string"
  },
  columns: {
    collection: "FilterColumnAP",
    via: "filter"
  },
  createdAt: {
    type: "datetime",
    autoCreatedAt: true
  },
  updatedAt: {
    type: "datetime",
    autoUpdatedAt: true
  }
};

export interface FilterAP {
  id: string;
  name: string;
  description?: string;
  modelName: string;
  slug: string;
  conditions: FilterCondition[];
  sortField?: string;
  sortDirection?: FilterSortDirection;
  visibility: FilterVisibility;
  owner: UserAP;
  groupIds?: number[];
  apiEnabled: boolean;
  apiKey?: string;
  icon?: string;
  color?: string;
  isPinned?: boolean;
  isSystemFilter?: boolean;
  version: number;
  schemaVersion?: string;
  columns?: FilterColumnAP[];
  createdAt?: Date;
  updatedAt?: Date;
}
