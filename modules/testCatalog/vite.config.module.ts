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
        emptyOutDir: false,
        lib: {
            // Указываем несколько точек входа
            entry: {
                catalogAction: path.resolve(import.meta.dirname, 'action.tsx'),
                Group: path.resolve(import.meta.dirname, 'group.tsx'),
                // Можно добавить больше компонентов
            },
            // name больше не нужно, так как у каждого компонента будет свое имя
            formats: ['es'],
            fileName: (format, entryName) => `${entryName}.${format}.js`,
        },
        rollupOptions: {
            external: [
                'tailwindcss',
            ],
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, '../../src/assets/js'),
        },
    },
});