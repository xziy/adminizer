import { LucideIcon } from 'lucide-react';
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

export interface NavItem extends MenuItem {}

export interface SharedData {
    name: string;
    menu: MenuItem[];
    brand: string
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
