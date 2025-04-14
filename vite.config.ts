import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from "path";
import tailwindcss from "@tailwindcss/vite";

const ReactConfig = {
    babel: {
        plugins: [
            ['babel-plugin-react-compiler'],
        ]
    }
};


export default defineConfig({
    base: './',
    build: {
        outDir: path.resolve(import.meta.dirname, 'dist/assets'), // Output directory for the build
        assetsDir: '',
        emptyOutDir: true, // Clear the output directory before building
        manifest: 'manifest.json', // Generate manifest.json
        rollupOptions: {
            input: {
                app: path.resolve(import.meta.dirname, 'src/assets/js/app.tsx'),
            },
            output: {
                entryFileNames: '[name].js',
                assetFileNames: '[name]-[hash][extname]',
            },
        },
    },
    plugins: [
        react(ReactConfig),
        tailwindcss(),
    ],
    esbuild: {
        jsx: 'automatic',
    },
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, './src/assets/js'),
        },
    },
})
