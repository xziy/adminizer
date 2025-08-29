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
    read: {
        type: "boolean",
    },
    notificationClass: {
        type: "string",
    },
    metadata: {
        type: 'json'
    }
}

export interface NotificationAP {
    id: string;
    title: string;
    message: string;
    read: boolean;
    notificationClass: string;
    metadata?: Record<string, unknown>;
}
