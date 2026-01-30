import sharp from "sharp";
import { promises as fs } from 'fs';
import path from 'path';
import { Adminizer } from "../Adminizer";

export class MediaManagerThumb {
    public static async getThumb(id: string, managerId: string, adminizer: Adminizer) {
        const fileExists = async (filePath: string) => {
            try {
                await fs.stat(filePath);
                return true;
            } catch {
                return false;
            }
        };

        const manager = adminizer.mediaManagerHandler.get(managerId);
        const filePath = await manager.getOrigin(id);
        
        // Проверяем, является ли путь уже абсолютным
        const isAbsolute = path.isAbsolute(filePath);
        
        // Формируем правильный путь к исходному файлу
        const sourcePath = isAbsolute ? 
            path.normalize(filePath) : // Если путь уже абсолютный, нормализуем его
            path.join(process.cwd(), filePath); // Если относительный, добавляем base
        
        
        // Путь для thumbnail
        const baseThumbPath = path.join(process.cwd(), '.tmp', 'thumbs');
        await fs.mkdir(baseThumbPath, { recursive: true });
        
        const thumbPath = path.join(baseThumbPath, `${id}_thumb.webp`);
        
        if (await fileExists(thumbPath)) {
            return await fs.readFile(thumbPath);
        }
        
        // Проверяем существование файла
        if (!await fileExists(sourcePath)) {
            throw new Error(`Source file not found: ${sourcePath}\n` +
                           `Check if file exists at: ${sourcePath}\n` +
                           `Original path from manager: ${filePath}`);
        }
        
        // Создаем thumbnail
        await sharp(sourcePath)
            .resize({ width: 150, height: 150, fit: 'cover' })
            .toFile(thumbPath);
            
        return await fs.readFile(thumbPath);
    }
}