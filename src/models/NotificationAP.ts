import {Model} from "sequelize";

export default {
    id: {
        type: "number",
        autoIncrement: true,
        primaryKey: true
    },
    title: {
        type: "string"
    },
    message: {
        type: "string"
    },
    notificationClass: {
        type: "string",
    },
    channel: {
        type: "string",
    },
    metadata: {
        type: 'json'
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

export interface NotificationAP {
    id: string;
    title: string;
    message: string;
    channel: string;
    notificationClass: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
}

export interface NotificationAPModel extends Model<NotificationAP>, NotificationAP {
    toJSON(): NotificationAP;
}