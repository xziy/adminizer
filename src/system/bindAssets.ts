import serveStatic from 'serve-static';
import * as path from "path";
import {Express} from "express";

export default function bindAssets(app: Express, routePrefix: string) {
  app.use(`${routePrefix}/assets`, serveStatic(path.join(import.meta.dirname, '../assets')));
}
