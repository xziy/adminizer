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

                if (notification.userId) {
                    await this.createUserNotification(notificationDB.id, notification.userId);
                } else{
                    const users = await this.adminizer.modelHandler.model.get('userap')["_find"]({});
                    for (const user of users) {
                        try {
                            await this.createUserNotification(notificationDB.id, user.id);
                        } catch (error) {
                            Adminizer.log.error('Error creating UserNotificationAP:', error);
                        }
                    }
                }

                const event: INotificationEvent = {
                    type: 'notification',
                    data: {
                        ...notificationDB.toJSON(),
                        read: false,
                        icon: {
                            icon: this.icon,
                            iconColor: this.iconColor
                        },
                    } as INotification,
                    notificationClass: this.notificationClass,
                    userId: notification.userId ?? null
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
            let query: any = {notificationClass: this.notificationClass};

           // Если запрашиваются уведомления для конкретного пользователя
            if (userId) {
                if (this.adminizer.modelHandler.model.has('usernotificationap')) {
                    // Получаем ID уведомлений пользователя
                    const userNotifications = await this.adminizer.modelHandler.model.get('usernotificationap')["_find"]({
                        where: {
                            userId: userId
                        },
                        include: ['notificationap']
                    });

                    const notificationIds = userNotifications.map((un: any) => un.notificationId.id);

                    if (unreadOnly) {
                        // Только непрочитанные
                        query.id = userNotifications
                            .filter((un: any) => !un.read)
                            .map((un: any) => un.notificationId.id);
                    } else {
                        query.id = notificationIds;
                    }
                }
            }
            let notificationsDB: NotificationAPModel[];

            notificationsDB = await this.adminizer.modelHandler.model.get('notificationap')["_find"]({
                where: query,
                sort: 'createdAt DESC',
                limit
            });


            let notifications: INotification[] = [];

            for (const notification of notificationsDB) {
                let readStatus = false;

                // Получаем статус прочтения из UserNotificationAP
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
            Adminizer.log.error('Error fetching notifications:', error);
            return [];
        }
    }

    async markAsRead(id: string): Promise<void> {
        if (this.adminizer.modelHandler.model.has('usernotificationap')) {
            try {
                // Находим уведомление чтобы получить userId
                const notification = await this.adminizer.modelHandler.model.get('notificationap')["_findOne"]({
                    where: {id}
                });

                if (notification && notification.userId) {
                    // Обновляем запись в UserNotificationAP
                    const userNotification = await this.getUserNotification(id, notification.userId);
                    if (userNotification) {
                        await this.adminizer.modelHandler.model.get('usernotificationap')["_update"]({
                            id: userNotification.id
                        }, {read: true});
                    }
                }
            } catch (error) {
                Adminizer.log.error('Error marking notification as read:', error);
            }
        }
    }
}