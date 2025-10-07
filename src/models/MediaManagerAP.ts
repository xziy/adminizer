import {MediaManagerAssociationsAP} from "./MediaManagerAssociationsAP";
import {MediaManagerMetaAP} from "./MediaManagerMetaAP";

export default {
    id: {
        type: "number",
        autoIncrement: true,
        primaryKey: true
    },
    parent: {
        model: "MediaManagerAP"
    },
    variants: {
        collection: "MediaManagerAP",
        via: "parent"
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
        via: "parent"
    },
    modelAssociation: {
        collection: "MediaManagerAssociationsAP",
        via: "file"
    },
    createdAt: {
        type: 'number',
        autoCreatedAt: true
    },
    updatedAt: {
        type: 'number',
        autoUpdatedAt: true
    }
}

export interface MediaManagerAP {
    id: string;
    parent?: MediaManagerAP;
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
