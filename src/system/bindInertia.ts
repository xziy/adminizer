import flash from "../lib/inertia/flash";
import inertia, {Page} from "../lib/inertia/inertiaAdapter";
import stringify from "json-stable-stringify";
import fs from "fs";
import path from "node:path";
import {Adminizer} from "../lib/Adminizer";
import {InertiaMenuHelper} from "../helpers/inertiaMenuHelper";

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
            <script type="module" src="/src/assets/js/app.tsx"></script>
            <script>window.routePrefix = "${adminizer.config.routePrefix}"</script>
            `
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


    adminizer.app.use((req, _, next) => {
        let locale: string = ""

        if (typeof adminizer.config.translation !== 'boolean') {
            locale = adminizer.config.translation.defaultLocale
        }
        if (!adminizer.config.auth) {
            if (req.session.UserAP) {
                req.session.UserAP.isAdministrator = true;
            } else {
                req.session.UserAP = {
                    id: 0,
                    isAdministrator: true,
                    locale: locale,
                    login: "admin",
                    email: "email@email.com",
                }
            }
        }
        req.Inertia.setViewData({
            lang: req.session.UserAP?.locale || 'en',
        })

        const menuHelper = new InertiaMenuHelper(adminizer)

        req.Inertia.shareProps({
            auth: {
                user: req.session.UserAP
            },
            menu: menuHelper.getMenuItems(req),
            brand: menuHelper.getBrandTitle(),
        })

        next();
    })
}
