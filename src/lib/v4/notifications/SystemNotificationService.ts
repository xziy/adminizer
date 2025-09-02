import {AbstractNotificationService} from './AbstractNotificationService';
import {INotification, INotificationEvent} from '../../../interfaces/types';
import {Adminizer} from '../../Adminizer';
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

                const users = await this.adminizer.modelHandler.model.get('userap')["_find"]({isAdministrator: 1});
                for (const user of users) {
                    try {
                        await this.createUserNotification(notificationDB.id, user.id);
                    } catch (error) {
                        Adminizer.log.error('Error creating UserNotificationAP:', error);
                    }
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

    // Специальный метод для системных событий
    async logSystemEvent(title: string, message: string, metadata?: Record<string | number, any>): Promise<boolean> {
        return this.dispatchNotification({
            title: title,
            message: message,
            metadata: metadata
        });
    }
}