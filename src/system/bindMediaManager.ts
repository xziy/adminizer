import { DefaultMediaManager } from "../lib/media-manager/DefaultMediaManager";
import { MediaManagerHandler } from "../lib/media-manager/MediaManagerHandler";
import {Adminizer} from "../lib/Adminizer";
import serveStatic from "serve-static";
import path from "path";

export default function bindMediaManager(adminizer: Adminizer) {
    if(!adminizer.config.mediamanager) return
	adminizer.emitter.on("adminizer:loaded", async () => {
		try {
			let mediaManager = new DefaultMediaManager(
				adminizer,
				'default',
				'media-manager',
				adminizer.config.mediamanager.fileStoragePath
			)
			MediaManagerHandler.add(mediaManager)
		} catch (e) {
			console.log(e)
		}
	})
	// Bind media manager public folder
	if(adminizer.config.bind?.public && adminizer.config.mediamanager?.fileStoragePath) adminizer.app.use(`/public`, serveStatic(adminizer.config.mediamanager.fileStoragePath));

	// Bind file icons
	adminizer.app.use(`${adminizer.config.routePrefix}/fileicons`, serveStatic(path.join(import.meta.dirname, '../fileicons')));
}
