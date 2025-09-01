import { AbstractModel } from "../lib/v4/model/AbstractModel";
import {ModelConfig} from "./adminpanelConfig";
import { Inertia } from '../lib/v4/inertia/inertiaAdapter';
import { Flash } from '../lib/v4/inertia/flash';
import {Adminizer} from "../lib/Adminizer";
import multer from "multer";
import {I18n} from "../lib/v4/I18n";

export type EntityType = "form" | "model";
export interface Entity {
    name: string
    config?: ModelConfig
    model?: AbstractModel<any>
    uri: string
    type: EntityType
}

export interface AccessRightsToken {
    name: string
    description: string
    department: string
    id: string
}

export interface PropsField {
    label: string;
    type: string;
    name: string;
    tooltip?: string;
    value: string | boolean | number | string[];
    disabled?: boolean;
    required?: boolean;
    isIn?: string[] | number[] | boolean[];
    options?: Record<string, unknown> | Record<string, unknown>[]
}


export interface INotification {
    id: string;
    title: string;
    message: string;
    createdAt: Date;
    userId?: number;
    icon: {
        icon: string;
        iconColor: string;
    }
    notificationClass: string; // Класс нотификации: 'general', 'system', etc.
    metadata?: Record<string, any>;
}

export interface INotificationEvent {
    type: 'notification' | 'heartbeat' | 'connected' | 'error';
    data: INotification | string;
    notificationClass?: string; // Для фильтрации
}

export interface INotificationService {
    readonly notificationClass: string;
    dispatchNotification(notification: Omit<INotification, 'id' | 'createdAt' | 'notificationClass' | 'icon'>): Promise<boolean>;
    getNotifications(userId?: number, limit?: number, unreadOnly?: boolean): Promise<INotification[]>;
    markAsRead(id: string): Promise<void>;
    getClientCount(): number;
}