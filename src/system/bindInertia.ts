import flash from "../lib/inertia/flash";
import inertia, {Page} from "../lib/inertia/inertiaAdapter";
import stringify from "json-stable-stringify";
import fs from "fs";
import path from "node:path";
import {Adminizer} from "../lib/Adminizer";

export function bindInertia(adminizer: Adminizer) {

    const viteRender = () => {
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
            <script type="module" src="/src/assets/js/app.tsx"></script>`
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

    const getHtml = (page: Page, _viewData: Record<string, string>) => {
        return `
       <!DOCTYPE html><html lang="${_viewData.lang}">
        <head>
            <meta charset="utf-8"><title inertia></title>
            ${viteRender()}
            </head>
        <body>
            <div id="app" data-page='${stringify(page)}'></div>
        </body>
        </html>
        `;
    };

    // flash messages
    adminizer.app.use(flash());

    // inertia adapter
    adminizer.app.use(
        inertia({
            version: '1',
            html: getHtml,
            flashMessages: (req) => {
                return req.flash.flashAll();
            },
        })
    );

    // set locale
    adminizer.app.use((req, _, next) => {
        req.Inertia.setViewData({
            lang: req.session.UserAP?.locale || 'en',
        })
        next();
    })

    // TODO : remove this, this adds a user for the test
    adminizer.app.use((req, _, next) => {
        req.Inertia.shareProps({
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
}
