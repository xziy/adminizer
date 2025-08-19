import {Adminizer} from '../../lib/Adminizer';

// SSE endpoint для уведомлений
export async function getNotificationsStream(req: ReqType, res: ResType): Promise<void> {
    // Проверяем аутентификацию
    if (req.adminizer.config.auth.enable && !req.user) {
        res.status(401).json({error: 'Unauthorized'});
        return;
    }

    // Устанавливаем заголовки для SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    const clientId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Функция для отправки событий клиенту
    const sendEvent = (event: { type: string; data: any }) => {
        res.write(`event: ${event.type}\n`);
        res.write(`data: ${JSON.stringify(event.data)}\n\n`);
    };

    // Добавляем клиента в сервис
    req.adminizer.notificationService.addClient(clientId, sendEvent);

    // Отправляем приветственное сообщение
    sendEvent({
        type: 'connected',
        data: {
            message: 'Connected to notification stream',
            clientId,
            userId: req.user?.id
        }
    });

    // Отправляем историю уведомлений
    try {
        // const notifications = await this.notificationService.getNotifications(
        //     req.user?.id,
        //     20,
        //     true
        // );

        const notifications = [
            {
                title: 'New Notification',
                id: 'new-notification 1',
                message: 'This is a test notification',
                type: 'info',
                priority: 'medium',
                timestamp: new Date().toISOString()
            }
        ]

        notifications.forEach(notification => {
            sendEvent({
                type: 'notification',
                data: notification
            });
        });
    } catch (error) {
        Adminizer.log.error('Error sending notification history:', error);
    }

    // Обработка закрытия соединения
    req.on('close', () => {
        req.adminizer.notificationService.removeClient(clientId);
        res.end();
    });

    // Heartbeat для поддержания соединения
    const heartbeatInterval = setInterval(() => {
        if (!res.writableEnded) {
            req.adminizer.notificationService.sendHeartbeat(clientId);
        } else {
            clearInterval(heartbeatInterval);
        }
    }, 30000);

    // Останавливаем heartbeat при закрытии соединения
    req.on('close', () => {
        clearInterval(heartbeatInterval);
    });
}

// API для получения уведомлений
export async function getNotifications(req: ReqType, res: ResType): Promise<void> {
    try {
        const {limit = 50, unreadOnly = false} = req.query;

        // const notifications = await this.notificationService.getNotifications(
        //     req.user?.id,
        //     Number(limit),
        //     unreadOnly === 'true'
        // );

        const notifications = [
            {
                title: 'New Notification',
                message: 'This is a test notification',
                type: 'info',
                id: 'new-notification 1',
                priority: 'medium',
                timestamp: new Date().toISOString()
            }
        ]

        res.json(notifications);
    } catch (error) {
        Adminizer.log.error('Error getting notifications:', error);
        res.status(500).json({error: 'Internal server error'});
    }
}

// API для пометки как прочитанного
export async function markAsRead(req: ReqType, res: ResType): Promise<void> {
    try {
        const {id} = req.params;
        // await this.notificationService.markAsRead(id);
        res.json({success: true});
    } catch (error) {
        Adminizer.log.error('Error marking notification as read:', error);
        res.status(500).json({error: 'Internal server error'});
    }
}

// API для отправки уведомления (админский)
export async function sendNotification(req: ReqType, res: ResType): Promise<void> {
    try {
        const {title, message, type, priority, userId} = req.body;

        const notificationId = await req.adminizer.notificationService.dispatchNotification({
            title,
            message,
            type: type || 'info',
            priority: priority || 'medium',
            userId
        });

        res.json({success: true, id: notificationId});
    } catch (error) {
        Adminizer.log.error('Error sending notification:', error);
        res.status(500).json({error: 'Internal server error'});
    }
}
