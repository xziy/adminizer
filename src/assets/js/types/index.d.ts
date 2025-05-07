import {MenuItem} from "../../../helpers/menuHelper"
import {PropsFieldType} from "../../../helpers/inertiaAddHelper.ts"


export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}


export interface Columns {
    [key: string]: {
        data: string
        title: string
        orderable?: boolean
        searchable?: boolean
        direction?: string
        searchColumnValue?: string
    }
}

export interface NavItem extends MenuItem {
    type: 'blank' | 'self'
}

type FlashMessages = 'info' | 'error' | 'success' | string;

export interface SharedData {
    name: string;
    menu: NavItem[];
    brand: string,
    logout: string
    logoutBtn: string
    flash: Record<FlashMessages, string>;
    auth: Auth;
    [key: string]: unknown;
}

export interface User {
    id: number;
    login: string;
    email: string;
    avatar?: string;
    isAdministrator: boolean;
    [key: string]: unknown;
}

export interface Widget {
    id: string;
    title?: string;
    size?: { w: number; h: number };
    added?: boolean;
    [key: string]: any;
}

export interface WidgetLayoutItem {
    x: number;
    y: number;
    w: number;
    h: number;
    i: string;
    id: string;
}

declare global {
    interface Window {
        routePrefix: string;
        widgetsInit: {
            layout: WidgetLayoutItem[],
            widgets: Widget[]
        }
    }
}

export interface Field {
    label: string;
    type: PropsFieldType;
    name: string;
    tooltip?: string;
    value: FieldValue;
    disabled?: boolean;
    required?: boolean;
    isIn?: string[];
    options?: any;
}
