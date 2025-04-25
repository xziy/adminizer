import {Adminizer} from "../lib/Adminizer";
import multer from "multer";
import {I18n} from "../lib/v4/I18n";

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
        req.upload = (options?: { destination?: string; filename?: (file: Express.Multer.File) => string }) => {
            const storage = multer.diskStorage({
                destination: (req, file, cb) => {
                    const destination = options?.destination || "uploads/";
                    cb(null, destination);
                },
                filename: (req, file, cb) => {
                    const filename =
                        options?.filename?.(file) || `${Date.now()}-${file.originalname}`;
                    cb(null, filename);
                },
            });

            return multer({storage});
        };

        /**
         * Add i18n
         * */
        req.i18n = new I18n({locales: adminizer.config.translation !== false ? adminizer.config.translation.locales : []});
        if (res.locals) {
            req.i18n.registerMethods(res.locals, req)
        }



        next();
    };

    adminizer.app.use('/', bindReqFunctions);
    adminizer.app.use('/*', bindReqFunctions);

    Adminizer.log.info("Adminizer upload loaded");
}
