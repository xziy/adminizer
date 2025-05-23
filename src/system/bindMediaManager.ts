// import { DefaultMediaManager } from "../lib/media-manager/DefaultMediaManager";
// import { MediaManagerHandler } from "../lib/media-manager/MediaManagerHandler";
// import {Adminizer} from "../lib/Adminizer";
//
// export default function bindMediaManager(adminizer: Adminizer) {
// 	adminizer.emitter.on("orm:loaded", async () => {
// 		try {
// 			// TODO paths problem, default media manager path should be get by config
// 			let mediaManager = new DefaultMediaManager(
// 				adminizer,
// 				'default',
// 				'media-manager',
// 				`${process.cwd()}/.tmp/public/media-manager/`)
//
// 			MediaManagerHandler.add(mediaManager)
// 		} catch (e) {

// 		}
// 	})
// }
