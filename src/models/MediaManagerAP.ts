import { MediaManagerAssociationsAP } from "./MediaManagerAssociationsAP";
import { MediaManagerMetaAP } from "./MediaManagerMetaAP";

export default {
  id: {
    type: "string",
    allowNull: false,
    uuid: true,
    primaryKey: true,
    required: true
  },
  parentNode: {
    model: "MediaManagerAP"
  },
  variants: {
    collection: "MediaManagerAP",
    via: "parentNode"
  },
  mimeType: { 
    type: "string"
  },
  path: {
    type: "string"
  },
  size: {
    type: "number"
  },
  group: {
    type: "string"
  },
  tag: {
    type: "string"
  },
  url: {
    type: "string"
  },
  filename: {
    type: "string"
  },
  meta: {
    collection: "MediaManagerMetaAP",
    via: "parentNode"
  },
  modelAssociation: {
    collection: "MediaManagerAssociationsAP",
    via: "file"
  }
}
export interface MediaManagerAP {
  id: string;
  parentNode?: MediaManagerAP;
  variants?: MediaManagerAP[];
  mimeType?: string;
  path?: string;
  size?: number;
  group?: string;
  tag?: string;
  url?: string;
  filename?: string;
  meta?: MediaManagerMetaAP[];
  modelAssociation?: MediaManagerAssociationsAP[];
}
