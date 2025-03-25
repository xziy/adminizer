import {RequestHandler, Response, Request} from 'express';

type props = Record<string | number | symbol, unknown>;

export type Options = {
    readonly enableReload?: boolean;
    readonly version: string;
    readonly html: (page: Page, viewData: props) => string;
    readonly flashMessages?: (req: Request) => props;
};

export type Page = {
    readonly component: string;
    props: props;
    readonly url: string;
    readonly version: string;
};
export type Inertia = {
    readonly setViewData: (viewData: props) => Inertia;
    readonly shareProps: (sharedProps: props) => Inertia;
    readonly setStatusCode: (statusCode: number) => Inertia;
    readonly setHeaders: (headers: Record<string, string>) => Inertia;
    readonly render: (Page: Page) => Promise<Response>;
    readonly redirect: (url: string) => Response;
};
export const headers = {
    xInertia: 'x-inertia',
    xInertiaVersion: 'x-inertia-version',
    xInertiaLocation: 'x-inertia-location',
    xInertiaPartialData: 'x-inertia-partial-data',
    xInertiaPartialComponent: 'x-inertia-partial-component',
    xInertiaCurrentComponent: 'x-inertia-current-component',
};

const inertiaExpressAdapter: (options: Options) => RequestHandler = function (
    {
        version,
        html,
        flashMessages,
        enableReload = false,
    }) {
    return (req, res, next) => {
        if (
            req.method === 'GET' &&
            req.headers[headers.xInertia] &&
            req.headers[headers.xInertiaVersion] !== version
        ) {
            req.session.destroy(() => {
                res.writeHead(409, {[headers.xInertiaLocation]: req.url}).end();
            });
            return;
        }

        let _viewData = {};
        let _sharedProps: props = {};
        let _statusCode = 200;
        let _headers: Record<string, string | string[] | undefined> = {};

        const Inertia: Inertia = {
            setViewData(viewData) {
                _viewData = viewData;
                return this;
            },

            shareProps(sharedProps) {
                _sharedProps = {..._sharedProps, ...sharedProps};
                return this;
            },

            setStatusCode(statusCode) {
                _statusCode = statusCode;
                return this;
            },

            setHeaders(headers) {
                _headers = {...req.headers, ..._headers, ...headers};
                return this;
            },
            async render({props, ...pageRest}) {
                const _page: Page = {
                    ...pageRest,
                    url: req.originalUrl || req.url,
                    version,
                    props,
                };
                if (flashMessages) {
                    this.shareProps(flashMessages(req));
                }
                if (enableReload) {
                    req.session.xInertiaCurrentComponent = pageRest.component;
                }
                const allProps = {..._sharedProps, ...props};

                let dataKeys;
                const partialDataHeader = req.headers[headers.xInertiaPartialData];
                if (
                    partialDataHeader &&
                    req.headers[headers.xInertiaPartialComponent] === _page.component &&
                    typeof partialDataHeader === 'string'
                ) {
                    dataKeys = partialDataHeader.split(',');
                } else {

                    dataKeys = Object.keys(allProps);
                }

                // we need to clear the props object on each call
                const propsRecord: props = {};
                for await (const key of dataKeys) {
                    let value;
                    if (typeof allProps[key] === 'function') {
                        value = await (allProps[key] as () => unknown)();
                    } else {
                        value = allProps[key];
                    }
                    propsRecord[key] = value;
                }
                _page.props = propsRecord;

                if (req.headers[headers.xInertia]) {
                    res
                        .status(_statusCode)
                        .set({
                            // ...req.headers,
                            ..._headers,
                            'Content-Type': 'application/json',
                            [headers.xInertia]: 'true',
                            Vary: 'Accept',
                        })
                        .send(JSON.stringify(_page));
                } else {
                    res
                        .status(_statusCode)
                        .set({
                            ...req.headers,
                            ..._headers,
                            'Content-Type': 'text/html',
                        })
                        .send(html(_page, _viewData));
                }
                return res;
            },

            redirect(url) {
                const statusCode = ['PUT', 'PATCH', 'DELETE'].includes(req.method)
                    ? 303
                    : 302;
                res.redirect(statusCode, url);
                return res;
            },
        };


        req.Inertia = Inertia;

        return next();
    };
};
export default inertiaExpressAdapter;
