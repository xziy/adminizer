import { Adminizer } from '../../lib/Adminizer';
import {UserAP} from "../../models/UserAP";

export class NotificationController {

    // Единый SSE endpoint для всех уведомлений
    static async getNotificationsStream(req: ReqType, res: ResType): Promise<void> {
        if (!req.adminizer?.notificationHandler) {
            res.status(500).json({ error: 'Notification system not initialized' });
            return;
        }

        // Проверяем аутентификацию
        if (req.adminizer.config.auth.enable && !req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        // Устанавливаем заголовки для SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.flushHeaders();

        const clientId = `user-${req.user?.id}-${Date.now()}`;

        // Функция для отправки событий клиенту
        const sendEvent = (event: any) => {
            // Фильтруем уведомления по правам пользователя
            if (event.type === 'notification' && event.notificationClass === 'system') {
                // Системные уведомления только для админов
                if (!NotificationController.isAdmin(req.user)) {
                    return;
                }
            }

            res.write(`event: ${event.type}\n`);
            res.write(`data: ${JSON.stringify(event.data)}\n\n`);
        };

        // Подключаем клиента ко всем сервисам
        const services = req.adminizer.notificationHandler.getAllServices();
        services.forEach(service => {
            (service as any).addClient(clientId, sendEvent);
        });

        // Отправляем приветственное сообщение
        sendEvent({
            type: 'connected',
            data: {
                message: 'Connected to unified notification stream',
                clientId,
                userId: req.user?.id,
                userIsAdmin: NotificationController.isAdmin(req.user)
            }
        });

        // Отправляем историю уведомлений (с учетом прав доступа)
        try {
            const notifications = await req.adminizer.notificationHandler.getUserNotifications(
                req.user,
                20,
                true
            );

            notifications.forEach(notification => {
                sendEvent({
                    type: 'notification',
                    data: notification,
                    notificationClass: notification.notificationClass
                });
            });
        } catch (error) {
            Adminizer.log.error('Error sending notification history:', error);
        }

        // Обработка закрытия соединения
        req.on('close', () => {
            // Отключаем клиента от всех сервисов
            services.forEach(service => {
                (service as any).removeClient(clientId);
            });
            res.end();
        });

        // Heartbeat для поддержания соединения
        const heartbeatInterval = setInterval(() => {
            if (!res.writableEnded) {
                services.forEach(service => {
                    (service as any).sendHeartbeat(clientId);
                });
            } else {
                clearInterval(heartbeatInterval);
            }
        }, 30000);

        req.on('close', () => {
            clearInterval(heartbeatInterval);
        });
    }

    // API для получения уведомлений по классу
    static async getNotificationsByClass(req: ReqType, res: ResType): Promise<void> {
        if (!req.adminizer?.notificationHandler) {
            res.status(500).json({ error: 'Notification system not initialized' });
            return;
        }

        try {
            const { notificationClass } = req.params;
            const { limit = 50, unreadOnly = false } = req.query;

            // Проверяем права доступа для системных уведомлений
            if (notificationClass === 'system' && !NotificationController.isAdmin(req.user)) {
                res.status(403).json({ error: 'Forbidden: Admin access required' });
                return;
            }

            const notifications = await req.adminizer.notificationHandler.getNotifications(
                notificationClass,
                req.user?.id,
                Number(limit),
                unreadOnly === 'true'
            );

            res.json(notifications);
        } catch (error) {
            Adminizer.log.error('Error getting notifications:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // API для получения всех уведомлений пользователя
    static async getUserNotifications(req: ReqType, res: ResType): Promise<void> {
        if (!req.adminizer?.notificationHandler) {
            res.status(500).json({ error: 'Notification system not initialized' });
            return;
        }

        try {
            const { limit = 50, unreadOnly = false } = req.query;

            const notifications = await req.adminizer.notificationHandler.getUserNotifications(
                req.user,
                Number(limit),
                unreadOnly === 'true'
            );

            res.json(notifications);
        } catch (error) {
            Adminizer.log.error('Error getting user notifications:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // API для пометки как прочитанного
    static async markAsRead(req: ReqType, res: ResType): Promise<void> {
        if (!req.adminizer?.notificationHandler) {
            res.status(500).json({ error: 'Notification system not initialized' });
            return;
        }

        try {
            const { notificationClass, id } = req.params;

            // Проверяем права доступа для системных уведомлений
            if (notificationClass === 'system' && !NotificationController.isAdmin(req.user)) {
                res.status(403).json({ error: 'Forbidden: Admin access required' });
                return;
            }

            await req.adminizer.notificationHandler.markAsRead(notificationClass, id);
            res.json({ success: true });
        } catch (error) {
            Adminizer.log.error('Error marking notification as read:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // API для отправки уведомления
    static async sendNotification(req: ReqType, res: ResType): Promise<void> {
        if (!req.adminizer?.notificationHandler) {
            res.status(500).json({ error: 'Notification system not initialized' });
            return;
        }

        // Проверяем права админа
        if (!NotificationController.isAdmin(req.user)) {
            res.status(403).json({ error: 'Forbidden: Admin access required' });
            return;
        }

        try {
            const { title, message, type, priority, userId, notificationClass = 'general' } = req.body;

            const notificationId = await req.adminizer.notificationHandler.dispatchNotification(
                notificationClass,
                { title, message, userId }
            );

            res.json({ success: true, id: notificationId });
        } catch (error) {
            Adminizer.log.error('Error sending notification:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // Проверка прав администратора
    private static isAdmin(user: UserAP): boolean {
        if (!user) return false;
        return user.isAdministrator === true;
    }
}