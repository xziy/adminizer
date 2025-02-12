import {Adminizer} from "../dist/lib/Adminizer";
import http from 'http';
// import { DataSource } from "typeorm";
import {WaterlineAdapter, WaterlineModel} from "../dist/lib/v4/model/adapter/waterline";
import adminpanelConfig from "./adminizerConfig";
import {AdminpanelConfig} from "../src";

// Typeorm
// const AppDataSource = new DataSource({
//   type: "sqlite",
//   database: "database.sqlite",
//   entities: [Example, JsonSchema, Navigation, Test, User],
//   synchronize: true,
// });
//
//
// // Инициализация DataSource
// await AppDataSource.initialize();
//
// // Список всех зарегистрированных сущностей
// const entities = AppDataSource.options.entities || [];
//
// (async () => {
//   // Создаем объект models с ключами в нижнем регистре
//   const models = entities.reduce((acc: any, entity: any) => {
//     const entityName = entity.name.toLowerCase(); // Преобразуем имя сущности в нижний регистр
//     acc[entityName] = AppDataSource.getRepository(entity); // Добавляем репозиторий сущности
//     return acc;
//   }, {} as Record<string, any>);
//
//
//   // Пример использования модели User через объект models
//   const userRepository = models["user"];
//   const user = await userRepository.findOne({ where: { id: 1 } });
//   console.log("Found user:", user);
// })();



let routePrefix = adminpanelConfig.routePrefix;
process.env.ROUTE_PREFIX = adminpanelConfig.routePrefix;

// TODO waterline нужно создать выше

// In case you want to use adminizer adapter, but if not, create own adapter that extends AbstractAdapter and realize all necessary methods in it
const waterlineAdapter = new WaterlineAdapter(waterline.models);

const adminizer = new Adminizer([waterlineAdapter]);
adminizer.init(adminpanelConfig as unknown as AdminpanelConfig)

function expressHandler(subApp: any) {
  return (req: any, res: any) => {
    subApp(req, res, (err: any) => {
      if (err) {
        console.log("Err in SubApp", err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      } else {
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
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello from MainApp!');
  }
});

mainApp.listen(3000, () => {
  console.log('MainApp listening on http://localhost:3000');
});
