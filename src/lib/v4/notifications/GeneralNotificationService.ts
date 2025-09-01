import {AbstractNotificationService} from './AbstractNotificationService';
import {INotification, INotificationEvent} from '../../../interfaces/types';
import {Adminizer} from '../../Adminizer';
import {NotificationAPModel} from "../../../models/NotificationAP";

export class GeneralNotificationService extends AbstractNotificationService {
    public readonly notificationClass = 'general';
    public readonly icon: string = 'info'
    public readonly iconColor: string = '#5987de';

    async dispatchNotification(notification: Omit<INotification, 'id' | 'createdAt' | 'notificationClass' | 'icon'>): Promise<boolean> {
        const fullNotification: Omit<INotification, 'id' | 'createdAt' | 'icon'> = {
            ...notification,
            notificationClass: this.notificationClass
        };

        let notificationDB: NotificationAPModel;
        // Сохраняем в базу
        if (this.adminizer.modelHandler.model.has('notificationap')) {
            try {
                notificationDB = await this.adminizer.modelHandler.model.get('notificationap')["_create"](fullNotification);
                const event: INotificationEvent = {
                    type: 'notification',
                    data: {
                        ...notificationDB.toJSON(),
                        icon: {
                            icon: this.icon,
                            iconColor: this.iconColor
                        },
                    } as INotification,
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
            const query: any = {notificationClass: this.notificationClass};

            let notificationsDB: NotificationAPModel[]

            notificationsDB = await this.adminizer.modelHandler.model.get('notificationap')["_find"]({
                where: query,
                sort: 'createdAt DESC',
                limit
            });

            let notifications: INotification[] = [];
            for (const notification of notificationsDB) {
                notifications.push({
                    ...notification,
                    icon: {
                        icon: this.icon,
                        iconColor: this.iconColor
                    },
                });
            }

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