/// <reference types="vite/client" />
import '../css/app.css';
import 'handsontable/styles/handsontable.min.css';
import 'handsontable/styles/ht-theme-main.min.css';
import 'vanilla-jsoneditor/themes/jse-theme-dark.css'
import '@toast-ui/editor/dist/toastui-editor.css';
import '@toast-ui/editor/dist/theme/toastui-editor-dark.css'
import "leaflet/dist/leaflet.css";

import * as InertiajsReact from '@inertiajs/react'
import { createRoot } from 'react-dom/client';
import React from 'react';
import ReactDOM from 'react-dom';
import { registerUIComponents } from "./ui-globals";
import * as LucideReact from 'lucide-react'
const { createInertiaApp } = InertiajsReact;
window.React = React;
window.ReactDOM = ReactDOM;
//@ts-ignore
window.InertiajsReact = InertiajsReact


// Passing icons
//@ts-ignore 
window.LucideReact = LucideReact

registerUIComponents();

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
    title: (title) => `${title}`,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({el, App, props}) {
        const root = createRoot(el);
        root.render(<App {...props} />);
    },
    progress: {
        color: '#0f4898'
    },
})
