import { Adminizer } from "../dist/lib/Adminizer";
import http from 'http';
import { WaterlineAdapter } from "../dist/lib/v4/model/adapter/waterline";
import adminpanelConfig from "./adminizerConfig.js";
import Waterline from "waterline";
import waterlineConfig from "./waterlineConfig.js";
import Example from "./models/Example.js";
import JsonSchema from "./models/JsonSchema.js";
import Test from "./models/Test.js";
import User from "./models/User.js";
// TODO придумать как фикстуре проводить tsc, при этом чтобы сохранялась сборка src в dist
const orm = new Waterline();
orm.registerModel(Example);
orm.registerModel(JsonSchema);
orm.registerModel(Test);
orm.registerModel(User);
console.log("orm", orm);
orm.initialize(waterlineConfig, async(err, ontology) => {
    if (err) {
        console.error("Error trying to start Waterline:", err);
        return;
    }
    console.log("Waterline ORM initialized!");
    const Example = ontology.collections.example;
    console.log("Example model", Example)
    let routePrefix = adminpanelConfig.routePrefix;
    process.env.ROUTE_PREFIX = adminpanelConfig.routePrefix;
    /**
     * In case you want to use adminizer built-in adapter, but if not, create your own adapter that extends AbstractAdapter
     * and realize all necessary methods in it
     */
    const waterlineAdapter = new WaterlineAdapter(orm);
    const adminizer = new Adminizer([waterlineAdapter]);
    await adminizer.init(adminpanelConfig as unknown as AdminpanelConfig)
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
        if (req.url.startsWith(routePrefix)) {
            const adminizerHandler = expressHandler(adminizer.app);
            // Delete /adminizer from url
            req.url = req.url.replace(routePrefix, '') || '/';
            adminizerHandler(req, res);
        }
        else {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Hello from MainApp!');
        }
    });
    mainApp.listen(3000, () => {
        console.log('MainApp listening on http://localhost:3000');
    });
});
