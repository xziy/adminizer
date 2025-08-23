import {Adminizer, INotification} from "../dist";
import http from 'http';
import {WaterlineAdapter, WaterlineModel} from "../dist/lib/v4/model/adapter/waterline";
import Waterline from "waterline";
import waterlineConfig from "./waterlineConfig";
import ExampleWaterline from "./models/Example";
import TestWaterline from "./models/Test";
import JsonSchemaWaterline from "./models/JsonSchema";
import CategoryWaterline from "./models/Category";
import CatalogGroupNav from "./models/CatalogGroupNav";
import CatalogPageNav from "./models/CatalogPageNav";
import GroupCatalog from "./models/GroupCatalog";
import UserWaterline from "./models/User";
import adminpanelConfig from "./adminizerConfig";
import {AdminpanelConfig} from "../dist/interfaces/adminpanelConfig";

import {ReactQuill} from "../modules/controls/wysiwyg/ReactQuill";

// Waterline imports
import {Sequelize} from "sequelize-typescript";

// Sequelize imports
import fs from 'fs/promises';
import path from 'path';
import {Example as ExampleSequelize} from "./models/sequelize/Example";
import {JsonSchema as JsonSchemaSequelize} from "./models/sequelize/JsonSchema";
import {Test as TestSequelize} from "./models/sequelize/Test";
import {Category as CategorySequelize} from "./models/sequelize/Category";
import {TestCatalog as TestCatalogSequelize} from "./models/sequelize/TestCatalog";
import {SequelizeAdapter} from "../dist/lib/v4/model/adapter/sequelize";
import {seedDatabase} from "./helpers/seedDatabase";


//Widgets imports
import {SwitcherOne, SwitcherTwo} from "./widgets/Switchers";
import {SiteLinks} from "./widgets/Links";
import {InfoOne, Info4, Info3, InfoTwo} from "./widgets/Info";
import {CustomOne} from "./widgets/Custom";
import {ActionOne, ActionTwo} from "./widgets/Actions";
import {TestCatalog} from "./virtual-catalog/virtualCatalog";
import express from "express";
import cookieParser from "cookie-parser";

process.env.AP_PASSWORD_SALT = "FIXTURE"

// Clean temp folder
if (!process.env.NO_SEED_DATA || process.env.CLEAN_TMP) await cleanTempFolder();
process.env.JWT_SECRET = "fixture-jwt-secret"
// https://sailsjs.com/documentation/concepts/models-and-orm/standalone-waterline-usage


const ormType = process.env.ORM ?? "sequelize";
let adminizer: Adminizer;

if (ormType === "waterline") {
    const orm = new Waterline();
    await WaterlineAdapter.registerSystemModels(orm);
    orm.registerModel(ExampleWaterline);
    orm.registerModel(TestWaterline);
    orm.registerModel(JsonSchemaWaterline);
    orm.registerModel(CategoryWaterline);
    orm.registerModel(CatalogGroupNav);
    orm.registerModel(CatalogPageNav);
    orm.registerModel(GroupCatalog);
    orm.registerModel(UserWaterline);

    const ontology = await new Promise<any>((resolve, reject) => {
        orm.initialize(waterlineConfig as any, (err, ontology) => {
            if (err) return reject(err);
            resolve(ontology);
        });
    });

    const waterlineAdapter = new WaterlineAdapter({orm, ontology});
    adminizer = new Adminizer([waterlineAdapter]);
    await ormSharedFixtureLift(adminizer);

    if (!process.env.NO_SEED_DATA) {
        try {
            await seedDatabase(waterlineAdapter.models, 77);
            console.log("Database seeded with random data!");
        } catch (seedErr) {
            console.error("Error during database seeding:", seedErr);
        }
    }
} else {
    const tmpDir = path.join(process.cwd(), ".tmp");
    const dbPath = path.join(tmpDir, "adminizer_fixture.sqlite");
    const orm = new Sequelize({
        dialect: "sqlite",
        storage: dbPath,
        logging: false,
    });
    await orm.authenticate();
    await SequelizeAdapter.registerSystemModels(orm);
    orm.addModels([ExampleSequelize, TestSequelize, JsonSchemaSequelize, CategorySequelize, TestCatalogSequelize]);
    TestSequelize.associate(orm);
    ExampleSequelize.associate(orm);

    await orm.sync({});
    const sequelizeAdapter = new SequelizeAdapter(orm);
    adminizer = new Adminizer([sequelizeAdapter]);
    await ormSharedFixtureLift(adminizer);

    if (!process.env.NO_SEED_DATA) {
        try {
            await seedDatabase(orm.models, 77);
            console.log("Database seeded with random data!");
        } catch (seedErr) {
            console.error("Error during database seeding:", seedErr);
        }
    }
}

// Finish


async function cleanTempFolder() {
    const tmpPath = path.join(process.cwd(), '.tmp');
    try {
        const stats = await fs.stat(tmpPath);
        if (stats.isDirectory()) {
            await fs.rm(tmpPath, {recursive: true});
            console.log(`Temporary folder ${tmpPath} cleaned successfully`);
        }
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.error(`Error cleaning temporary folder: ${err.message}`);
        }
    }
}

/**
 * Shared method for all orm's
 * @param adminizer
 */
async function ormSharedFixtureLift(adminizer: Adminizer) {
    let routePrefix = adminpanelConfig.routePrefix;
    process.env.ROUTE_PREFIX = adminpanelConfig.routePrefix;

    // Add custom module
    adminizer.emitter.on('adminizer:loaded', () => {
        let policies: MiddlewareType[] = adminizer.config.policies;
        const module = (req: ReqType, res: ResType) => {
            if (req.adminizer.config.auth.enable) {
                if (!req.user) {
                    return res.redirect(`${req.adminizer.config.routePrefix}/model/userap/login`);
                }
            }

            // module logic here

            const isDev = process.env.NODE_ENV === 'development';
            const moduleComponent = isDev ? '/modules/test/ComponentB.tsx' : `${adminizer.config.routePrefix}/assets/modules/ComponentB.es.js`;

            return req.Inertia.render({
                component: 'module', // required
                props: {
                    moduleComponent: moduleComponent, // required
                    message: 'Hello from Adminizer',
                    // ...{menu: {test: '12'}}
                    // other props
                }
            })

        }

        adminizer.app.all(`${adminizer.config.routePrefix}/module-test`, adminizer.policyManager.bindPolicies(policies, module));
    });

    // add custom control wysiwyg
    adminizer.emitter.on('adminizer:loaded', () => {
        adminizer.controlsHandler.add(new ReactQuill(adminizer))
    })


    try {

        await adminizer.init(adminpanelConfig as unknown as AdminpanelConfig)

        adminizer.widgetHandler.add(new SwitcherOne());
        adminizer.widgetHandler.add(new SwitcherTwo());
        adminizer.widgetHandler.add(new SiteLinks());
        adminizer.widgetHandler.add(new InfoOne());
        adminizer.widgetHandler.add(new InfoTwo());
        adminizer.widgetHandler.add(new Info3());
        adminizer.widgetHandler.add(new Info4());
        adminizer.widgetHandler.add(new ActionOne());
        adminizer.widgetHandler.add(new ActionTwo());

        /** Custom widget */
        adminizer.widgetHandler.add(new CustomOne(adminizer.config.routePrefix));

        /** Test Catalog */
        adminizer.catalogHandler.add(new TestCatalog(adminizer, 'testcatalog'))

        /** Test notifications */
        async function sendNotificationsWithDelay() {
            const notifications: INotification[] = [
                {
                    message: "Первое уведомление", title: "Тест 1",
                    id: "11",
                    createdAt: undefined,
                    read: false,
                    notificationClass: "general"
                },
                {
                    id: '1a1',
                    title: 'Admin system notification',
                    message: 'This is a test system notification',
                    userId: 1,
                    createdAt: new Date(),
                    read: false,
                    notificationClass: 'system',
                },
                {
                    message: "Второе уведомление", title: "Тест 2",
                    id: "21",
                    createdAt: undefined,
                    read: false,
                    notificationClass: "general"
                },
                {
                    id: '1a2',
                    title: 'Admin system notification',
                    message: 'This is a test system notification',
                    userId: 1,
                    createdAt: new Date(),
                    read: false,
                    notificationClass:'system',
                },
                {
                    message: "Третье уведомление", title: "Тест 3",
                    id: "313",
                    createdAt: undefined,
                    read: false,
                    notificationClass: "general"
                }
            ];

            for (const notification of notifications) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // Ждем 2 секунды
                switch (notification.notificationClass) {
                    case "general": {
                        await adminizer.sendNotification(notification);
                        break;
                    }
                    case 'system': {
                        await adminizer.logSystemEvent(notification.title, notification.message, undefined)
                        break;
                    }
                    default: {
                        break;
                    }
                }
            }
        }

        setTimeout(sendNotificationsWithDelay, 10000); // Начальная задержка 15 секунд

    } catch (e) {
        console.log(e)
    }

    // Start server
    const mainApp = express();

    // Add cookie parser
    mainApp.use(cookieParser());

    // Middleware for Vite
    mainApp.use((req, res, next) => {
        if (
            req.url.startsWith('/@vite') ||
            req.url.startsWith('/@id') ||
            req.url.startsWith('/src/assets') ||
            req.url.startsWith('/@react-refresh') ||
            req.url.startsWith('/node_modules') ||
            req.url.startsWith('/@fs') ||
            req.url.startsWith('/modules')
        ) {
            adminizer.vite.middlewares(req, res, next);
        } else {
            next();
        }
    });

    // Middleware for Adminizer
    mainApp.use(adminizer.getMiddleware());

    // Custom route
    mainApp.get('/nav', async (req, res) => {
        try {
            let header = await adminizer.modelHandler.model.get('navigationap')["_findOne"]({label: 'header'});
            res.json({header: header});
        } catch (error) {
            res.status(500).json({error: 'Internal server error'});
        }
    });

    // Route for the main page
    mainApp.get('/', (req, res) => {
        res.send('<h1>Welcome to Adminizer</h1><p>Go to <a href="/adminizer">Adminizer</a></p>');
    });

    // Error handling
    mainApp.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
        console.error(err);
        res.status(500).send('Internal Server Error');
    });

    // 404 handler
    mainApp.use((req, res) => {
        res.status(404).send('Not Found');
    });

    const server = http.createServer(mainApp);
    server.listen(3000, () => {
        console.log('MainApp listening on http://localhost:3000');
    });
}


function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
