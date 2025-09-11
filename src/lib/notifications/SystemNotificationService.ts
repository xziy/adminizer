import {AbstractNotificationService} from './AbstractNotificationService';
import {INotification, INotificationEvent} from '../../interfaces/types';
import {Adminizer} from '../Adminizer';
import {NotificationAPModel} from "../../models/NotificationAP";

export class SystemNotificationService extends AbstractNotificationService {
    public readonly notificationClass = 'system';
    public readonly icon: string = 'settings'
    public readonly iconColor: string = '#1eb707';

    // Изменяем структуру каналов: храним по userId -> channel -> clientIds
    private crudChannels: Map<number, Map<string, Set<string>>> = new Map();

    async dispatchNotification(notification: Omit<INotification, 'id' | 'createdAt' | 'notificationClass' | 'icon'>): Promise<boolean> {
        const fullNotification: Omit<INotification, 'id' | 'createdAt' | 'icon'> = {
            ...notification,
            notificationClass: this.notificationClass,
            channel: notification.channel ?? ''
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
                        ...notificationDB,
                        icon: {
                            icon: this.icon,
                            iconColor: this.iconColor
                        },
                    } as INotification,
                    notificationClass: this.notificationClass,
                    userId: notification.userId ?? null,
                    channel: notification.channel ?? 'system'
                };

                // Отправляем на все каналы или на конкретный канал
                if (notification.channel) {
                    this.broadcastToChannel(notification.channel, event);
                } else {
                    this.broadcastToChannel('system', event);
                }

                Adminizer.log.info(`[System] Notification dispatched: ${fullNotification.title}`);
                return true;

            } catch (error) {
                Adminizer.log.error('Error saving system notification to database:', error);
            }
        }

        return false;
    }

    // Обновляем broadcastToChannel для работы с новой структурой
    private broadcastToChannel(channel: string, event: INotificationEvent): void {
        // Отправляем всем пользователям, подписанным на этот канал
        this.crudChannels.forEach((userChannels, userId) => {
            const channelClients = userChannels.get(channel);
            if (channelClients) {
                const userClients = this.clients.get(userId);
                if (userClients) {
                    channelClients.forEach(clientId => {
                        const sendFn = userClients.get(clientId);
                        if (sendFn) {
                            try {
                                sendFn(event);
                            } catch (error) {
                                Adminizer.log.error(`[${this.notificationClass}] Error sending to client ${clientId} on channel ${channel}:`, error);
                                this.removeClient(clientId);
                            }
                        }
                    });
                }
            }
        });
    }

    // Добавляем клиента к каналу с привязкой к пользователю
    addClientToChannel(clientId: string, channel: string, userId: number): void {
        if (!this.crudChannels.has(userId)) {
            this.crudChannels.set(userId, new Map());
        }

        const userChannels = this.crudChannels.get(userId)!;
        if (!userChannels.has(channel)) {
            userChannels.set(channel, new Set());
        }

        userChannels.get(channel)!.add(clientId);
        Adminizer.log.info(`[${this.notificationClass}] Client ${clientId} (user ${userId}) added to channel ${channel}`);
    }

    // Удаляем клиента из канала конкретного пользователя
    removeClientFromChannel(clientId: string, channel: string, userId: number): void {
        const userChannels = this.crudChannels.get(userId);
        if (userChannels) {
            const channelClients = userChannels.get(channel);
            if (channelClients) {
                channelClients.delete(clientId);
                Adminizer.log.info(`[${this.notificationClass}] Client ${clientId} (user ${userId}) removed from channel ${channel}`);

                // Если в канале больше нет клиентов - удаляем канал
                if (channelClients.size === 0) {
                    userChannels.delete(channel);
                }
            }

            // Если у пользователя больше нет каналов - удаляем запись пользователя
            if (userChannels.size === 0) {
                this.crudChannels.delete(userId);
            }
        }
    }

    // Удаляем клиента из всех каналов пользователя
    removeClientFromAllChannels(clientId: string, userId: number): void {
        const userChannels = this.crudChannels.get(userId);
        if (userChannels) {
            userChannels.forEach((clients, channel) => {
                clients.delete(clientId);
                Adminizer.log.info(`[${this.notificationClass}] Client ${clientId} (user ${userId}) removed from channel ${channel}`);

                // Если в канале больше нет клиентов - удаляем канал
                if (clients.size === 0) {
                    userChannels.delete(channel);
                }
            });

            // Если у пользователя больше нет каналов - удаляем запись пользователя
            if (userChannels.size === 0) {
                this.crudChannels.delete(userId);
            }
        }
    }

    // Переопределяем removeClient для очистки каналов
    removeClient(clientId: string): void {
        // Находим userId по clientId
        let foundUserId: number | null = null;
        for (const [userId, userClients] of this.clients.entries()) {
            if (userClients.has(clientId)) {
                foundUserId = userId;
                break;
            }
        }

        // Удаляем клиента из основного хранилища
        super.removeClient(clientId);

        // Удаляем клиента из каналов
        if (foundUserId !== null) {
            this.removeClientFromAllChannels(clientId, foundUserId);
        }
    }

    // Специальный метод для системных событий с указанием канала
    async logSystemEvent(title: string, message: string, channel?: string, metadata?: Record<string | number, any>): Promise<boolean> {
        return this.dispatchNotification({
            title: title,
            message: message,
            metadata: metadata,
            channel: channel
        });
    }

    // Методы для CRUD операций
    async logCreatedEvent(title: string, message: string, metadata?: Record<string | number, any>): Promise<boolean> {
        return this.logSystemEvent(title, message, 'created', metadata);
    }

    async logUpdatedEvent(title: string, message: string, metadata?: Record<string | number, any>): Promise<boolean> {
        return this.logSystemEvent(title, message, 'updated', metadata);
    }

    async logDeletedEvent(title: string, message: string, metadata?: Record<string | number, any>): Promise<boolean> {
        return this.logSystemEvent(title, message, 'deleted', metadata);
    }

    // Новый метод для получения каналов пользователя
    getUserChannels(userId: number): Map<string, Set<string>> {
        return this.crudChannels.get(userId) || new Map();
    }
}