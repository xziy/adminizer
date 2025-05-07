import ky from 'ky';
import {Widget, WidgetLayoutItem} from "@/types";


export async function initializeWidgets(): Promise<{
    layout: WidgetLayoutItem[];
    widgets: Widget[];
}> {
    // Инициализация в глобальной области видимости
    window.widgetsInit = window.widgetsInit || {};

    try {
        // Загрузка данных о виджетах
        const widgetsDBResponse = await ky.get(`${window.routePrefix}/widgets-get-all-db`).json();
        let widgetsDB = (widgetsDBResponse as any)?.widgetsDB ?? [];

        const widgetsResponse = await ky.get(`${window.routePrefix}/widgets-get-all`).json();
        const allWidgets = (widgetsResponse as any).widgets as Widget[];

        // Обработка виджетов
        const initWidgets = allWidgets.map(widget => {
            const findItem = widgetsDB.find((e: any) => e.id === widget.id);
            return findItem && findItem.added ? { ...widget, added: true } : widget;
        });

        // Получение layout из localStorage
        const localLayout = JSON.parse(localStorage.getItem('widgets_layout') || 'null') as WidgetLayoutItem[] | null;
        const filtered = initWidgets.filter(e => e.added);
        let newLayout: WidgetLayoutItem[] = [];

        if (localLayout !== null) {
            newLayout = filtered.map((widget, index) => {
                const findItem = localLayout.find(e => e.id === widget.id);

                if (findItem) {
                    return {
                        x: findItem.x,
                        y: findItem.y,
                        w: widget.size?.w || 1,
                        h: widget.size?.h || 1,
                        i: findItem.i || index.toString(),
                        id: widget.id
                    };
                } else {
                    const w = widget.size?.w || 1;
                    const h = widget.size?.h || 1;
                    const prevItem = newLayout[index - 1];

                    let x = index === 0 ? 0 :
                        ((prevItem.x + prevItem.w) > 8 || (prevItem.x + prevItem.w + w) > 8 ?
                            0 :
                            (prevItem.x + prevItem.w));

                    return {
                        x,
                        y: 0,
                        w,
                        h,
                        i: index.toString(),
                        id: widget.id
                    };
                }
            });
        } else {
            // Создание нового layout для добавленных виджетов
            newLayout = filtered.map((widget, index) => {
                const w = widget.size?.w || 1;
                const h = widget.size?.h || 1;
                const prevItem = newLayout[index - 1];

                let x = index === 0 ? 0 :
                    ((prevItem?.x + prevItem?.w) > 8 || (prevItem?.x + prevItem?.w + w) > 8 ?
                        0 :
                        (prevItem?.x + prevItem?.w));

                return {
                    x,
                    y: 0,
                    w,
                    h,
                    i: index.toString(),
                    id: widget.id
                };
            });
        }

        // Обновление глобальной переменной
        window.widgetsInit = {
            layout: newLayout,
            widgets: initWidgets
        };

        return {
            layout: newLayout,
            widgets: initWidgets
        };
    } catch (error) {
        console.error('Ошибка при инициализации виджетов:', error);
        throw error;
    }
}
