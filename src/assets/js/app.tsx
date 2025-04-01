/// <reference types="vite/client" />
import '../css/app.css';
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
        color: '#0f4898',
    },
})
