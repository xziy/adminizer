import {Adminizer} from "../dist/lib/Adminizer";
import http from 'http';
import {WaterlineAdapter, WaterlineModel} from "../dist/lib/v4/model/adapter/waterline";
import adminpanelConfig from "./adminizerConfig";
import {AdminpanelConfig} from "../dist/interfaces/adminpanelConfig";
import Waterline from "waterline";
import waterlineConfig from "./waterlineConfig";
import Example from "./models/Example";
import Test from "./models/Test";
import JsonSchema from "./models/JsonSchema";
import {ReactQuill} from "../modules/controls/wysiwyg/ReactQuill";

import { faker } from '@faker-js/faker';
import fs from 'fs/promises';
import path from 'path';
import { generate } from "password-hash";



if (process.env.SEED_DATA === 'true') await cleanTempFolder();

// https://sailsjs.com/documentation/concepts/models-and-orm/standalone-waterline-usage
const orm = new Waterline();
orm.registerModel(Example);
orm.registerModel(Test);
orm.registerModel(JsonSchema);


// TODO нужно регистрировать системные модели именно в defaultAdapter или как-то указать в bindModels какой адаптер использовать,
//  потому что bindModels должны знать из какого адаптера их доставать (в обычных моделях это можно задать конфигом) (лучше в default)
/** Don't forget to register adminizer system models before initialize */
await WaterlineAdapter.registerSystemModels(orm)



// TODO getComponents ломается при отрисовке
orm.initialize(waterlineConfig, async (err, ontology) => {
    if (err) {
        console.error("Error trying to start Waterline:", err);
        return;
    }

    console.log("Waterline ORM initialized!");

    if (process.env.SEED_DATA === 'true') {
        try {
            // Очищаем .tmp и генерируем данные
            await seedDatabase(ontology.collections, 40);
            console.log("Database seeded with random data!");
        } catch (seedErr) {
            console.error("Error during database seeding:", seedErr);
        }
    }


    let routePrefix = adminpanelConfig.routePrefix;
    process.env.ROUTE_PREFIX = adminpanelConfig.routePrefix;

    /**
     * In case you want to use adminizer built-in adapter, but if not, create your own adapter that extends AbstractAdapter
     * and realize all necessary methods in it
     */
    const waterlineAdapter = new WaterlineAdapter({orm: orm, ontology: ontology}); // ontology contains collections, orm just contains general methods
    const adminizer = new Adminizer([waterlineAdapter]);


    // Add custom module
    adminizer.emitter.on('adminizer:loaded', () => {
        let policies: MiddlewareType[] = adminizer.config.policies;
        const module = (req: ReqType, res: ResType) => {
            if (req.adminizer.config.auth.enable) {
                if (!req.session.UserAP) {
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
        adminpanelConfig.auth.enable = !!process.env.SEED_DATA
        await adminizer.init(adminpanelConfig as unknown as AdminpanelConfig)

    } catch (e) {
        console.log(e)
    }


    function expressHandler(subApp: any) {
        return (req: any, res: any) => {
            subApp(req, res, (err: any) => {
                if (err) {
                    console.log("Err in SubApp", err);
                    res.writeHead(500, {'Content-Type': 'text/plain'});
                    res.end('Internal Server Error');
                } else {
                    res.writeHead(404, {'Content-Type': 'text/plain'});
                    res.end('Route Not Found in SubApp');
                }
            });
        };
    }

    // Main app on http
    const mainApp = http.createServer((req, res) => {
        const adminizerHandler = expressHandler(adminizer.app);
        if (req.url.startsWith(routePrefix)) {
            // Delete /adminizer from url --------------------->>>>>>>>>>!!!!!!!!!!!!
            // req.url = req.url.replace(routePrefix, '') || '/';
            adminizerHandler(req, res);
        }else if (
            req.url.startsWith('/@vite') || // Requests to Vite
            req.url.startsWith('/@id') || // Requests to Vite
            req.url.startsWith('/src/assets') ||   // Requests to source files
            req.url.startsWith('/@react-refresh') ||   // Requests to source files
            req.url.startsWith('/node_modules') ||
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
});

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



async function seedDatabase(collections: any, count: number = 3) {

    const getRandomTime = () => {
        const hours = faker.number.int({ min: 0, max: 23 }).toString().padStart(2, '0');
        const minutes = faker.number.int({ min: 0, max: 59 }).toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }
    if (collections.example) {
        // TODO: Use adminizer.modelHandler.model.get for adapt for multiORM fixture
        const exampleModel = collections.example as WaterlineModel<typeof Example>;

        const existingCount = await exampleModel.count({});
        if (existingCount === 0) {
            const fakeExamples = Array.from({ length: count }, () => ({
                title: faker.lorem.word(),
                description: faker.lorem.paragraph(),
                sort: faker.datatype.boolean(),
                time: getRandomTime(),
                number: faker.number.int(300),
                editor: faker.lorem.text(),
            }));
            //@ts-ignore
            await exampleModel.createEach(fakeExamples);
        }
    }
    let passwordHashed = generate("demodemo");

    process.env.ADMINPANEL_DEMO_ADMIN_ENABLE = '1'
}
