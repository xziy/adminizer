import {INotification, Adminizer} from "../../dist";

export async function sendNotificationsWithDelay(adminizer: Adminizer) {
    const notifications: Omit<INotification, 'id' | 'createdAt' | 'icon'>[] = [
        {
            message: "Первое уведомление",
            title: "Всем",
            notificationClass: "general",
            channel: ""
        },
        {
            title: 'System notification - Created',
            message: 'Новый пользователь создан',
            notificationClass: 'system',
            channel: 'created',
            metadata: { entity: 'user', action: 'create' }
        },
        {
            message: "Второе уведомление",
            title: "To user test (id 2)",
            userId: 2,
            notificationClass: "general",
            channel: ""
        },
        {
            title: 'System notification - Updated',
            message: 'Товар обновлен',
            notificationClass: 'system',
            channel: 'updated',
            metadata: { entity: 'product', action: 'update' }
        },
        {
            message: "Третье уведомление",
            title: "To user admin (id 1)",
            userId: 1,
            notificationClass: "general",
            channel: ""
        },
        {
            title: 'System notification - Deleted',
            message: 'Заказ удален',
            notificationClass: 'system',
            channel: 'deleted',
            metadata: { entity: 'order', action: 'delete' }
        },
        {
            title: 'System notification - General',
            message: 'Системное событие',
            notificationClass: 'system',
            channel: 'system',
            metadata: { type: 'maintenance' }
        }
    ];

    for (const notification of notifications) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Ждем 2 секунды

        if (notification.notificationClass === "general") {
            await adminizer.sendNotification(notification);
        }
        else if (notification.notificationClass === 'system') {
            // Используем специальные методы для CRUD событий
            switch (notification.channel) {
                case 'created':
                    await adminizer.logSystemCreatedEvent(
                        notification.title,
                        notification.message,
                        notification.metadata
                    );
                    break;
                case 'updated':
                    await adminizer.logSystemUpdatedEvent(
                        notification.title,
                        notification.message,
                        notification.metadata
                    );
                    break;
                case 'deleted':
                    await adminizer.logSystemDeletedEvent(
                        notification.title,
                        notification.message,
                        notification.metadata
                    );
                    break;
                case 'system':
                default:
                    await adminizer.logSystemEvent(
                        notification.title,
                        notification.message,
                        notification.metadata
                    );
                    break;
            }
        }
    }
}