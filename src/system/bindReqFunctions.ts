import {Adminizer} from "../lib/Adminizer";
import multer from "multer";
import {I18n} from "../lib/v4/I18n";
import { parse } from "cookie";
import { verifyUser } from "../lib/v4/helper/jwt";

export default function bindReqFunctions(adminizer: Adminizer) {

    let bindReqFunctions = function (req: ReqType, res: ResType, next: () => void) {
        /**
         * Add adminizer to use in controllers
         * */
        req.adminizer = adminizer;

        /**
         * Function to upload files using multer.
         * Filename can be set dynamically based on you filename using simple function
         * */
        // req.upload = (options?: { destination?: string; filename?: (file: Express.Multer.File) => string }) => {
        //     const storage = multer.diskStorage({
        //         destination: (req, file, cb) => {
        //             const destination = options?.destination || "uploads/";
        //             cb(null, destination);
        //         },
        //         filename: (req, file, cb) => {
        //             const filename =
        //                 options?.filename?.(file) || `${Date.now()}-${file.originalname}`;
        //             cb(null, filename);
        //         },
        //     });
        //
        //     return multer({storage});
        // };

        /**
         * Add i18n
         * */
        req.i18n = new I18n({locales: adminizer.config.translation !== false ? adminizer.config.translation.locales : []});
        if (res.locals) {
            req.i18n.registerMethods(res.locals, req)
        }

        // NOTE: This is here because inertia should receive data to routes
        // JWT token
        const cookies = parse(req.headers.cookie || '');
        const token = cookies.adminizer_jwt;
      
        if (token) {
          const user = verifyUser(token, req.adminizer.jwtSecret);
          if (user) {
            req.user = user;
          }
        }
        
        if(req.session.userPretended) {
            req.user = req.session.userPretended;
        }

        next();
    };

    adminizer.app.use('/', bindReqFunctions);
    adminizer.app.use('/*', bindReqFunctions);

    Adminizer.log.info("Adminizer upload loaded");
}
