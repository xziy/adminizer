import {MediaManagerAP} from "./MediaManagerAP";

export default {
    id: {
        type: "number",
        autoIncrement: true,
        primaryKey: true
    },
    mediaManagerId: {
        type: "string"
    },
    model: {
        type: "string"
    },
    modelId: {
        type: "number"
    },
    widgetName: {
        type: "string"
    },
    sortOrder: {
        type: "number"
    },
    file: {
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

export interface MediaManagerAssociationsAP {
    id: string;
    mediaManagerId?: string;
    model?: string;
    modelId?: number;
    widgetName?: string;
    sortOrder?: number;
    file?: MediaManagerAP;
}
