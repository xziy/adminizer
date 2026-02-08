import { FilterAP } from "./FilterAP";

export default {
  id: {
    type: "number",
    autoIncrement: true,
    primaryKey: true
  },
  filter: {
    model: "FilterAP",
    required: true
  },
  fieldName: {
    type: "string",
    required: true
  },
  order: {
    type: "number",
    defaultsTo: 0
  },
  width: {
    type: "number"
  },
  isVisible: {
    type: "boolean",
    defaultsTo: true
  },
  isEditable: {
    type: "boolean",
    defaultsTo: false
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

export interface FilterColumnAP {
  id: number;
  filter: FilterAP;
  fieldName: string;
  order?: number;
  width?: number;
  isVisible?: boolean;
  isEditable?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
