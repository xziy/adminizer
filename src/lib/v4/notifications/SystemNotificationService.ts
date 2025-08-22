import { AbstractNotificationService } from './AbstractNotificationService';
import { INotification, INotificationEvent } from '../../../interfaces/types';
import { Adminizer } from '../../Adminizer';

export class SystemNotificationService extends AbstractNotificationService {
    public readonly notificationClass = 'system';

    async dispatchNotification(notification: Omit<INotification, 'id' | 'createdAt' | 'read' | 'notificationClass'>): Promise<string> {
        const fullNotification: INotification = {
            ...notification,
            id: this.generateId(),
            createdAt: new Date(),
            read: false,
            notificationClass: this.notificationClass
        };

        // Сохраняем в базу
        // if (this.adminizer.modelHandler.hasModel('notification')) {
        //     try {
        //         await this.adminizer.modelHandler.model.get('notification').create(fullNotification);
        //     } catch (error) {
        //         Adminizer.log.error('Error saving system notification to database:', error);
        //     }
        // }

        const event: INotificationEvent = {
            type: 'notification',
            data: fullNotification,
            notificationClass: this.notificationClass
        };

        this.broadcast(event);
        Adminizer.log.info(`[System] Notification dispatched: ${fullNotification.title}`);

        return fullNotification.id;
    }

    async getNotifications(userId?: number, limit: number = 100, unreadOnly: boolean = false): Promise<INotification[]> {
        // if (!this.adminizer.modelHandler.hasModel('notification')) {
        //     return [];
        // }

        try {
            const query: any = { notificationClass: this.notificationClass };
            // Системные уведомления не фильтруются по пользователю
            if (unreadOnly) query.read = false;

            // const notifications = await this.adminizer.modelHandler.model.get('notification').find({
            //     where: query,
            //     sort: 'createdAt DESC',
            //     limit
            // });

            const notificationsDB: INotification[] = [
                {
                    id: '1a',
                    title: 'Admin system notification',
                    message: 'This is a test system notification. This is a test system notification',
                    userId: 1,
                    createdAt: new Date(),
                    read: false,
                    notificationClass: this.notificationClass,
                }
            ]

            let notifications: INotification[] = [];
            for (const notification of notificationsDB) {
                const userDB = await this.adminizer.modelHandler.model.get('userap')["_findOne"]({ id: notification.userId });
                notifications.push({
                    ...notification,
                    user: {
                        avatar: userDB.avatar,
                        login: userDB.login
                    }
                });
            }

            return notifications;
        } catch (error) {
            Adminizer.log.error('Error fetching system notifications:', error);
            return [];
        }
    }

    async markAsRead(id: string): Promise<void> {
        // if (this.adminizer.modelHandler.hasModel('notification')) {
        //     try {
        //         await this.adminizer.modelHandler.model.get('notification').update({ id }, { read: true });
        //     } catch (error) {
        //         Adminizer.log.error('Error marking system notification as read:', error);
        //     }
        // }
    }

    // Специальный метод для системных событий
    async logSystemEvent(action: string, details: string, metadata?: any): Promise<string> {
        return this.dispatchNotification({
            title: `Системное событие: ${action}`,
            message: details,
            metadata: {
                ...metadata,
                actionType: action,
                isSystemEvent: true,
                timestamp: new Date().toISOString()
            }
        });
    }
}