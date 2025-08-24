import { EventEmitter } from 'events';
import { Adminizer } from '../../Adminizer';
import { INotification, INotificationService } from '../../../interfaces/types';
import {UserAP} from "../../../models/UserAP";

export class NotificationHandler extends EventEmitter {
    private services: Map<string, INotificationService> = new Map();

    constructor() {
        super();
    }

    // Регистрация сервиса
    registerService(service: INotificationService): void {
        this.services.set(service.notificationClass, service);
        Adminizer.log.info(`Notification service registered: ${service.notificationClass}`);
    }

    // TODO - Добавить метод для удаления сервиса

    // Получение сервиса по классу
    getService(notificationClass: string): INotificationService | undefined {
        return this.services.get(notificationClass);
    }

    // Получение всех сервисов
    getAllServices(): INotificationService[] {
        return Array.from(this.services.values());
    }

    // Отправка уведомления в конкретный сервис
    async dispatchNotification(
        notificationClass: string,
        notification: Omit<INotification, 'id' | 'createdAt' | 'read' | 'notificationClass'>
    ): Promise<string> {
        const service = this.getService(notificationClass);
        if (!service) {
            throw new Error(`Notification service not found: ${notificationClass}`);
        }
        return service.dispatchNotification(notification);
    }

    // Получение уведомлений из конкретного сервиса
    async getNotifications(
        notificationClass: string,
        userId?: number,
        limit?: number,
        unreadOnly?: boolean
    ): Promise<INotification[]> {
        const service = this.getService(notificationClass);
        if (!service) {
            throw new Error(`Notification service not found: ${notificationClass}`);
        }
        return service.getNotifications(userId, limit, unreadOnly);
    }

    // Получение всех уведомлений пользователя (с учетом прав доступа)
    async getUserNotifications(user: any, limit: number = 50, unreadOnly: boolean = false): Promise<INotification[]> {
        const allNotifications: INotification[] = [];

        for (const service of this.getAllServices()) {
            // Для системных уведомлений проверяем права админа
            if (service.notificationClass === 'system') {
                if (this.isAdmin(user)) {
                    const notifications = await service.getNotifications(undefined, limit, unreadOnly);
                    allNotifications.push(...notifications);
                }
            } else {
                // Для остальных уведомлений получаем по пользователю
                const notifications = await service.getNotifications(user?.id, limit, unreadOnly);
                allNotifications.push(...notifications);
            }
        }

        // Сортируем по дате создания
        return allNotifications.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ).slice(0, limit);
    }

    // Пометить как прочитанное
    async markAsRead(notificationClass: string, id: string): Promise<void> {
        const service = this.getService(notificationClass);
        if (!service) {
            throw new Error(`Notification service not found: ${notificationClass}`);
        }
        return service.markAsRead(id);
    }

    // Проверка прав администратора
    private isAdmin(user: UserAP): boolean {
        if (!user) return false;
        return user.isAdministrator === true;
    }

    // Получение количества клиентов по сервису
    getClientCount(notificationClass: string): number {
        const service = this.getService(notificationClass);
        return service ? service.getClientCount() : 0;
    }

    // Получение общего количества клиентов
    getTotalClientCount(): number {
        return this.getAllServices().reduce((total, service) =>
            total + service.getClientCount(), 0
        );
    }
}