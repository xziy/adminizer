import { Widget, WidgetLayoutItem } from "@/types";
import axios from "axios";

// Ключ для хранения данных в localStorage

export async function initializeWidgets(): Promise<{
    layout: WidgetLayoutItem[];
    widgets: Widget[];
}> {
    try {
        // 1. Пытаемся получить данные из localStorage
        const storedData = localStorage.getItem('widgetsData');
        let storedWidgets: Widget[] = [];
        let storedLayout: WidgetLayoutItem[] = [];

        if (storedData) {
            try {
                const parsedData = JSON.parse(storedData);
                storedWidgets = parsedData.widgets || [];
                storedLayout = parsedData.layout || [];
            } catch (e) {
                console.error('Ошибка при разборе данных из localStorage', e);
            }
        }

        // 2. Получаем данные с сервера
        const widgetsDBResponse = await axios.get(`${window.routePrefix}/widgets-get-all-db`);
        let widgetsDB = widgetsDBResponse.data?.widgetsDB?.widgets as Widget[] ?? [];
        let layoutDB = widgetsDBResponse.data?.widgetsDB?.layout ?? [];

        const widgetsResponse = await axios.get(`${window.routePrefix}/widgets-get-all`);
        const allWidgets = widgetsResponse.data.widgets as Widget[];

        // 3. Сравниваем виджеты из БД и localStorage
        const dbWidgetIds = widgetsDB.map(w => w.id).sort();
        const storedWidgetIds = storedWidgets.map(w => w.id).sort();

        // Проверяем, совпадают ли массивы ID
        const idsMatch =
            dbWidgetIds.length === storedWidgetIds.length &&
            dbWidgetIds.every((id, index) => id === storedWidgetIds[index]);

        let finalWidgetsDB = widgetsDB;
        let finalLayoutDB = layoutDB;

        if (idsMatch && storedWidgets.length > 0) {
            // Если ID совпадают - используем данные из localStorage
            finalWidgetsDB = storedWidgets;
            finalLayoutDB = storedLayout;
        } else {
            // Если данные изменились - сохраняем в localStorage
            const dataToStore = {
                widgets: widgetsDB,
                layout: layoutDB
            };
            localStorage.setItem('widgetsData', JSON.stringify(dataToStore));
        }

        // 4. Инициализируем виджеты, отмечая добавленные
        const initWidgets = allWidgets.map(widget => {
            const findItem = finalWidgetsDB.find((e: any) => e.id === widget.id);
            return findItem && findItem.added ? { ...widget, added: true } : widget;
        });

        return {
            layout: finalLayoutDB,
            widgets: initWidgets
        };
    } catch (error) {
        console.error('Ошибка при инициализации виджетов:', error);
        throw error;
    }
}
