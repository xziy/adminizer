import {defineConfig, normalizePath} from 'vite';
import path from 'path';
import {
    createSymlinkIfNotExists,
    copyFolderRecursiveSync,
    removeSymlinkIfExists,
    removeFolderIfExists
} from './vite-plugin/setupViews.js'

export default defineConfig(({command, mode}) => {
    const isDev = command === 'serve'; // true, если запущен dev-сервер
    const isBuild = command === 'build'; // true, если запущена сборка

    const linkPath = normalizePath(path.resolve(import.meta.dirname, 'dist/views')); // Путь к символической ссылке
    const targetPath = normalizePath(path.resolve(import.meta.dirname, 'src/views')); // Путь к целевой папке

    if (isDev) {
        // Режим разработки: создаём символическую ссылку
        removeFolderIfExists(linkPath); // Удаляем папку, если она существует
        createSymlinkIfNotExists(targetPath, linkPath);
    } else if (isBuild) {
        // Режим build: удаляем ссылку и копируем папку
        removeSymlinkIfExists(linkPath);
        removeFolderIfExists(linkPath); // Удаляем папку, если она существует
        copyFolderRecursiveSync(targetPath, linkPath);
    } else {
        console.error('Неверный режим.');
    }

    return {
        build: {
            outDir: path.resolve(import.meta.dirname, 'dist/assets'), // Папка для сборки
            assetsDir: '',
            emptyOutDir: true, // Очищать папку перед сборкой
            manifest: 'manifest.json', // Генерировать manifest.json
            rollupOptions: {
                input: {
                    main: path.resolve(import.meta.dirname, 'src/assets/vite/main.js'), // Точка входа для JS
                    // styles: path.resolve(__dirname, 'src/client/css/main.css'), // Точка входа для CSS
                }
            }
        }
    }
});
