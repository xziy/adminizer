import {MenuItem} from "../../../helpers/menuHelper"


export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface ColumnConfig {
    config: {
        title: string
    };
}

export interface Columns {
    [key: string]: ColumnConfig;
}

export interface NavItem extends MenuItem {}

type FlashMessages = 'info' | 'error' | 'success' | string;

export interface SharedData {
    name: string;
    menu: MenuItem[];
    brand: string,
    logout: string
    flash: Record<FlashMessages, string>;
    auth: Auth;
    [key: string]: unknown;
}

export interface User {
    id: number;
    login: string;
    email: string;
    avatar?: string;
    [key: string]: unknown;
}

declare global {
    interface Window {
        routePrefix: string;
    }
}
