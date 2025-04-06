import { AbstractModel } from "../lib/v4/model/AbstractModel";
import {ModelConfig} from "./adminpanelConfig";
import { Inertia } from '../lib/inertia/inertiaAdapter';
import { Flash } from '../lib/inertia/flash';
import {Adminizer} from "../lib/Adminizer";
import multer from "multer";
import {I18n} from "../lib/v4/I18n";

export type EntityType = "form" | "model" | "wizard";
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
    value: string | boolean | number;
    disabled?: boolean;
    required?: boolean;
    isIn?: string[] | number[] | boolean[];
    options?: Record<string, string>
}
