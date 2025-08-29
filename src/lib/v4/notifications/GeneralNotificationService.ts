import {AbstractNotificationService} from './AbstractNotificationService';
import {INotification, INotificationEvent} from '../../../interfaces/types';
import {Adminizer} from '../../Adminizer';

export class GeneralNotificationService extends AbstractNotificationService {
    public readonly notificationClass = 'general';

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
                Adminizer.log.info(`[General] Notification dispatched: ${fullNotification.title}`);
                return true;

            } catch (error) {
                Adminizer.log.error('Error saving notification to database:', error);
            }
        }

        return false;
    }

    async getNotifications(userId?: number, limit: number = 50, unreadOnly: boolean = false): Promise<INotification[]> {
        if (!this.adminizer.modelHandler.model.has('notificationap')) {
            return [];
        }

        try {
            const query: any = { notificationClass: this.notificationClass };
            if (unreadOnly) query.read = false;

            // const notifications: INotification[] = [
            //     {
            //         id: '1',
            //         title: 'New notification',
            //         message: 'This is a test notification',
            //         createdAt: new Date(),
            //         read: false,
            //         notificationClass: this.notificationClass,
            //     }
            // ]

            return await this.adminizer.modelHandler.model.get('notificationap')["_find"]({
                where: query,
                sort: 'createdAt DESC',
                limit
            }) as INotification[];

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