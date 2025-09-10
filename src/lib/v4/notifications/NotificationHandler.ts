import {EventEmitter} from 'events';
import {Adminizer} from '../../Adminizer';
import {AbstractNotificationService} from "./AbstractNotificationService";
import {INotification} from '../../../interfaces/types';
import {UserAP} from "../../../models/UserAP";

export class NotificationHandler extends EventEmitter {
    private services: Map<string, AbstractNotificationService> = new Map();

    constructor() {
        super();
    }

    /**
     * Register a new notification service
     * @param service
     */
    registerService(service: AbstractNotificationService): void {
        this.services.set(service.notificationClass, service);
        Adminizer.log.info(`Notification service registered: ${service.notificationClass}`);
    }

    /**
     * Remove a notification service
     * @param notificationClass
     */
    removeService(notificationClass: string): void {
        if (this.services.has(notificationClass)) {
            this.services.delete(notificationClass);
            Adminizer.log.info(`Notification service removed: ${notificationClass}`);
        }
    }

    /**
     * Get a notification service by class
     * @param notificationClass
     */
    getService(notificationClass: string): AbstractNotificationService | undefined {
        return this.services.get(notificationClass);
    }

    /**
     * Get all registered services
     */
    getAllServices(): AbstractNotificationService[] {
        return Array.from(this.services.values());
    }

    /**
     * Dispatch a notification to a service
     * @param notificationClass
     * @param notification
     */
    async dispatchNotification(
        notificationClass: string,
        notification: Omit<INotification, 'id' | 'createdAt' | 'notificationClass' | 'icon'>
    ): Promise<boolean> {
        const service = this.getService(notificationClass);
        if (!service) {
            throw new Error(`Notification service not found: ${notificationClass}`);
        }
        return service.dispatchNotification(notification);
    }

    /**
     * Get notifications by class
     * @param notificationClass
     * @param userId
     * @param limit
     * @param skip
     * @param unreadOnly
     */
    async getNotifications(
        notificationClass: string,
        userId?: number,
        limit?: number,
        skip?: number,
        unreadOnly?: boolean
    ): Promise<INotification[]> {
        const service = this.getService(notificationClass);
        if (!service) {
            throw new Error(`Notification service not found: ${notificationClass}`);
        }
        return service.getNotifications(userId, limit, skip, unreadOnly);
    }

    /**
     * Get all notifications for a user
     * @param user
     * @param limit
     * @param skip
     * @param unreadOnly
     */
    async getUserNotifications(user: any, limit: number = 20, skip: number = 0, unreadOnly: boolean = false): Promise<INotification[]> {
        const allNotifications: INotification[] = [];
        for (const service of this.getAllServices()) {
            // Для системных уведомлений проверяем права админа
            if (service.notificationClass === 'system') {
                if (this.isAdmin(user)) {
                    const notifications = await service.getNotifications(user.id, limit, skip, unreadOnly);
                    allNotifications.push(...notifications);
                }
            } else {
                // Для остальных уведомлений получаем по пользователю
                const notifications = await service.getNotifications(user.id, limit, skip, unreadOnly);
                allNotifications.push(...notifications);
            }
        }

        // Сортируем по дате создания
        return allNotifications.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ).slice(0, limit);
    }

    /**
     * Mark a notification as read
     * @param notificationClass
     * @param id
     * @param userId
     */
    async markAsRead(notificationClass: string, id: string, userId: number): Promise<void> {
        const service = this.getService(notificationClass);
        if (!service) {
            throw new Error(`Notification service not found: ${notificationClass}`);
        }
        return service.markAsRead(userId, id);
    }

    async markAllAsRead(userId: number): Promise<void> {
        const services = this.getAllServices();
        services.forEach(service => {
            return service.markAllAsRead(userId);
        })
    }

    /**
     * Check if user is admin
     * @param user
     * @private
     */
    private isAdmin(user: UserAP): boolean {
        if (!user) return false;
        return user.isAdministrator === true;
    }

    /**
     * Get client count for a notification class
     * @param notificationClass
     */
    getClientCount(notificationClass: string): number {
        const service = this.getService(notificationClass);
        return service ? service.getClientCount() : 0;
    }

    /**
     * Get total client count
     */
    getTotalClientCount(): number {
        return this.getAllServices().reduce((total, service) =>
            total + service.getClientCount(), 0
        );
    }
}