import {Adminizer} from "../dist/lib/Adminizer";
import http from 'http';
import {WaterlineAdapter, WaterlineModel} from "../dist/lib/v4/model/adapter/waterline";
import adminpanelConfig from "./adminizerConfig";
import {AdminpanelConfig} from "../dist/interfaces/adminpanelConfig";

import {ReactQuill} from "../modules/controls/wysiwyg/ReactQuill";

// Waterline imports
import Waterline from "waterline";
import waterlineConfig from "./waterlineConfig";
import Example from "./models/Example";
import Test from "./models/Test";
import JsonSchema from "./models/JsonSchema";
import { Sequelize } from "sequelize-typescript";

// Sequelize imports
import fs from 'fs/promises';
import path from 'path';
import { Example as ExampleSequelize } from "./models/sequelize/Example";
import { JsonSchema as JsonSchemaSequelize  } from "./models/sequelize/JsonSchema";
import { Test as TestSequelize } from "./models/sequelize/Test";
import { SequelizeAdapter } from "../dist/lib/v4/model/adapter/sequelize";
import { seedDatabase } from "./helpers/seedDatabase";


//Widgets imports
import {SwitcherOne, SwitcherTwo} from "./test-widgets/Switchers";
import {SiteLinks} from "./test-widgets/Links";
import {InfoOne, Info4, Info3, InfoTwo} from "./test-widgets/Info";
import {CustomOne} from "./test-widgets/Custom";
import {ActionOne, ActionTwo} from "./test-widgets/Actions";


process.env.AP_PASSWORD_SALT = "FIXTURE"

// Clean temp folder
if (!process.env.NO_SEED_DATA) await cleanTempFolder();
process.env.JWT_SECRET = "fixture-jwt-secret"
// https://sailsjs.com/documentation/concepts/models-and-orm/standalone-waterline-usage

if(process.env.ORM === 'sequelize'
    // || true
) {
    const tmpDir = path.join(process.cwd(), ".tmp");
    const dbPath = path.join(tmpDir, "adminizer_fixture.sqlite");
    const orm = new Sequelize({
      dialect: "sqlite",
      storage: dbPath,
      logging: false,
    });
    await orm.authenticate();
    await SequelizeAdapter.registerSystemModels(orm)
    orm.addModels([ExampleSequelize, TestSequelize, JsonSchemaSequelize])
    TestSequelize.associate(orm)
    console.log('Test associations:', Object.keys(TestSequelize.associations));

    await orm.sync({ });
    const sequelizeAdapter = new SequelizeAdapter(orm);
    const adminizer = new Adminizer([sequelizeAdapter]);
    await ormSharedFixtureLift(adminizer);


    if (!process.env.NO_SEED_DATA) {
        try {
            await seedDatabase(orm.models, 77);
            console.log("Database seeded with random data!");
        } catch (seedErr) {
            console.error("Error during database seeding:", seedErr);
        }
    }

    // Finish
} else {
    const orm = new Waterline();

    await WaterlineAdapter.registerSystemModels(orm)
    await sleep(1000)
    orm.registerModel(Example);
    orm.registerModel(Test);
    orm.registerModel(JsonSchema);
    // TODO getComponents ломается при отрисовке
    orm.initialize(waterlineConfig, async (err, ontology) => {
        if (err) {
            console.error("Error trying to start Waterline:", err);
            return;
        }

        console.log("Waterline ORM initialized!");

        if (!process.env.NO_SEED_DATA) {
            try {
                await seedDatabase(ontology.collections, 40);
                console.log("Database seeded with random data!");
            } catch (seedErr) {
                console.error("Error during database seeding:", seedErr);
            }
        }

        /**
         * In case you want to use adminizer built-in adapter, but if not, create your own adapter that extends AbstractAdapter
         * and realize all necessary methods in it
         */
        const waterlineAdapter = new WaterlineAdapter({orm: orm as Waterline.Waterline, ontology: ontology}); // ontology contains collections, orm just contains general methods
        const adminizer = new Adminizer([waterlineAdapter]);
        await ormSharedFixtureLift(adminizer);
    });
}


//Todo you need to register the system models in Defaultadapter or somehow specify in Bindmodels which adapter to use,
//Because bindmodels should know from which adapter to get them (in ordinary models this can be set with a config) (preferably in Default)
//
/** Don't forget to register adminizer system models before initialize */



async function cleanTempFolder() {
    const tmpPath = path.join(process.cwd(), '.tmp');
    try {
        const stats = await fs.stat(tmpPath);
        if (stats.isDirectory()) {
            await fs.rm(tmpPath, { recursive: true });
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
                    title: 'Module Test',
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
        // adminpanelConfig.auth.enable = !!process.env.NO_SEED_DATA
        // adminpanelConfig.auth.enable = true

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

    } catch (e) {
        console.log(e)
    }


    // Main app on http
    const mainApp = http.createServer((req, res) => {
        const adminizerHandler = adminizer.getMiddleware();
        if (req.url.startsWith(routePrefix)) {
            // Delete /adminizer from url --------------------->>>>>>>>>>!!!!!!!!!!!!
            // req.url = req.url.replace(routePrefix, '') || '/';
            adminizerHandler(req, res);
        } else if (
            req.url.startsWith('/@vite') || // Requests to Vite
            req.url.startsWith('/@id') || // Requests to Vite
            req.url.startsWith('/src/assets') ||   // Requests to source files
            req.url.startsWith('/@react-refresh') ||   // Requests to source files
            req.url.startsWith('/node_modules') ||
            req.url.startsWith('/@fs') ||
            req.url.startsWith('/modules')
        ) {
            adminizer.vite.middlewares(req, res);
        } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<h1>Welcome to Adminizer</h1><p>Go to <a href="/adminizer">Adminizer</a></p>');
        }
    });

    mainApp.listen(3000, () => {
        const isViteDev = process.env.VITE_ENV === "dev";
        if (!isViteDev) console.log('MainApp listening on http://localhost:3000');
    });
}


function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
