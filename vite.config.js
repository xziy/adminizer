import {defineConfig} from 'vite';
import path from 'path';
import {copyFiles} from './vite-plugin/copyFiles.js'
import fullReload from 'vite-plugin-full-reload'
import tailwindcss from "@tailwindcss/vite";
import vue from '@vitejs/plugin-vue'

export default defineConfig(({command, mode}) => {
    copyFiles(command);
    return {
        build: {
            outDir: path.resolve(import.meta.dirname, 'dist/assets/build'), // Output directory for the build
            assetsDir: '',
            emptyOutDir: false, // Clear the output directory before building
            manifest: 'manifest.json', // Generate manifest.json
            rollupOptions: {
                input: {
                    main: path.resolve(import.meta.dirname, 'src/assets/js/main.js'), // Entry point for JS
                    widgets: path.resolve(import.meta.dirname, 'src/assets/js/widgets/app.js'), // Entry point for Widgets JS
                    datatable: path.resolve(import.meta.dirname, 'src/assets/js/listDataTable.js'), // Entry point for Datatable JS
                    handsontable: path.resolve(import.meta.dirname, 'src/assets/js/handsontable.js'), // Entry point for Handsontable JS
                    styles: path.resolve(import.meta.dirname, 'src/assets/styles/style.css'), // Entry point for CSS
                },
                output: {
                    entryFileNames: 'js/[name]-[hash].js',
                    assetFileNames: 'styles/[name]-[hash][extname]'
                }
            },
            css: {
                devSourcemap: true, // Enable source maps for CSS in development
            },
        },
        plugins: [
            fullReload(['src/views/**/*']), // Reload on changes in views
            tailwindcss(),
            vue()
        ],
        resolve: {
            alias: {
                '@node_modules': path.resolve(import.meta.dirname, 'node_modules'),
                '@js': path.resolve(import.meta.dirname, 'src/assets/js'),
                '@css': path.resolve(import.meta.dirname, 'src/assets/styles'),
            },
        }
    }
});
