import {MenuItem} from "../../../helpers/menuHelper"
import {PropsFieldType} from "../../../helpers/inertiaAddHelper.ts"
import {NodeModel} from "@minoru/react-dnd-treeview";

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
    name: string;
    description: string;
    icon?: string;
    backgroundCSS?: string;
    type: WidgetType;
    api?: string;
    link?: string;
    linkType?: 'self' | 'blank'
    state?: boolean;
    scriptUrl?: string;
    constructorOption?: any;
    constructorName?: string;
    hideAdminPanelUI?: boolean;
    size?: {
        w: number
        h: number
    }
    added?: boolean

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

export interface Catalog {
    catalogName: string,
    catalogId: string,
    catalogSlug: string,
    movingGroupsRootOnly: boolean,
    idList: string[],
    nodes: ModeModel[]
}

export interface CatalogItem {
    actionHandlers: []
    allowedRoot: boolean
    urlPath: string
    type: string
    navigationModel: string
    name: string
    model: string
    isGroup: boolean
    icon: string
}

export interface NavItemAddProps {
    labels: Record<string, string>,
    model: string,
    items: {
        id: number,
        name: string
    }[]
    add: (model:string) => void
}

export interface NavGroupAddProps{
    labels: Record<string, string>
    items: {
        name: string,
        required: boolean
    }[],
    callback: () => void
}

export interface CustomCatalogData {
    id: string | number;
    name: string;
    parentId: string | number | null;
    sortOrder: number
    icon: string
    type: string;
    marked?: boolean
}
