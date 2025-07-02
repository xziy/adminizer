import session from 'express-session';
import bodyParser from "body-parser";
import {Express} from "express";
import multer from 'multer';
const upload = multer();

export default function bindExpressUtils(app: Express) {
  /** Bind express session */
  app.use(
    session({
      secret: 'adminizer-secret',
      resave: false,
      saveUninitialized: true,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24, // session expire in 1 day
      },
    })
  );

  /** Bind multer (important: before body-parser) */
  // app.use(upload.none()); // Processes form-data without files

  /** Bind body-parser */
  app.use(bodyParser.urlencoded({ extended: true })); // To process application/x-www-form-urlencoded
  app.use(bodyParser.json()); // To process JSON

  /** Bind static files */
  // app.use('/static', adminizer.express.static('public'));
}
