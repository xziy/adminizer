import { AbstractNotificationService } from './AbstractNotificationService';
import { INotification, INotificationEvent } from '../../../interfaces/types';
import { Adminizer } from '../../Adminizer';
import {NotificationAPModel} from "../../../models/NotificationAP";

export class SystemNotificationService extends AbstractNotificationService {
    public readonly notificationClass = 'system';
    public readonly icon: string = 'settings'
    public readonly iconColor: string = '#1eb707';

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

                if (notification.userId) {
                    await this.createUserNotification(notificationDB.id, notification.userId);
                }

                const event: INotificationEvent = {
                    type: 'notification',
                    data: {
                        ...notificationDB.toJSON(),
                        icon: {
                            icon: this.icon,
                            iconColor: this.iconColor
                        },
                    } as INotification,
                    notificationClass: this.notificationClass,
                    userId: notification.userId ?? null
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

            let notificationsDB: NotificationAPModel[];

            notificationsDB = await this.adminizer.modelHandler.model.get('notificationap')["_find"]({
                where: query,
                sort: 'createdAt DESC',
                limit
            });

            let notifications: INotification[] = [];

            for (const notification of notificationsDB) {
                let readStatus = false;

                // Для системных уведомлений проверяем статус прочтения
                if (userId && this.adminizer.modelHandler.model.has('usernotificationap')) {
                    const userNotification = await this.getUserNotification(notification.id, userId);
                    readStatus = userNotification ? userNotification.read : false;
                }

                notifications.push({
                    ...notification,
                    read: readStatus,
                    icon: {
                        icon: this.icon,
                        iconColor: this.iconColor
                    },
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