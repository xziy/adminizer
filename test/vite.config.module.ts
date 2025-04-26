import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {viteExternalsPlugin} from "vite-plugin-externals";

export default defineConfig({
    define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    },
    plugins: [
        react(),
        viteExternalsPlugin({
            react: 'React',
            'react-dom': 'ReactDOM',
        }),
    ],
    build: {
        outDir: path.resolve(import.meta.dirname, ''),
        // outDir: path.resolve(import.meta.dirname, 'dist/assets'),
        emptyOutDir: false,
        lib: {
            // Точка входа для библиотеки
            entry: path.resolve(import.meta.dirname, 'ComponentB.tsx'),
            name: 'ComponentB',
            formats: ['es'],
            fileName: (format) => `ComponentB.${format}.js`,
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, '../../src/assets/js'),
        },
    },
});
