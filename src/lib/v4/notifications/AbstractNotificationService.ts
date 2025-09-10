import {EventEmitter} from 'events';
import {Adminizer} from '../../Adminizer';
import {INotification, INotificationEvent} from '../../../interfaces/types';
import {NotificationAPModel} from "../../../models/NotificationAP";

export abstract class AbstractNotificationService extends EventEmitter {
    protected clients: Map<string, (event: INotificationEvent) => void> = new Map();
    protected adminizer: Adminizer;
    public abstract readonly notificationClass: string;
    public abstract readonly icon: string;
    public abstract readonly iconColor: string;

    constructor(adminizer: Adminizer) {
        super();
        this.adminizer = adminizer;
    }

    // Добавление клиента
    // TODO - Проверить, что клиент имеет права на получение уведомлений
    addClient(clientId: string, sendFn: (event: INotificationEvent) => void): void {
        this.clients.set(clientId, sendFn);
        Adminizer.log.info(`[${this.notificationClass}] Client ${clientId} connected. Total: ${this.clients.size}`);
    }

    // Удаление клиента
    removeClient(clientId: string): void {
        this.clients.delete(clientId);
        Adminizer.log.info(`[${this.notificationClass}] Client ${clientId} disconnected. Total: ${this.clients.size}`);
    }

    // Абстрактные методы
    // TODO - Проверить, что клиент имеет права на получение уведомлений группе
    abstract dispatchNotification(notification: Omit<INotification, 'id' | 'createdAt' | 'notificationClass' | 'icon'>): Promise<boolean>;

    // abstract getNotifications(userId?: number, limit?: number, unreadOnly?: boolean): Promise<INotification[]>;

    // Рассылка события всем клиентам
    protected broadcast(event: INotificationEvent): void {
        this.clients.forEach((sendFn, clientId) => {
            try {
                sendFn(event);
            } catch (error) {
                Adminizer.log.error(`[${this.notificationClass}] Error sending to client ${clientId}:`, error);
                this.removeClient(clientId);
            }
        });
    }

    // Отправка heartbeat
    sendHeartbeat(clientId: string): void {
        const sendFn = this.clients.get(clientId);
        if (sendFn) {
            const heartbeatEvent: INotificationEvent = {
                type: 'heartbeat',
                data: 'ping'
            };
            sendFn(heartbeatEvent);
        }
    }

    // Получение количества подключенных клиентов
    getClientCount(): number {
        return this.clients.size;
    }

    // Метод для создания записи в UserNotificationAP
    protected async createUserNotification(notificationId: string, userId?: number): Promise<void> {
        if (this.adminizer.modelHandler.model.has('usernotificationap') && userId) {
            try {
                await this.adminizer.modelHandler.model.get('usernotificationap')["_create"]({
                    userId: userId,
                    notificationId: notificationId,
                    read: false
                });
            } catch (error) {
                Adminizer.log.error(`Error creating user notification record:`, error);
            }
        }
    }

    // Метод для получения UserNotificationAP по ID уведомления и пользователя
    protected async getUserNotification(notificationId: string, userId: number): Promise<any> {
        if (this.adminizer.modelHandler.model.has('usernotificationap')) {
            try {
                return await this.adminizer.modelHandler.model.get('usernotificationap')["_findOne"]({
                    where: {notificationId: notificationId, userId: userId}
                });
            } catch (error) {
                Adminizer.log.error(`Error getting user notification:`, error);
                return null;
            }
        }
        return null;
    }

    async getNotifications(userId: number, limit: number = 20, skip: number = 0, unreadOnly: boolean = false): Promise<INotification[]> {
        if (!this.adminizer.modelHandler.model.has('notificationap')) {
            return [];
        }

        try {
            let query: any = {notificationClass: this.notificationClass};

            // Если запрашиваются уведомления для конкретного пользователя получаем ID уведомлений пользователя
            const userNotifications = await this.adminizer.modelHandler.model.get('usernotificationap')["_find"]({
                where: {
                    userId: userId
                }
            }, {populate: [['notificationId', {}]]});

            const notificationIds = userNotifications.map((un: any) => un.notificationId.id);

            if (unreadOnly) {
                // Только непрочитанные
                query.id = userNotifications
                    .filter((un: any) => !un.read)
                    .map((un: any) => un.notificationId.id);
            } else {
                query.id = notificationIds;
            }
            let notificationsDB: NotificationAPModel[];

            if (query.id.length === 0) return []

            notificationsDB = await this.adminizer.modelHandler.model.get('notificationap')["_find"]({
                where: query,
                sort: 'createdAt DESC',
                limit: limit,
                skip: skip
            });

            let notifications: INotification[] = [];

            for (const notification of notificationsDB) {
                let readStatus = false;

                // Получаем статус прочтения из UserNotificationAP
                const userNotification = await this.getUserNotification(notification.id, userId);
                readStatus = userNotification ? userNotification.read : false;

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

    async markAsRead(userId: number, id: string): Promise<void> {
        try {
            const userNotification = await this.getUserNotification(id, userId);
            if (userNotification) {
                await this.adminizer.modelHandler.model.get('usernotificationap')["_update"]({
                    id: userNotification.id
                }, {read: true});
            }
        } catch (error) {
            Adminizer.log.error('Error marking notification as read:', error);
        }
    }
}