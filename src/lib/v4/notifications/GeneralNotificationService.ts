import { AbstractNotificationService } from './AbstractNotificationService';
import { INotification, INotificationEvent } from '../../../interfaces/types';
import { Adminizer } from '../../Adminizer';

export class GeneralNotificationService extends AbstractNotificationService {
    public readonly notificationClass = 'general';

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
        //         Adminizer.log.error('Error saving notification to database:', error);
        //     }
        // }

        const event: INotificationEvent = {
            type: 'notification',
            data: fullNotification,
            notificationClass: this.notificationClass
        };

        this.broadcast(event);
        Adminizer.log.info(`[General] Notification dispatched: ${fullNotification.title}`);

        return fullNotification.id;
    }

    async getNotifications(userId?: number, limit: number = 50, unreadOnly: boolean = false): Promise<INotification[]> {
        // if (!this.adminizer.modelHandler.hasModel('notification')) {
        //     return [];
        // }

        try {
            const query: any = { notificationClass: this.notificationClass };
            if (userId) query.userId = userId;
            if (unreadOnly) query.read = false;

            // const notifications = await this.adminizer.modelHandler.model.get('notification').find({
            //     where: query,
            //     sort: 'createdAt DESC',
            //     limit
            // });

            const notifications: INotification[] = [
                {
                    id: '1',
                    title: 'New notification',
                    message: 'This is a test notification',
                    userId: 1,
                    createdAt: new Date(),
                    read: false,
                    notificationClass: this.notificationClass,
                    type: "info",
                    priority: "low"
                }
            ]

            return notifications;
        } catch (error) {
            Adminizer.log.error('Error fetching notifications:', error);
            return [];
        }
    }

    async markAsRead(id: string): Promise<void> {
        // if (this.adminizer.modelHandler.hasModel('notification')) {
        //     try {
        //         await this.adminizer.modelHandler.model.get('notification').update({ id }, { read: true });
        //     } catch (error) {
        //         Adminizer.log.error('Error marking notification as read:', error);
        //     }
        // }
    }
}