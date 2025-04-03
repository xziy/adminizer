import express, {Express} from "express";
import * as path from "path";
import winston from "winston";
import EventEmitter from 'events';
import chalk from 'chalk';

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
// import bindNavigation from "../system/bindNavigation";
// import bindMediaManager from "../system/bindMediaManager";
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
import {bindInertia} from "../system/bindInertia";
import {MenuHelper} from "../helpers/menuHelper";

export class Adminizer {
    app: Express
    public config: AdminpanelConfig
    private readonly _emitter: EventEmitter
    ormAdapters: AbstractAdapter[]
    policyManager!: PolicyManager
    accessRightsHelper: AccessRightsHelper
    configHelper: ConfigHelper
    menuHelper: MenuHelper
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
    }

    /**
     * Vite middleware
     * @protected
     */
    protected async viteMiddleware() {
        // Create a Vite server in middleware mode
        this.vite = await createViteServer({
            server: {middlewareMode: true}, // Enable middleware mode
            appType: 'custom', // Specify the application type
        });

        // Use Vite Middleware
        this.app.use(this.vite.middlewares);

        console.log(
            chalk.green.bold('Vite is running in development mode!') +
            chalk.blue('\nAccess your app at http://localhost:3000')
        );
    }

    public async init(config: AdminpanelConfig) {
        // Set vite middleware
        const isViteDev = process.env.VITE_ENV === "dev";
        if (isViteDev) await this.viteMiddleware()

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

        this.menuHelper = new MenuHelper(this.config)

        this.widgetHandler = new WidgetHandler(this);

        bindExpressUtils(this.app);
        // bindResFunctions(this);
        bindReqFunctions(this);

        // add install stepper policy to check unfilled settings
        // bindInstallStepper(this);


        // Bind assets
        bindAssets(this.app, this.config.routePrefix);

        if ((process.env.DEV && process.env.NODE_ENV !== 'production') || process.env.ADMINPANEL_FORCE_BIND_DEV === "TRUE") {
            bindDev(this)
        }

        await bindDashboardWidgets(this);

        // bindNavigation(this);

        // bindMediaManager(this);

        await bindAccessRights(this);


        // bindViewsLocals(this); // must be after setting all helpers that binds in here

        if (I18n.appendLocale) {
            bindTranslations(this);
        } else {
            this.config.translation = false
        }

        // bind Inertia
        bindInertia(this);

        await bindAuthorization(this);
        await Router.bind(this); // must be after binding policies and req/res functions

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
            error: (...args: any[]) => {
                const [error] = args;
                if (error instanceof Error) {
                    this.logger.error(`${error.message}\nStack: ${error.stack}`);
                } else {
                    this.logger.error(args.join(" "));
                }
            },
            debug: (...args: any[]) => this.logger.debug(args.join(" ")),
            verbose: (...args: any[]) => this.logger.verbose(args.join(" ")),
            silly: (...args: any[]) => this.logger.silly(args.join(" ")),
        };
    }
}
