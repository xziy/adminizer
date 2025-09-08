import {AbstractNotificationService} from './AbstractNotificationService';
import {INotification, INotificationEvent} from '../../../interfaces/types';
import {Adminizer} from '../../Adminizer';
import {NotificationAPModel} from "../../../models/NotificationAP";

export class SystemNotificationService extends AbstractNotificationService {
    public readonly notificationClass = 'system';
    public readonly icon: string = 'settings'
    public readonly iconColor: string = '#1eb707';

    // Добавляем каналы для CRUD операций
    private crudChannels: Map<string, Set<string>> = new Map();

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
                // Idia how to keep in DB notification raw data ['user %s created %s in model %s', user, instance.name, modelName] as print_f()
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
                    channel: notification.channel ?? 'system' // Добавляем информацию о канале
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

    // Метод для отправки на конкретный канал
    private broadcastToChannel(channel: string, event: INotificationEvent): void {
        const channelClients = this.crudChannels.get(channel);
        if (channelClients) {
            channelClients.forEach(clientId => {
                const sendFn = this.clients.get(clientId);
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

    // Добавляем клиента к каналу
    addClientToChannel(clientId: string, channel: string): void {
        if (!this.crudChannels.has(channel)) {
            this.crudChannels.set(channel, new Set());
        }
        this.crudChannels.get(channel)!.add(clientId);
        Adminizer.log.info(`[${this.notificationClass}] Client ${clientId} added to channel ${channel}`);
    }

    // Удаляем клиента из канала
    removeClientFromChannel(clientId: string, channel: string): void {
        const channelClients = this.crudChannels.get(channel);
        if (channelClients) {
            channelClients.delete(clientId);
            Adminizer.log.info(`[${this.notificationClass}] Client ${clientId} removed from channel ${channel}`);
        }
    }

    // Удаляем клиента из всех каналов
    removeClientFromAllChannels(clientId: string): void {
        this.crudChannels.forEach((clients, channel) => {
            clients.delete(clientId);
            Adminizer.log.info(`[${this.notificationClass}] Client ${clientId} removed from channel ${channel}`);
        });
    }

    // Переопределяем removeClient для очистки каналов
    removeClient(clientId: string): void {
        super.removeClient(clientId);
        this.removeClientFromAllChannels(clientId);
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
}