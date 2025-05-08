import {Widget, WidgetLayoutItem} from "@/types";
import axios from "axios";

export async function initializeWidgets(): Promise<{
    layout: WidgetLayoutItem[];
    widgets: Widget[];
}> {
    try {
        const widgetsDBResponse = await axios.get(`${window.routePrefix}/widgets-get-all-db`)
        let widgetsDB = widgetsDBResponse.data?.widgetsDB ?? [];

        const widgetsResponse = await axios.get(`${window.routePrefix}/widgets-get-all`);
        const allWidgets = widgetsResponse.data.widgets as Widget[];

        const initWidgets = allWidgets.map(widget => {
            const findItem = widgetsDB.find((e: any) => e.id === widget.id);
            return findItem && findItem.added ? {...widget, added: true} : widget;
        });

        const filtered = initWidgets.filter(e => e.added);
        let newLayout: WidgetLayoutItem[] = [];

        filtered.forEach((widget, index) => {
            const w = widget.size?.w || 1;
            const h = widget.size?.h || 1;

            let x = 0;
            if (index > 0) {
                const prevItem = newLayout[index - 1];
                if (prevItem) {
                    const potentialX = prevItem.x + prevItem.w;
                    x = (potentialX > 8 || (potentialX + w) > 8) ? 0 : potentialX;
                }
            }

            newLayout.push({
                x,
                y: 0,
                w,
                h,
                i: index.toString(),
                id: widget.id
            });
        });

        return {
            layout: newLayout,
            widgets: initWidgets
        };
    } catch (error) {
        console.error('Error initializing widgets:', error);
        throw error;
    }
}
