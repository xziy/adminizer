import fs from 'fs';
import path from 'path';

/**
 * Создаёт символическую ссылку на папку, если она не существует.
 * @param {string} targetPath - Путь к папке, на которую будет указывать ссылка.
 * @param {string} linkPath - Путь, по которому будет создана символическая ссылка.
 */
export function createSymlinkIfNotExists(targetPath, linkPath) {
    try {
        // Проверяем, существует ли целевая папка
        if (!fs.existsSync(targetPath)) {
            console.log(`Целевая папка не существует: ${targetPath}`);
            return;
        }

        // Проверяем, существует ли уже ссылка
        if (fs.existsSync(linkPath)) {
            console.log(`Символическая ссылка уже существует: ${linkPath}`);
            return;
        }

        // Проверяем, существует ли родительская директория для ссылки
        const parentDir = path.dirname(linkPath);
        if (!fs.existsSync(parentDir)) {
            console.log(`Родительская директория отсутствует. Создаю: ${parentDir}`);
            fs.mkdirSync(parentDir, { recursive: true });
        }

        // Создаём символическую ссылку
        console.log(`Создаю символическую ссылку: ${linkPath} -> ${targetPath}`);
        fs.symlinkSync(targetPath, linkPath, 'dir');
    } catch (err) {
        console.error(`Ошибка при создании символической ссылки: ${err.message}`);
    }
}

/**
 * Копирует папку рекурсивно.
 * @param {string} source - Путь к исходной папке.
 * @param {string} target - Путь к целевой папке.
 */
export function copyFolderRecursiveSync(source, target) {
    try {
        // Проверяем, существует ли исходная папка
        if (!fs.existsSync(source)) {
            console.log(`Исходная папка не существует: ${source}`);
            return;
        }

        // Проверяем, существует ли целевая папка
        if (!fs.existsSync(target)) {
            console.log(`Целевая папка не существует. Создаю: ${target}`);
            fs.mkdirSync(target, { recursive: true });
        }

        // Читаем содержимое исходной папки
        const files = fs.readdirSync(source);
        files.forEach(file => {
            const curSource = path.join(source, file);
            const curTarget = path.join(target, file);

            // Рекурсивно копируем каждый элемент
            const stats = fs.lstatSync(curSource);
            if (stats.isDirectory()) {
                copyFolderRecursiveSync(curSource, curTarget);
            } else {
                fs.copyFileSync(curSource, curTarget);
            }
        });
    } catch (err) {
        console.error(`Ошибка при копировании папки: ${err.message}`);
    }
}

/**
 * Удаляет символическую ссылку, если она существует.
 * @param {string} linkPath - Путь к символической ссылке.
 */
export function removeSymlinkIfExists(linkPath) {
    try {
        if (fs.existsSync(linkPath)) {
            const stats = fs.lstatSync(linkPath);
            if (stats.isSymbolicLink()) {
                console.log(`Удаляю символическую ссылку: ${linkPath}`);
                fs.unlinkSync(linkPath);
            }
        }
    } catch (err) {
        console.error(`Ошибка при удалении символической ссылки: ${err.message}`);
    }
}

/**
 * Удаляет папку, если она существует и это не символическая ссылка.
 * @param {string} folderPath - Путь к папке.
 */
export function removeFolderIfExists(folderPath) {
    try {
        if (fs.existsSync(folderPath)) {
            const stats = fs.lstatSync(folderPath);
            if (stats.isDirectory() && !stats.isSymbolicLink()) {
                console.log(`Удаляю папку: ${folderPath}`);
                fs.rmSync(folderPath, { recursive: true, force: true });
            }
        }
    } catch (err) {
        console.error(`Ошибка при удалении папки: ${err.message}`);
    }
}
