import { AbstractNotificationService } from './AbstractNotificationService';
import { INotification, INotificationEvent } from '../../../interfaces/types';
import { Adminizer } from '../../Adminizer';

export class SystemNotificationService extends AbstractNotificationService {
    public readonly notificationClass = 'system';

    async dispatchNotification(notification: Omit<INotification, 'id' | 'createdAt' | 'read' | 'notificationClass'>): Promise<boolean> {
        const fullNotification: Omit<INotification, 'id' | 'createdAt'> = {
            ...notification,
            read: false,
            notificationClass: this.notificationClass
        };

        let notificationDB: INotification;

        // Сохраняем в базу
        if (this.adminizer.modelHandler.model.has('notificationap')) {
            try {
                notificationDB = await this.adminizer.modelHandler.model.get('notificationap')["_create"](fullNotification);
                const event: INotificationEvent = {
                    type: 'notification',
                    data: notificationDB,
                    notificationClass: this.notificationClass
                };

                this.broadcast(event);
                Adminizer.log.info(`[System] Notification dispatched: ${fullNotification.title}`);
                return true;

            } catch (error) {
                Adminizer.log.error('Error saving system notification to database:', error);
            }
        }

        return false;
    }

    async getNotifications(userId?: number, limit: number = 100, unreadOnly: boolean = false): Promise<INotification[]> {
        if (!this.adminizer.modelHandler.model.has('notificationap')) {
            return [];
        }

        try {
            const query: any = { notificationClass: this.notificationClass };
            // Системные уведомления не фильтруются по пользователю
            if (unreadOnly) query.read = false;

            const notificationsDB = await this.adminizer.modelHandler.model.get('notificationap')["_find"]({
                where: query,
                sort: 'createdAt DESC',
                limit
            });

            // console.log(notificationsDB);

            // const notificationsDB: INotification[] = [
            //     {
            //         id: '1a',
            //         title: 'Admin system notification',
            //         message: 'This is a test system notification. This is a test system notification',
            //         userId: 1,
            //         createdAt: new Date(),
            //         read: false,
            //         notificationClass: this.notificationClass,
            //     }
            // ]

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
    async logSystemEvent(action: string, details: string, metadata?: any): Promise<boolean> {
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