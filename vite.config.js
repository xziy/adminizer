import {defineConfig} from 'vite';
import path from 'path';
import {copyFiles} from './vite-plugin/copyFiles.js'
import fullReload from 'vite-plugin-full-reload'
import tailwindcss from "@tailwindcss/vite";


export default defineConfig(({ command, mode }) => {
    copyFiles(command);

    return {
        build: {
            outDir: path.resolve(import.meta.dirname, 'dist/assets'), // Output directory for the build
            assetsDir: '',
            emptyOutDir: true, // Clear the output directory before building
            manifest: 'manifest.json', // Generate manifest.json
            rollupOptions: {
                input: {
                    main: path.resolve(import.meta.dirname, 'src/assets/js/main.js'), // Entry point for JS
                    styles: path.resolve(import.meta.dirname, 'src/assets/styles/style.css'), // Entry point for CSS
                },
                output: {
                    entryFileNames: 'js/[name]-[hash].js',
                    assetFileNames: 'styles/[name]-[hash].css'
                }
            }
        },
        plugins: [
            fullReload(['src/views/**/*']), // Reload on changes in views
            tailwindcss(),
        ],
        resolve: {
            alias: {
                '@node_modules': path.resolve(import.meta.dirname, 'node_modules'),
            },
        },
    }
});
