export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';
export type NotificationType = 'info' | 'warning' | 'error' | 'success';

export interface INotification {
    id: string;
    title: string;
    message: string;
    type: NotificationType;
    priority: NotificationPriority;
    createdAt: Date;
    read: boolean;
    metadata?: Record<string, any>;
}

export interface INotificationOptions {
    ttl?: number; // Время жизни в секундах
    persistent?: boolean; // Должно ли уведомление сохраняться после перезагрузки
    action?: {
        label: string;
        url: string;
    };
}

export abstract class AbstractNotificationService {
    /**
     * Отправка уведомления
     * @param title Заголовок уведомления
     * @param message Текст уведомления
     * @param type Тип уведомления
     * @param priority Приоритет
     * @param options Дополнительные опции
     */
    public abstract send(
        title: string,
        message: string,
        type: NotificationType,
        priority: NotificationPriority,
        options?: INotificationOptions
    ): Promise<string>;

    /**
     * Получение списка уведомлений
     * @param limit Максимальное количество уведомлений
     * @param unreadOnly Только непрочитанные
     */
    public abstract list(limit?: number, unreadOnly?: boolean): Promise<INotification[]>;

    /**
     * Пометить уведомление как прочитанное
     * @param id ID уведомления
     */
    public abstract markAsRead(id: string): Promise<void>;

    /**
     * Удаление уведомления
     * @param id ID уведомления
     */
    public abstract delete(id: string): Promise<void>;

    /**
     * Очистка старых уведомлений
     */
    public abstract cleanup(): Promise<number>;

    /**
     * Генерация ID для нового уведомления
     */
    protected generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Валидация уведомления перед отправкой
     */
    protected validateNotification(title: string, message: string): void {
        if (!title || !message) {
            throw new Error('Title and message are required');
        }

        if (title.length > 100) {
            throw new Error('Title is too long');
        }

        if (message.length > 1000) {
            throw new Error('Message is too long');
        }
    }
}