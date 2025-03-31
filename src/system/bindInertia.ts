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
            const manifestPath = path.resolve(import.meta.dirname, '../assets/manifest.json');
            if (!fs.existsSync(manifestPath)) {
                console.log('[vite]: Warning: manifest.json not found in dist folder! Please run "npm run build" first.');
                return '';
            }

            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
            const entry = manifest['src/assets/js/app.tsx'];

            if (!entry) {
                console.error('[vite]: Entry point not found in manifest.json');
                return '';
            }

            // Preload critical resources
            const preloadLinks = [];
            const stylesheets: string[] = [];
            const scripts = [];

            // CSS resources
            if (entry.css) {
                entry.css.forEach((file: string) => {
                    const href = `${adminizer.config.routePrefix}/assets/${file}`;
                    preloadLinks.push(`<link rel="preload" href="${href}" as="style">`);
                    stylesheets.push(`<link rel="stylesheet" href="${href}">`);
                });
            }

            // JS resource
            if (entry.file) {
                const href = `${adminizer.config.routePrefix}/assets/${entry.file}`;
                preloadLinks.push(`<link rel="modulepreload" href="${href}" as="script">`);
                scripts.push(`<script type="module" src="${href}"></script>`);
            }

            // Route prefix script
            const routePrefixScript = `<script>window.routePrefix = "${adminizer.config.routePrefix}";</script>`;

            return `
                ${preloadLinks.join('\n')}
                ${stylesheets.join('\n')}
                ${scripts.join('\n')}
                ${routePrefixScript}
        `;
        }
    };

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
            flashMessages: (req: ReqType) => {
                return req.flash.flashAll();
            },
        })
    );


    adminizer.app.use((req: ReqType, _, next) => {
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
