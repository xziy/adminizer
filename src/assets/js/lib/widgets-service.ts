import {Widget, WidgetLayoutItem} from "@/types";
import axios from "axios";

export interface WidgetsLayouts {
    lg: WidgetLayoutItem[],
    md: WidgetLayoutItem[],
    sm: WidgetLayoutItem[],
    xs: WidgetLayoutItem[],
    xxs: WidgetLayoutItem[]
}

export async function initializeWidgets(): Promise<{
    layout: WidgetsLayouts;
    widgets: Widget[];
}> {
    try {
        const storedData = localStorage.getItem('widgetsData');
        let storedWidgets: Widget[] = [];
        let storedLayout: WidgetsLayouts = {
            lg: [],
            md: [],
            sm: [],
            xs: [],
            xxs: []
        };

        if (storedData) {
            try {
                const parsedData = JSON.parse(storedData);
                storedWidgets = parsedData.widgets || [];
                storedLayout = parsedData.layout || {
                    lg: [],
                    md: [],
                    sm: [],
                    xs: [],
                    xxs: []
                };
            } catch (e) {
                console.error('Error parsing data from localStorage', e);
            }
        }

        const widgetsDBResponse = await axios.get(`${window.routePrefix}/widgets-get-all-db`);
        let widgetsDB = widgetsDBResponse.data?.widgetsDB?.widgets as Widget[] ?? [];
        let layoutDB = widgetsDBResponse.data?.widgetsDB?.layout ?? {
            lg: [],
            md: [],
            sm: [],
            xs: [],
            xxs: []
        };

        const widgetsResponse = await axios.get(`${window.routePrefix}/widgets-get-all`);
        const allWidgets = widgetsResponse.data.widgets as Widget[];

        const dbWidgetIds = widgetsDB.map(w => w.id).sort();
        const storedWidgetIds = storedWidgets.map(w => w.id).sort();

        // Check if the widget IDs in the database and localStorage match
        const idsMatch =
            dbWidgetIds.length === storedWidgetIds.length &&
            dbWidgetIds.every((id, index) => id === storedWidgetIds[index]);

        let finalWidgetsDB = widgetsDB;
        let finalLayoutDB = layoutDB;

        if (idsMatch && storedWidgets.length > 0) {
            finalWidgetsDB = storedWidgets;
            finalLayoutDB = storedLayout;
        } else {
            const dataToStore = {
                widgets: widgetsDB,
                layout: layoutDB
            };
            localStorage.setItem('widgetsData', JSON.stringify(dataToStore));
        }

        const initWidgets = allWidgets.map(widget => {
            const findItem = finalWidgetsDB.find((e: any) => e.id === widget.id);
            return findItem && findItem.added ? {...widget, added: true} : widget;
        });

        return {
            layout: finalLayoutDB,
            widgets: initWidgets
        };
    } catch (error) {
        console.error('Error initializing widgets:', error);
        throw error;
    }
}
