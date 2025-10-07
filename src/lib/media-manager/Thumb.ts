import sharp from "sharp";
import {promises as fs} from 'fs';
import {Adminizer} from "../Adminizer";

export class MediaManagerThumb {
    public static async getThumb(id: string, managerId: string, adminizer: Adminizer) {
        const fileExists = async (path: string) => !!(await fs.stat(path).catch(e => false));

        const manager = adminizer.mediaManagerHandler.get(managerId)
        const path = await manager.getOrigin(id)
        const baseThumbPath = `${process.cwd()}/.tmp/thumbs`

        await fs.mkdir(baseThumbPath, { recursive: true });

        const thumb = `${baseThumbPath}/${id}_thumb.webp`
        if (await fileExists(thumb)) {
            return await fs.readFile(thumb)
        } else {
            await sharp(`${process.cwd()}/${path}`)
                .resize({width: 150, height: 150})
                .toFile(thumb)
            return await fs.readFile(thumb)
        }
    }
}