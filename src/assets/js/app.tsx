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

// import { Button } from '@/components/ui/button.tsx';

window.React = React;
window.ReactDOM = ReactDOM;


// TODO Test Btn for module. When we write the modules, we need to test this. If everything goes well, then you need to move all UI components to the global window variable, as with a button, and analyze the components to exclude imports. Instead, use window.UIComponents['need component'].
// @ts-ignore
// window.UIComponents = window.UIComponents || {};
// @ts-ignore
// window.UIComponents.Button = Button;


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
