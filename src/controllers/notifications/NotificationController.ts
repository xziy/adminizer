import {Adminizer} from '../../lib/Adminizer';
import {UserAP} from "../../models/UserAP";
import {SystemNotificationService} from "../../lib/notifications/SystemNotificationService";
import {INotification} from "../../interfaces/types";

export class NotificationController {
    static async search(req: ReqType, res: ResType) {
        NotificationController.checkNotifPermission(req, res)

        if (req.method.toUpperCase() === 'POST') {
            const {s, notificationClass} = req.body;
            const hasPermission = req.adminizer.accessRightsHelper.hasPermission(
                `notification-${notificationClass}`,
                req.user
            );

            if (!hasPermission) {
                res.status(403).json({error: 'Forbidden'});
                return;
            }

            const service = req.adminizer.notificationHandler.getService(notificationClass);

            res.json(await service.search(s, req.user.id));
        }
    }

    static async viewAll(req: ReqType, res: ResType) {
        NotificationController.checkNotifPermission(req, res)

        if (req.method.toUpperCase() === 'POST') {
            const messages = {
                "Make read": "",
                "View All": "",
                "Search": "",
                "Make all read": "",
                "Title": "",
                "Message": "",
                "Date": "",
                "Diff": "",
                "The end of the list has been reached": "",
            };

            return res.json(Object.fromEntries(
                Object.keys(messages).map(key => [key, req.i18n.__(key)])
            ));
        }

        if (req.method.toUpperCase() === 'GET') {
            return req.Inertia.render({
                component: 'notification',
                props: {
                    title: req.i18n.__('Notifications'),
                }
            });
        }

        return res.status(405)
    }

    static async getNotificationClasses(req: ReqType, res: ResType) {
        NotificationController.checkNotifPermission(req, res)

        if (req.adminizer.config.notifications.enabled === false) return res.json([])

        const services = req.adminizer.notificationHandler.getAllServices();
        let activeServices = []

        for (const service of services) {
            // Получаем только клиентов текущего пользователя
            const userClients = service.getUserClients(req.user.id);

            if (userClients.size > 0) {
                activeServices.push({
                    displayName: req.i18n.__(service.displayName),
                    notificationClass: service.notificationClass,
                });
            }
        }
        return res.json({
            activeServices: activeServices,
            initTab: req.adminizer.config?.notifications?.initTab || null
        })
    }

    // Единый SSE endpoint для всех уведомлений
    static async getNotificationsStream(req: ReqType, res: ResType): Promise<void> {
        NotificationController.checkNotifPermission(req, res)

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
            if (event.type === 'notification') {
                const notificationClass = event.notificationClass;

                // ЕДИНАЯ проверка прав через AccessRightsHelper
                const hasPermission = req.adminizer.accessRightsHelper.hasPermission(
                    `notification-${notificationClass}`,
                    req.user
                );

                if (!hasPermission) {
                    return; // Пользователь не имеет прав на этот класс уведомлений
                }

                // Проверка персональных уведомлений (только для целевого пользователя)
                if (event.userId !== null && event.userId !== req.user.id) {
                    return;
                }
            }

            res.write(`event: ${event.type}\n`);
            res.write(`data: ${JSON.stringify(event.data)}\n\n`);
        };

        // Подключаем клиента ко всем сервисам
        const services = req.adminizer.notificationHandler.getAllServices();
        const allowedServices = services.filter(service =>
            req.adminizer.accessRightsHelper.hasPermission(
                `notification-${service.notificationClass}`,
                req.user
            )
        );
        allowedServices.forEach(service => {
            service.addClient(clientId, sendEvent, req.user);

            // Для системного сервиса добавляем клиента в CRUD каналы
            // if (service.notificationClass === 'system') {
            //     const systemService = service as SystemNotificationService;
            //     // Добавляем клиента в основные CRUD каналы с указанием userId
            //     ['created', 'updated', 'deleted', 'system'].forEach(channel => {
            //         systemService.addClientToChannel(clientId, channel, req.user.id);
            //     });
            // }
        });

        // Отправляем приветственное сообщение
        sendEvent({
            type: 'connected',
            data: {
                message: 'Connected to unified notification stream',
                clientId: clientId
            }
        });

        // Обработка закрытия соединения
        req.on('close', () => {
            // Отключаем клиента от всех сервисов
            services.forEach(service => {
                service.removeClient(clientId);

                // Для системного сервиса удаляем из всех каналов
                // if (service.notificationClass === 'system') {
                //     const systemService = service as SystemNotificationService;
                //     if (systemService.removeClientFromAllChannels) {
                //         systemService.removeClientFromAllChannels(clientId, req.user.id);
                //     }
                // }
            });
            res.end();
        });

        // Heartbeat для поддержания соединения
        const heartbeatInterval = setInterval(() => {
            if (!res.writableEnded) {
                services.forEach(service => {
                    service.sendHeartbeat(clientId);
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
    static async getNotificationsByClass(req: ReqType, res: ResType) {
        NotificationController.checkNotifPermission(req, res)

        try {
            const {notificationClass} = req.params;
            const {limit = 20, skip = 0, unreadOnly = false} = req.query;

            // Проверяем права доступа
            const hasPermission = req.adminizer.accessRightsHelper.hasPermission(
                `notification-${notificationClass}`,
                req.user
            );

            if (!hasPermission) {
                return res.status(403).json({error: 'Forbidden'});
            }
            const service = req.adminizer.notificationHandler.getService(notificationClass);

            if(!service) return  res.json({})

            const notifications = await service.getNotifications(
                req.user?.id,
                Number(limit),
                Number(skip),
                unreadOnly === 'true'
            );

            return res.json(notifications);
        } catch (error) {
            Adminizer.log.error('Error getting notifications:', error);
            return  res.status(500).json({error: 'Internal server error'});
        }
    }

    // API для получения всех уведомлений пользователя
    static async getUserNotifications(req: ReqType, res: ResType): Promise<void> {
        NotificationController.checkNotifPermission(req, res);

        const {limit = 4, skip = 0, unreadOnly = false} = req.query;

        try {
            // Фильтруем сервисы по правам доступа
            const services = req.adminizer.notificationHandler.getAllServices();
            const allowedServices = services.filter(service =>
                req.adminizer.accessRightsHelper.hasPermission(
                    `notification-${service.notificationClass}`,
                    req.user
                )
            );

            const allNotifications: INotification[] = [];

            for (const service of allowedServices) {
                const notifications = await service.getNotifications(
                    req.user.id,
                    Number(limit),
                    Number(skip),
                    unreadOnly === 'true'
                );
                allNotifications.push(...notifications);
            }

            // Сортируем по дате создания
            const sortedNotifications = allNotifications.sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            ).slice(0, Number(limit));

            res.json(sortedNotifications);

        } catch (error) {
            Adminizer.log.error('Error getting user notifications:', error);
            res.status(500).json({error: 'Internal server error'});
        }
    }

    // API для пометки как прочитанного
    static async markAsRead(req: ReqType, res: ResType): Promise<void> {
        NotificationController.checkNotifPermission(req, res)

        try {
            const {notificationClass, id} = req.params;

            const service = req.adminizer.notificationHandler.getService(notificationClass);
            await service.markAsRead(req.user.id, id);

            res.json({success: true});
        } catch (error) {
            Adminizer.log.error('Error marking notification as read:', error);
            res.status(500).json({error: 'Internal server error'});
        }
    }

    static async markAllAsRead(req: ReqType, res: ResType): Promise<void> {
        NotificationController.checkNotifPermission(req, res)

        try {
            const services = req.adminizer.notificationHandler.getAllServices();

            for (const service of services) {
                await service.markAllAsRead(req.user.id);
            }
            res.json({success: true});
        } catch (error) {
            Adminizer.log.error('Error marking all notifications as read:', error);
            res.status(500).json({error: 'Internal server error'});
        }
    }

    private static checkNotifPermission(req: ReqType, res: ResType): void {
        if (!req.adminizer?.notificationHandler) {
            res.status(500).json({error: 'Notification system not initialized'});
            return;
        }
        // // Проверяем аутентификацию
        if (req.adminizer.config.auth.enable && !req.user) {
            res.status(401).json({error: 'Unauthorized'});
            return;
        }
    }
}