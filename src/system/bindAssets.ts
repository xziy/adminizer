import serveStatic from 'serve-static';
import * as path from "path";
import {Express} from "express";

export default function bindAssets(app: Express) {
  app.use('/assets', serveStatic(path.join(import.meta.dirname, '../assets')));
}
