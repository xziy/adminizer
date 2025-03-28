import { Adminizer } from "../dist/lib/Adminizer";
import http from 'http';
import { WaterlineAdapter } from "../dist/lib/v4/model/adapter/waterline";
import adminpanelConfig from "./adminizerConfig";
import Waterline from "waterline";
import waterlineConfig from "./waterlineConfig";
import Example from "./models/Example";
// import JsonSchema from "./models/JsonSchema";
// import Test from "./models/Test";
// import User from "./models/User";
// import CatalogGroupNav from "./models/CatalogGroupNav";
// import CatalogPageNav from "./models/CatalogPageNav";
// import GroupCatalog from "./models/GroupCatalog";
// import Page from "./models/Page";
// import {SwitcherOne, SwitcherTwo} from "./test-widgets/Switchers";
// import {SiteLinks} from "./test-widgets/Links";
// import {InfoOne, Info4, Info3, InfoTwo} from "./test-widgets/Info";
// import {CustomOne, CustomTwo} from "./test-widgets/Custom";
// import {ActionOne, ActionTwo} from "./test-widgets/Actions";
//
// import Step1 from "./installSteps/step1"
// import Step2 from "./installSteps/step2"
// https://sailsjs.com/documentation/concepts/models-and-orm/standalone-waterline-usage
const orm = new Waterline();
orm.registerModel(Example);
// orm.registerModel(JsonSchema);
// orm.registerModel(Test);
// orm.registerModel(User);
// //catalog
// orm.registerModel(CatalogGroupNav);
// orm.registerModel(CatalogPageNav);
// orm.registerModel(GroupCatalog);
// orm.registerModel(Page);
// TODO нужно регистрировать системные модели именно в defaultAdapter или как-то указать в bindModels какой адаптер использовать,
//  потому что bindModels должны знать из какого адаптера их доставать (в обычных моделях это можно задать конфигом) (лучше в default)
/** Don't forget to register adminizer system models before initialize */
await WaterlineAdapter.registerSystemModels(orm);
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
    const waterlineAdapter = new WaterlineAdapter({ orm: orm, ontology: ontology }); // ontology contains collections, orm just contains general methods
    const adminizer = new Adminizer([waterlineAdapter]);
    // Add custom install steps
    // if (process.env.ADD_EXAMPLE_INSTALL_STEPS) {
    //     let installStepper = InstallStepper.getInstance();
    //     let step1 = new Step1();
    //     installStepper.addStep(step1)
    //     let step2 = new Step2();
    //     installStepper.addStep(step2)
    // }
    try {
        await adminizer.init(adminpanelConfig);
        // Add widgets
        // adminizer.widgetHandler.add(new SwitcherOne());
        // adminizer.widgetHandler.add(new SwitcherTwo());
        // adminizer.widgetHandler.add(new SiteLinks());
        // adminizer.widgetHandler.add(new InfoOne());
        // adminizer.widgetHandler.add(new InfoTwo());
        // adminizer.widgetHandler.add(new Info3());
        // adminizer.widgetHandler.add(new Info4());
        // adminizer.widgetHandler.add(new CustomOne());
        // adminizer.widgetHandler.add(new CustomTwo());
        // adminizer.widgetHandler.add(new ActionOne());
        // adminizer.widgetHandler.add(new ActionTwo());
    }
    catch (e) {
        console.log(e);
    }
    function expressHandler(subApp) {
        return (req, res) => {
            subApp(req, res, (err) => {
                if (err) {
                    console.log("Err in SubApp", err);
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Internal Server Error');
                }
                else {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('Route Not Found in SubApp');
                }
            });
        };
    }
    // Main app on http
    const mainApp = http.createServer((req, res) => {
        const adminizerHandler = expressHandler(adminizer.app);
        if (req.url.startsWith(routePrefix)) {
            // Delete /adminizer from url
            req.url = req.url.replace(routePrefix, '') || '/';
            adminizerHandler(req, res);
        }
        else if (req.url.startsWith('/@vite') || // Requests to Vite
            req.url.startsWith('/@id') || // Requests to Vite
            req.url.startsWith('/src/assets') || // Requests to source files
            req.url.startsWith('/node_modules')) {
            adminizer.vite.middlewares(req, res);
        }
        else {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Hello from MainApp!');
        }
    });
    mainApp.listen(3000, () => {
        const isViteDev = process.env.VITE_ENV === "dev";
        if (!isViteDev)
            console.log('MainApp listening on http://localhost:3000');
    });
});
