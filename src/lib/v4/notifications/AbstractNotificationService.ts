import { EventEmitter } from 'events';
import { Adminizer } from '../../Adminizer';
import { INotification, INotificationEvent, INotificationService } from '../../../interfaces/types';

export abstract class AbstractNotificationService extends EventEmitter implements INotificationService {
    protected clients: Map<string, (event: INotificationEvent) => void> = new Map();
    protected adminizer: Adminizer;
    public abstract readonly notificationClass: string;

    constructor(adminizer: Adminizer) {
        super();
        this.adminizer = adminizer;
    }

    // Добавление клиента
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
    abstract dispatchNotification(notification: Omit<INotification, 'id' | 'createdAt' | 'read' | 'notificationClass'>): Promise<string>;
    abstract getNotifications(userId?: number, limit?: number, unreadOnly?: boolean): Promise<INotification[]>;
    abstract markAsRead(id: string): Promise<void>;

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

    // Генерация ID
    protected generateId(): string {
        return `${this.notificationClass}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Получение количества подключенных клиентов
    getClientCount(): number {
        return this.clients.size;
    }
}