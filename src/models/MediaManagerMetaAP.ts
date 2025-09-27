import {MediaManagerAP} from "./MediaManagerAP";

export default {
    id: {
        type: "number",
        autoIncrement: true,
        primaryKey: true
    },
    key: {
        type: "string"
    },
    value: {
        type: "json"
    },
    isPublic: {
        type: "boolean"
    },
    parent: {
        model: "MediaManagerAP"
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


export interface MediaManagerMetaAP {
    id: string;
    key?: string;
    value?: Record<string, unknown>;
    isPublic?: boolean;
    parent?: MediaManagerAP;
}
