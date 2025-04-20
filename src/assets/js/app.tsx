/// <reference types="vite/client" />
import '../css/app.css';
import 'handsontable/styles/handsontable.min.css';
import 'handsontable/styles/ht-theme-main.min.css';
import 'vanilla-jsoneditor/themes/jse-theme-dark.css'
import '@toast-ui/editor/dist/toastui-editor.css';
import '@toast-ui/editor/dist/theme/toastui-editor-dark.css'
import "leaflet/dist/leaflet.css";

import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import React from 'react';
import ReactDOM from 'react-dom';

window.React = React;
window.ReactDOM = ReactDOM;

const appName = 'Adminizer';

export async function resolvePageComponent<T>(path: string | string[], pages: Record<string, Promise<T> | (() => Promise<T>)>): Promise<T>{
    for (const p of (Array.isArray(path) ? path : [path])) {
        const page = pages[p];
        if (typeof page === 'undefined') {
            continue;
        }
        return typeof page === 'function' ? page() : page;
    }
    throw new Error(`Page not found: ${path}`);
}

createInertiaApp({
    title: (title) => `${title}${appName}`,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({el, App, props}) {
        const root = createRoot(el);
        root.render(<App {...props} />);
    },
    progress: {
        color: '#0f4898'
    },
})
