import {Adminizer} from "../dist/lib/Adminizer";
import http from 'http';
import {WaterlineAdapter, WaterlineModel} from "../dist/lib/v4/model/adapter/waterline";
import adminpanelConfig from "./adminizerConfig";
import {AdminpanelConfig} from "../dist/interfaces/adminpanelConfig";
import Waterline from "waterline";
import waterlineConfig from "./waterlineConfig";
import Example from "./models/Example";
import Test from "./models/Test";
import {ReactQuill} from "../modules/controls/wysiwyg/ReactQuill";

// https://sailsjs.com/documentation/concepts/models-and-orm/standalone-waterline-usage
const orm = new Waterline();
orm.registerModel(Example);
orm.registerModel(Test);

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


    // Add custom module
    adminizer.emitter.on('adminizer:loaded', () => {
        let policies: MiddlewareType[] = adminizer.config.policies;
        const module = (req: ReqType, res: ResType) => {
            if (req.adminizer.config.auth) {
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
