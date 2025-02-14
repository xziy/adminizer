import {Adminizer} from "../dist/lib/Adminizer";
import http from 'http';
import {WaterlineAdapter, WaterlineModel} from "../dist/lib/v4/model/adapter/waterline";
import adminpanelConfig from "./adminizerConfig";
import {AdminpanelConfig} from "../src";
import Waterline from "waterline";
import waterlineConfig from "./waterlineConfig";
import Example from "./models/Example";
import JsonSchema from "./models/JsonSchema";
import Test from "./models/Test";
import User from "./models/User";

// https://sailsjs.com/documentation/concepts/models-and-orm/standalone-waterline-usage
const orm = new Waterline();
orm.registerModel(Example);
orm.registerModel(JsonSchema);
orm.registerModel(Test);
orm.registerModel(User);

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

    let routePrefix = adminpanelConfig.routePrefix;
    process.env.ROUTE_PREFIX = adminpanelConfig.routePrefix;

    /**
     * In case you want to use adminizer built-in adapter, but if not, create your own adapter that extends AbstractAdapter
     * and realize all necessary methods in it
     */
    const waterlineAdapter = new WaterlineAdapter({orm: orm, ontology: ontology}); // ontology contains collections, orm just contains general methods
    const adminizer = new Adminizer([waterlineAdapter]);
    try {
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
        if (req.url.startsWith(routePrefix)) {
            const adminizerHandler = expressHandler(adminizer.app);
            // Delete /adminizer from url
            req.url = req.url.replace(routePrefix, '') || '/';
            adminizerHandler(req, res);
        } else if (
            req.url.startsWith('/@vite') || // Запросы к Vite
            // req.url.startsWith('/src') ||   // Запросы к исходным файлам
            req.url.startsWith('/node_modules')
            // || // Запросы к внутренним ресурсам Vite
            // req.url.endsWith('.js') ||      // Запросы к JS-файлам
            // req.url.endsWith('.css') ||     // Запросы к CSS-файлам
            // req.url.endsWith('.mjs')        // Запросы к модульным JS-файлам
        ) {
            adminizer.vite.middlewares(req, res);
        } else {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end('Hello from MainApp!');
        }
    });

    mainApp.listen(3000, () => {
        console.log('MainApp listening on http://localhost:3000');
    });
});
