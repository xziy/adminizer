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


type FlashMessages = 'info' | 'error' | 'success' | string;


declare module 'express-serve-static-core' {
    interface Request {
        Inertia: Inertia;
        flash: Flash<FlashMessages>;
        _parsedUrl: {
            pathname: string
        }
        setLocale: (locale: string) => void
        adminizer: Adminizer
        upload: (options?: { destination?: string; filename?: (file: Express.Multer.File) => string }) => multer.Multer
        i18n: I18n
    }
}

declare module 'express-session' {
    export interface SessionData {
        flashMessages: Record<string, string[]>;
        xInertiaCurrentComponent: string | undefined;
        UserAP: ModelsAP["UserAP"]
        messages: {
            adminError: string[],
            adminSuccess: string[]
        }
        adminPretender?: ModelsAP["UserAP"]
    }
}
