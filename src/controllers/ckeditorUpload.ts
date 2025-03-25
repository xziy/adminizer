import { ControllerHelper } from "../helpers/controllerHelper";
import * as fs from "fs";
import {Adminizer} from "../lib/Adminizer";

export default function upload(req: ReqType, res: ResType): void {

	//console.log('admin > CK-upload');
	let entity = ControllerHelper.findEntityObject(req);

	if (req.adminizer.config.auth) {
		if (!req.session.UserAP) {
			res.redirect(`${req.adminizer.config.routePrefix}/model/userap/login`);
			return
		} else if (!req.adminizer.accessRightsHelper.enoughPermissions([
			`update-${entity.name}-model`,
			`create-${entity.name}-model`,
			`update-${entity.name}-form`,
			`create-${entity.name}-form`
		], req.session.UserAP)) {
			res.sendStatus(403);
			return
		}
	}

	if (req.method.toUpperCase() === "POST") {
		try {
			// set upload directory
			const dirDownload = `uploads/${entity.type}/${entity.name}/ckeditor`;
			const dir = `${process.cwd()}/.tmp/public/${dirDownload}/`;

			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir, { recursive: true });
			}

			// save file
			const filenameOrig = req.body.name.replace(' ', '_');
			let filename = filenameOrig.replace(/$/, '_prefix');

			req.upload({
				destination: dir,
				filename: () => filename
			}).single("image")(req, res, (err) => {
				if (err) {
					Adminizer.logger.error("Error uploading file:", err);
					return res.status(500).send({ error: err.message || "Internal Server Error" });
				}

				return res.send({
					msg: "success",
					url: `/${dirDownload}/${filename}`,
				});
			});
		} catch (error) {
			Adminizer.logger.error("Error in uploadImage:", error);
			res.status(500).send({ error: "Internal Server Error" });
		}
	}
}
