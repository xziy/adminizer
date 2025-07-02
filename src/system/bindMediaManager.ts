import { DefaultMediaManager } from "../lib/media-manager/DefaultMediaManager";
import { MediaManagerHandler } from "../lib/media-manager/MediaManagerHandler";
import {Adminizer} from "../lib/Adminizer";

export default function bindMediaManager(adminizer: Adminizer) {
	adminizer.emitter.on("adminizer:loaded", async () => {
		try {
			let mediaManager = new DefaultMediaManager(
				adminizer,
				'default',
				'media-manager',
				adminizer.config.mediamanager.fileStoragePath)
			MediaManagerHandler.add(mediaManager)
		} catch (e) {
			console.log(e)
		}
	})
}
