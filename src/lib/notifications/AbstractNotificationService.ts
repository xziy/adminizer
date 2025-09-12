import {EventEmitter} from 'events';
import {Adminizer} from '../Adminizer';
import {INotification, INotificationEvent} from '../../interfaces/types';
import {NotificationAPModel} from "../../models/NotificationAP";
import {UserAP} from "../../models/UserAP";

export abstract class AbstractNotificationService extends EventEmitter {
    protected clients: Map<number, Map<string, (event: INotificationEvent) => void>> = new Map();
    protected adminizer: Adminizer;
    public abstract readonly notificationClass: string;
    public abstract readonly icon: string;
    public abstract readonly iconColor: string;

    constructor(adminizer: Adminizer) {
        super();
        this.adminizer = adminizer;
        this._bindAccessRight()
    }

    private _bindAccessRight() {
        setTimeout(() => {
            this.adminizer.accessRightsHelper.registerToken({
                id: `notification-${this.notificationClass}`,
                name: this.notificationClass,
                description: `Access to notification ${this.notificationClass}`,
                department: 'notification',
            });
        }, 100)
    }

    // Добавление клиента
    addClient(clientId: string, sendFn: (event: INotificationEvent) => void, user: UserAP): void {
        const userId = user.id;

        // Если у пользователя еще нет Map клиентов - создаем
        if (!this.clients.has(userId)) {
            this.clients.set(userId, new Map());
        }

        // Получаем Map клиентов пользователя и добавляем нового клиента
        const userClients = this.clients.get(userId)!;
        userClients.set(clientId, sendFn);

        Adminizer.log.info(`[${this.notificationClass}] Client ${clientId} connected for user ${userId}. Total users: ${this.clients.size}, user clients: ${userClients.size}`);
    }


    // Удаление клиента
    removeClient(clientId: string): void {
        // Ищем клиента во всех пользовательских Map
        for (const [userId, userClients] of this.clients.entries()) {
            if (userClients.has(clientId)) {
                userClients.delete(clientId);

                // Если у пользователя больше нет клиентов - удаляем его Map
                if (userClients.size === 0) {
                    this.clients.delete(userId);
                }

                Adminizer.log.info(`[${this.notificationClass}] Client ${clientId} disconnected from user ${userId}. Total users: ${this.clients.size}`);
                return;
            }
        }

        Adminizer.log.warn(`[${this.notificationClass}] Client ${clientId} not found for removal`);
    }

    // Получение клиентов конкретного пользователя
    getUserClients(userId: number): Map<string, (event: INotificationEvent) => void> {
        return this.clients.get(userId) || new Map();
    }

    // Получение количества подключенных клиентов
    getClientCount(): number {
        return this.clients.size;
    }

    // Получение всех клиентов (для обратной совместимости)
    getAllClients(): Map<string, (event: INotificationEvent) => void> {
        const allClients = new Map();
        for (const userClients of this.clients.values()) {
            for (const [clientId, sendFn] of userClients.entries()) {
                allClients.set(clientId, sendFn);
            }
        }
        return allClients;
    }


    // Абстрактные методы
    abstract dispatchNotification(notification: Omit<INotification, 'id' | 'createdAt' | 'notificationClass' | 'icon'>): Promise<boolean>;

    // Рассылка события всем клиентам
    protected broadcast(event: INotificationEvent): void {
        for (const userClients of this.clients.values()) {
            userClients.forEach((sendFn, clientId) => {
                try {
                    sendFn(event);
                } catch (error) {
                    Adminizer.log.error(`[${this.notificationClass}] Error sending to client ${clientId}:`, error);
                    this.removeClient(clientId);
                }
            });
        }
    }

    // Отправка heartbeat
    sendHeartbeat(clientId: string): void {
        for (const userClients of this.clients.values()) {
            const sendFn = userClients.get(clientId);
            if (sendFn) {
                const heartbeatEvent: INotificationEvent = {
                    type: 'heartbeat',
                    data: 'ping'
                };
                sendFn(heartbeatEvent);
                return;
            }
        }
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

            if (query.id.length === 0) return []

            const notificationsDB: NotificationAPModel[] = await this.adminizer.modelHandler.model.get('notificationap')["_find"]({
                where: query,
                sort: 'createdAt DESC',
                limit: limit,
                skip: skip
            });

            return await this.prepareNotification(notificationsDB, userId);

        } catch (error) {
            Adminizer.log.error('Error fetching notifications:', error);
            return [];
        }
    }

    protected async prepareNotification(notificationsDB: NotificationAPModel[], userId: number): Promise<INotification[]> {
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
    }

    async search(s: string, userId: number): Promise<INotification[]> {
        try {
            const userNotifications = await this.adminizer.modelHandler.model.get('usernotificationap')["_find"]({
                where: {
                    userId: userId
                }
            }, {populate: [['notificationId', {}]]});

            const notificationIds = userNotifications.map((un: any) => un.notificationId.id);

            if (notificationIds.length === 0) return []

            const notificationsDB: NotificationAPModel[] = await this.adminizer.modelHandler.model.get('notificationap')["_find"]({
                where: {
                    message: {contains: s},
                    id: notificationIds,
                    notificationClass: this.notificationClass
                },
                sort: "createdAt DESC"
            });

            return await this.prepareNotification(notificationsDB, userId);
        } catch (error) {
            Adminizer.log.error('Error searching notifications:', error);
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

    async markAllAsRead(userId: number): Promise<void> {
        try {
            const userNotifications = await this.adminizer.modelHandler.model.get('usernotificationap')["_find"]({
                where: {userId: userId}
            });
            for (const userNotification of userNotifications) {
                await this.adminizer.modelHandler.model.get('usernotificationap')["_update"]({
                    where: {id: userNotification.id},
                }, {read: true});
            }
        } catch (error) {
            Adminizer.log.error('Error marking all notifications as read:', error);
        }
    }


}