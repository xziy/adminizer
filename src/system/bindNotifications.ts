import { Adminizer } from '../lib/Adminizer';
import { NotificationHandler } from '../lib/notifications/NotificationHandler';
import { GeneralNotificationService } from '../lib/notifications/GeneralNotificationService';
import { SystemNotificationService } from '../lib/notifications/SystemNotificationService';

export async function bindNotifications(adminizer: Adminizer): Promise<void> {
    // Создаем хендлер
    adminizer.notificationHandler = new NotificationHandler();

    // Регистрируем сервисы
    const generalService = new GeneralNotificationService(adminizer);
    const systemService = new SystemNotificationService(adminizer);

    adminizer.notificationHandler.registerService(generalService);
    adminizer.notificationHandler.registerService(systemService);

    Adminizer.log.info(`Notification system initialized with 2 services: ${systemService.notificationClass}, ${systemService.notificationClass}`);
}