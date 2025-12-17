export default {
    id: {
        type: "number",
        autoIncrement: true,
        primaryKey: true
    },
    modelId: {
        type: "number",
        required: true
    },
    modelName: {
        type: "string",
        required: true
    },
    action: {
        type: "string",
    },
    data: {
        type: "json",
    },
    diff: {
        type: "json",
    },
    meta: {
        type: "string",
    },
    createdAt: {
        type: 'number',
        autoCreatedAt: true
    },
    updatedAt: {
        type: 'number',
        autoUpdatedAt: true
    },
    preview: {
        type: 'boolean'
    }
}

export interface HistoryActionsAP {
    id: number,
    modelId: number,
    modelName: string,
    action: string,
    data: any,
    createdAt: number,
    updatedAt: number,
    preview: boolean
}