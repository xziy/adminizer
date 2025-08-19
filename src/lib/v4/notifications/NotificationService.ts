import { EventEmitter } from 'events';
import { INotification, INotificationEvent } from '../../../interfaces/types';
import { Adminizer } from '../../Adminizer';

export class NotificationService extends EventEmitter {
    private clients: Map<string, (event: INotificationEvent) => void> = new Map();
    private adminizer: Adminizer;

    constructor(adminizer: Adminizer) {
        super();
        this.adminizer = adminizer;
    }

    // Добавление клиента
    addClient(clientId: string, sendFn: (event: INotificationEvent) => void): void {
        this.clients.set(clientId, sendFn);
        Adminizer.log.info(`Notification client ${clientId} connected. Total: ${this.clients.size}`);
    }

    // Удаление клиента
    removeClient(clientId: string): void {
        this.clients.delete(clientId);
        Adminizer.log.info(`Notification client ${clientId} disconnected. Total: ${this.clients.size}`);
    }

    // Отправка уведомления всем клиентам
    async dispatchNotification(notification: Omit<INotification, 'id' | 'createdAt' | 'read'>): Promise<string> {
        const fullNotification: INotification = {
            ...notification,
            id: this.generateId(),
            createdAt: new Date(),
            read: false
        };

        // Сохраняем в базу, если есть адаптер
        // if (this.adminizer.modelHandler.hasModel('notification')) {
        //     try {
        //         await this.adminizer.modelHandler.model.get('notification').create(fullNotification);
        //     } catch (error) {
        //         Adminizer.log.error('Error saving notification to database:', error);
        //     }
        // }

        const event: INotificationEvent = {
            type: 'notification',
            data: fullNotification
        };

        this.broadcast(event);
        Adminizer.log.info(`Notification dispatched: ${fullNotification.title}`);

        return fullNotification.id;
    }

    // Рассылка события всем клиентам
    private broadcast(event: INotificationEvent): void {
        this.clients.forEach((sendFn, clientId) => {
            try {
                sendFn(event);
            } catch (error) {
                Adminizer.log.error(`Error sending to notification client ${clientId}:`, error);
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

    // Генерация ID
    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // // Получение уведомлений из базы
    // async getNotifications(userId?: string, limit: number = 50, unreadOnly: boolean = false): Promise<INotification[]> {
    //     if (!this.adminizer.modelHandler.hasModel('notification')) {
    //         return [];
    //     }
    //
    //     try {
    //         const query: any = {};
    //         if (userId) query.userId = userId;
    //         if (unreadOnly) query.read = false;
    //
    //         const notifications = await this.adminizer.modelHandler.model.get('notification').find({
    //             where: query,
    //             sort: 'createdAt DESC',
    //             limit
    //         });
    //
    //         return notifications;
    //     } catch (error) {
    //         Adminizer.log.error('Error fetching notifications:', error);
    //         return [];
    //     }
    // }
    //
    // // Пометить как прочитанное
    // async markAsRead(id: string): Promise<void> {
    //     if (this.adminizer.modelHandler.hasModel('notification')) {
    //         try {
    //             await this.adminizer.modelHandler.model.get('notification').update({ id }, { read: true });
    //         } catch (error) {
    //             Adminizer.log.error('Error marking notification as read:', error);
    //         }
    //     }
    // }
}