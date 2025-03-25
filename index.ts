import express from 'express';
import session from 'express-session';
import stringify from 'json-stable-stringify';
import serveStatic from 'serve-static';

import inertia, {Page} from './lib/inertiaAdapter';
import flash from './lib/flash';
import {createServer as createViteServer, ViteDevServer} from 'vite';
import path from "path";
import fs from "fs";

export function getHtml(page: Page) {
    return `
        <!DOCTYPE html><html lang="en">
        <head>
            <meta charset="utf-8"><title inertia></title>`
        +
        viteRender()
        +
        `</head>
        <body>
            <div id="app" data-page='${stringify(page)}'></div>
        </body>
        </html>
`;
}

function viteRender() {
    if (process.env.VITE_ENV === 'dev') {
        return `
            <script type="module">
                import RefreshRuntime from "/@react-refresh"
                RefreshRuntime.injectIntoGlobalHook(window)
                window.$RefreshReg$ = () => {}
                window.$RefreshSig$ = () => (type) => type
                window.__vite_plugin_react_preamble_installed__ = true
            </script>
            <script type="module" src="/@vite/client"></script>
            <script type="module" src="/assets/js/app.tsx"></script>`
    } else {
        const manifestPath = path.resolve(import.meta.dirname, './dist/manifest.json');
        if (!fs.existsSync(manifestPath)) {
            console.log('[vite]: Warning: manifest.json not found in dist folder! Please run "npm run build" first.');
            return ''
        }
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        return `
            <script type="module" src="/dist/${manifest['assets/js/app.tsx']?.file}"></script>
        `
    }
}

const version = '1';
const createServer = async () => {
    const app = express();

    app.use(session({
        secret: 'secret',
        resave: true,
        saveUninitialized: true
    }));

    const pages = {
        dashboard: {
            component: 'dashboard',
            props: {
                controls: [
                    {
                        component: 'ComponentA',
                        props: {
                            message: 'Привет, это динамически загруженный компонент A',
                        },
                    },
                    {
                        component: '/dist/ComponentB.es.js',
                        // component: '/modules/ComponentB.tsx',
                        props: null,
                    },
                ]
            }, url: '/', version
        },
        page: {component: 'Page', props: {name: 'Props Page'}, url: '/page', version},
    };

    const router = express.Router();

    router.get('/flash', async (req, _res, next) => {
        // set session data
        req.flash.setFlashMessage('success', 'User created successfully');
        await req.Inertia.render(pages.dashboard);
        return next();
    });
    router.get('/', async (req, _res, next) => {
        await req.Inertia.render(pages.dashboard);
        return next();
    });

    router.get('/page', async (req, _res, next) => {
        await req.Inertia.render(pages.page);
        return next();
    });

    app.use(flash());
    app.use(
        inertia({
            version,
            html: getHtml,
            flashMessages: (req) => {
                return req.flash.flashAll();
            },
        })
    );
    app.use(({Inertia}, _, next) => {
        Inertia.shareProps({
            auth: {
                user: {
                    id: 1,
                    name: "admin",
                    email: "email@email.com",
                    email_verified_at: null,
                    created_at: '1742921933',
                    updated_at: '1742921933',
                }
            }
        })
        next();
    })
    if (process.env.VITE_ENV === 'dev') {
        const vite: ViteDevServer = await createViteServer({
            server: {middlewareMode: true}, // Enable middleware mode
            appType: 'custom', // Specify the application type
        });

        app.use(vite.middlewares);
    } else {
        app.use('/dist', serveStatic(path.join(import.meta.dirname, '/dist')));
    }
    app.use(router);

    app.listen(5174)
}

createServer().then(() => {
    console.log("http://localhost:5174")
})
