import express, {Express} from "express";
import * as path from "path";
import winston from "winston";
import EventEmitter from 'events';

import {AdminpanelConfig} from "../interfaces/adminpanelConfig";
import PolicyManager from "./v4/PolicyManager";
import Router from "./../system/Router";
import {ViewsHelper} from "../helpers/viewsHelper";
import bindAssets from "../system/bindAssets";
import bindInstallStepper from "../system/bindInstallStepper";
import bindViewsLocals from "../system/bindViewsLocals";
import bindResFunctions from "../system/bindResFunctions";
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
import {WidgetHandler} from "./widgets/widgetHandler";
import {AccessRightsHelper} from "../helpers/accessRightsHelper";
import bindReqFunctions from "../system/bindReqFunctions";
import {ConfigHelper} from "../helpers/configHelper";
import {I18n} from "./v4/I18n";
import {getDefaultConfig} from "../system/defaults";
import {AbstractAdapter} from "./v4/model/AbstractModel";
import bindExpressUtils from "../system/bindExpressUtils";
import {createServer as createViteServer, ViteDevServer} from 'vite';

export class Adminizer {
    app: Express
    public config: AdminpanelConfig
    private readonly _emitter: EventEmitter
    ormAdapters: AbstractAdapter[]
    policyManager!: PolicyManager
    accessRightsHelper: AccessRightsHelper
    configHelper: ConfigHelper
    modelHandler!: ModelHandler
    widgetHandler: WidgetHandler
    vite: ViteDevServer

    static logger = winston.createLogger({
        level: "info",
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

        this.viteMiddleware().then(r => {
            // set views
            this.app.set("view engine", "ejs");
            this.app.set("views", path.join(import.meta.dirname, "../views"));
        });

    }

    protected async viteMiddleware() {
        // Создаем Vite сервер в режиме middleware
        this.vite = await createViteServer({
            server: {middlewareMode: true}, // Включаем режим middleware
            appType: 'custom', // Указываем тип приложения
        });

        // Используем Vite Middleware
        this.app.use(this.vite.middlewares);
    }

    public async init(config: AdminpanelConfig) {
        this.emitter.emit('adminizer:init');

        if (this.config && Object.keys(this.config).length > 0) {
            throw new Error("Config has already been initialized");
        }

        // Merge custom config with default, additionally merge models
        const defaultConfig = getDefaultConfig();
        this.config = {
            ...defaultConfig,
            ...config,
            models: {
                ...defaultConfig.models,
                ...config.models
            }
        };
        // console.log("CONFIG", this.config)

        this.modelHandler = new ModelHandler();

        await bindModels(this);
        await bindForms(this);

        this.config.templateRootPath = ViewsHelper.BASE_VIEWS_PATH;
        this.config.rootPath = path.resolve(import.meta.dirname + "/..")

        this.policyManager = new PolicyManager(this);
        await this.policyManager.loadPolicies();

        this.accessRightsHelper = new AccessRightsHelper(this);

        this.configHelper = new ConfigHelper(this);

        this.widgetHandler = new WidgetHandler(this);

        bindExpressUtils(this.app);
        bindResFunctions(this);
        bindReqFunctions(this);

        await Router.bind(this); // must be after binding policies and req/res functions

        // add install stepper policy to check unfilled settings
        bindInstallStepper(this);

        // Bind assets
        bindAssets(this.app);

        if ((process.env.DEV && process.env.NODE_ENV !== 'production') || process.env.ADMINPANEL_FORCE_BIND_DEV === "TRUE") {
            bindDev(this)
        }

        await bindDashboardWidgets(this);

        bindNavigation(this);

        bindMediaManager(this);

        await bindAccessRights(this);

        await bindAuthorization(this);

        bindViewsLocals(this); // must be after setting all helpers that binds in here

        if (I18n.appendLocale) {
            bindTranslations(this);
        } else {
            this.config.translation = false
        }

        /**
         * Adminizer loaded
         * This call is used so that other apps can know that the admin panel is present in the panel and has been loaded, and can activate their logic.
         */
        this._emitter.emit('adminizer:loaded');
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
            error: (...args: any[]) => this.logger.error(args.join(" ")),
            debug: (...args: any[]) => this.logger.debug(args.join(" ")),
            verbose: (...args: any[]) => this.logger.verbose(args.join(" ")),
            silly: (...args: any[]) => this.logger.silly(args.join(" ")),
        };
    }
}
