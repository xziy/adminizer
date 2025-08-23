import express, {Express} from "express";
import cookieParser from 'cookie-parser'
import * as path from "path";
import winston from "winston";
import EventEmitter from 'events';

import {AdminpanelConfig} from "../interfaces/adminpanelConfig";
import PolicyManager from "./v4/PolicyManager";
import Router from "./../system/Router";
import bindAssets from "../system/bindAssets";
import bindDev from "../system/bindDev";
import bindDashboardWidgets from "../system/bindDashboardWidgets";
import bindNavigation from "../system/bindNavigation";
import bindMediaManager from "../system/bindMediaManager";
import bindAccessRights from "../system/bindAccessRights";
import bindAuthorization from "../system/bindAuthorization";
import bindModels from "../system/bindModels";
import bindForms from "../system/bindForms";
import bindTranslations from "../system/bindTranslations";
import {ModelHandler} from "./v4/model/ModelHandler";
import {WidgetHandler} from "./v4/widgets/widgetHandler";
import {AccessRightsHelper} from "../helpers/accessRightsHelper";
import bindReqFunctions from "../system/bindReqFunctions";
import {ConfigHelper} from "../helpers/configHelper";
import {I18n} from "./v4/I18n";
import {getDefaultConfig} from "../system/defaults";
import {AbstractAdapter} from "./v4/model/AbstractModel";
import bindExpressUtils from "../system/bindExpressUtils";
import type {ViteDevServer} from 'vite';
import {bindInertia} from "../system/bindInertia";
import {MenuHelper} from "../helpers/menuHelper";
import {bindControls} from "../system/bindControls";
import {ControlsHandler} from "./v4/controls/ControlsHandler";
import {CatalogHandler} from "./v4/catalog/CatalogHandler";
import {v4 as uuid} from "uuid";
import { NotificationHandler } from './v4/notifications/NotificationHandler';
import { GeneralNotificationService } from './v4/notifications/GeneralNotificationService';
import { SystemNotificationService } from './v4/notifications/SystemNotificationService';
import {bindNotifications} from "../system/bindNotifications";
import {INotification} from "../interfaces/types";

export class Adminizer {
    // Preconfigures
    /**
     * If you convey this default Middleware, it will add it to the very top of the router, 
     * and will contact each request
     */
    defaultMiddleware: MiddlewareType

    // Instances
    app: Express
    public config: AdminpanelConfig
    private readonly _emitter: EventEmitter
    ormAdapters: AbstractAdapter[]
    policyManager!: PolicyManager
    accessRightsHelper: AccessRightsHelper
    configHelper: ConfigHelper
    menuHelper: MenuHelper
    notificationHandler!: NotificationHandler;
    modelHandler!: ModelHandler
    widgetHandler: WidgetHandler
    vite: ViteDevServer
    controlsHandler!: ControlsHandler
    catalogHandler!: CatalogHandler

    // Constants
    jwtSecret: string = process.env.JWT_SECRET ?? uuid()

    static logger = winston.createLogger({
        level: process.env.LOG_LEVEL ?? "debug",
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.printf(({timestamp, level, message, ...meta}) => {
                const metaString = Object.keys(meta).length ? JSON.stringify(meta) : "";
                return `[${timestamp}] ${level.toUpperCase()}: ${message} ${metaString}`;
            })
        ),
        transports: [
            new winston.transports.Console(),
            new winston.transports.File({filename: "logs/app.log"}),
        ],
    })

    constructor(ormAdapters: AbstractAdapter[]) {
        this.app = express();
        this._emitter = new EventEmitter();
        this.ormAdapters = ormAdapters;
    }

    getMiddleware() {
        return (req: express.Request, res: express.Response, next: () => void ) => {
            // If a routePrefix is configured, only handle requests that match it.
            try {
                const prefix = (this.config && this.config.routePrefix) ? String(this.config.routePrefix) : '';
                const normalizedPrefix = prefix.replace(/\/+/g, '/').replace(/\/+$/g, '');
                if (normalizedPrefix) {
                    const url = req.url || req.originalUrl || '';
                    if (!(url === normalizedPrefix || url.startsWith(normalizedPrefix + '/') || url.startsWith('/public'))) {
                        // Not an admin route — pass to next middleware
                        return typeof next === 'function' ? next() : undefined;
                    }
                }
            }
            catch (e) {
                // If anything goes wrong while checking, fall back to handling the request
            }

            this.app(req, res, (err) => {
                if (err) {
                    // eslint-disable-next-line no-console
                    console.error("Error in Adminizer", err);
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Internal Server Error');
                }
                else {
                    // If Adminizer didn't handle the route, let the rest of the stack try
                    if (typeof next === 'function') {
                        return next();
                    }
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('Route Not Found in Adminizer');
                }
            });
        };
    }

    /**
     * Vite middleware
     * @protected
     */
    protected async viteMiddleware() {
        const { createServer: createViteServer } = await import('vite');
        const chalk = (await import('chalk')).default;
        this.vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'custom',
        });
        this.app.use(this.vite.middlewares);
        
        // eslint-disable-next-line no-console
        console.log(
            chalk.green.bold('Vite is running in development mode!') +
            chalk.blue('\nAccess your app at http://localhost:3000')
        );
    }

    public async init(config: AdminpanelConfig) {
        // set cookie parser
        this.app.use(cookieParser());
        
        if(!config || Object.keys(config).length === 0) {
            Adminizer.log.warn(`Adminizer init > Adminizer config is emtpy`)
        }

        // Set vite middleware
        const isViteDev = process.env.VITE_ENV === "dev";
        if (isViteDev) await this.viteMiddleware()

        this.emitter.emit('adminizer:init');

        if (this.config && Object.keys(this.config).length > 0) {
            throw new Error("Config has already been initialized");
        }

        // Merge custom config with default, additionally merge models
        const defaultConfig = getDefaultConfig();

        const {
            forms: configForms = {} as AdminpanelConfig['forms'],
            ...restConfig
        } = config;

        const {
            forms: defaultForms = {} as AdminpanelConfig['forms'],
        } = defaultConfig;

        this.config = {
            ...defaultConfig,
            ...restConfig,
            models: {
                ...defaultConfig.models,
                ...config.models
            },
            forms: {
                path: configForms.path ?? defaultForms.path,
                data: {
                    ...defaultForms.data,
                    ...configForms.data
                },
                get: configForms.get ?? defaultForms.get,
                set: configForms.set ?? defaultForms.set
            }
        };

        this.modelHandler = new ModelHandler();

        // TODO: 'hot reload' unbind models & unbind forms
        await bindModels(this);
        await bindForms(this);

        this.config.rootPath = path.resolve(import.meta.dirname + "/..")

        this.policyManager = new PolicyManager(this);
        await this.policyManager.loadPolicies();

        // TODO: 'hot reload' problem with deleting access right tokens
        this.accessRightsHelper = new AccessRightsHelper(this);

        // Helpers go to construtor
        this.configHelper = new ConfigHelper(this);

        this.menuHelper = new MenuHelper(this.config)

        this.widgetHandler = new WidgetHandler(this);

        this.catalogHandler = new CatalogHandler();

        bindExpressUtils(this.app);
        bindReqFunctions(this);

        // Bind assets
        bindAssets(this.app, this.config.routePrefix);
        
        if(!process.env.VITEST) {
            if ((process.env.DEV && process.env.NODE_ENV !== 'production') || process.env.ADMINPANEL_FORCE_BIND_DEV === "TRUE") {
                bindDev(this)
            }
        }

        await bindDashboardWidgets(this);

        bindNavigation(this);

        bindMediaManager(this);

        await bindAccessRights(this);


        if (I18n.appendLocale) {
            bindTranslations(this);
        } else {
            this.config.translation = false
        }

        //bind controls
        this.controlsHandler = new ControlsHandler()
        bindControls(this)


        // bind Inertia
        bindInertia(this);

        await bindAuthorization(this);

        // Bind notifications
        await bindNotifications(this);

        await Router.bind(this); // must be after binding policies and req/res functions

        /**
         * Adminizer loaded
         * This call is used so that other apps can know that the admin panel is present in the panel and has been loaded, and can activate their logic.
         */
        this._emitter.emit('adminizer:loaded');
    }

    // Хелпер для отправки уведомлений
    public async sendNotification(notification: INotification): Promise<string> {
        const notificationClass = notification.notificationClass || 'general';
        return this.notificationHandler.dispatchNotification(notificationClass, notification);
    }

    // Хелпер для системных событий
    public async logSystemEvent(action: string, details: string, metadata?: any): Promise<string> {
        const systemNotificationService = this.notificationHandler.getService('system') as unknown as SystemNotificationService
        return systemNotificationService.logSystemEvent(action, details, metadata);
    }

    public get emitter(): EventEmitter {
        return this._emitter;
    }

    public getOrmAdapter(ormType: string): AbstractAdapter {
        return this.ormAdapters.find(item => item.ormType === ormType);
    }

    static get log() {
        return {
            info: (...args: any[]) => this.logger.info(args.join(" ")),
            warn: (...args: any[]) => this.logger.warn(args.join(" ")),
            error: (...args: any[]) => {
                const [error] = args;
                if (error instanceof Error) {
                    this.logger.error(`${error.message}\nStack: ${error.stack}`);
                } else {
                    this.logger.error(args.join(" ") + "\n" + new Error().stack);
                }
            },
            debug: (...args: any[]) => this.logger.debug(args.join(" ")),
            verbose: (...args: any[]) => this.logger.verbose(args.join(" ")),
            silly: (...args: any[]) => this.logger.silly(args.join(" ")),
        };
    }

    get defaultConfig() {
        return getDefaultConfig();
    }
}
