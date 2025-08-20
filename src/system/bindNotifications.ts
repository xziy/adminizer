import { Adminizer } from '../lib/Adminizer';
import { NotificationHandler } from '../lib/v4/notifications/NotificationHandler';
import { GeneralNotificationService } from '../lib/v4/notifications/GeneralNotificationService';
import { SystemNotificationService } from '../lib/v4/notifications/SystemNotificationService';

export async function bindNotifications(adminizer: Adminizer): Promise<void> {
    // Создаем хендлер
    adminizer.notificationHandler = new NotificationHandler(adminizer);

    // Регистрируем сервисы
    const generalService = new GeneralNotificationService(adminizer);
    const systemService = new SystemNotificationService(adminizer);

    adminizer.notificationHandler.registerService(generalService);
    adminizer.notificationHandler.registerService(systemService);

    Adminizer.log.info(`Notification system initialized with 2 services: ${systemService.notificationClass}, ${systemService.notificationClass}`);
}