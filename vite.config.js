import {defineConfig, normalizePath} from 'vite';
import path from 'path';
import {
    copyFiles
} from './vite-plugin/copyFiles.js'
import fullReload from 'vite-plugin-full-reload'

export default defineConfig(({command, mode}) => {
    copyFiles(command)

    return {
        build: {
            outDir: path.resolve(import.meta.dirname, 'dist/assets'), // Папка для сборки
            assetsDir: '',
            emptyOutDir: true, // Очищать папку перед сборкой
            manifest: 'manifest.json', // Генерировать manifest.json
            rollupOptions: {
                input: {
                    main: path.resolve(import.meta.dirname, 'src/assets/js/main.js'), // Точка входа для JS
                    // styles: path.resolve(__dirname, 'src/client/css/main.css'), // Точка входа для CSS
                },
                output: {
                    entryFileNames: 'js/[name].js',
                }
            }
        },
        plugins: [
            fullReload(['src/views/**/*'])
        ],
    }
});
