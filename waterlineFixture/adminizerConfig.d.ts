declare const _default: {
    routePrefix: string;
    dashboard: boolean;
    forms: {
        path: string;
        data: {
            global: {
                field1: {
                    title: string;
                    type: string;
                    value: string;
                    required: boolean;
                    tooltip: string;
                    description: string;
                };
            };
        };
    };
    navbar: {
        additionalLinks: {
            id: number;
            link: string;
            title: string;
            icon: string;
            accessRightsToken: string;
        }[];
    };
    sections: ({
        id: string;
        title: string;
        link: string;
        icon: string;
        subItems: {
            id: string;
            title: string;
            link: string;
            icon: string;
        }[];
    } | {
        id: string;
        title: string;
        link: string;
        icon: string;
        subItems?: undefined;
    })[];
    brand: {
        link: {
            title: string;
            link: string;
        };
    };
    welcome: {
        title: string;
        text: string;
    };
    administrator: {
        login: string;
        password: string;
    };
    translation: {
        locales: string[];
        path: string;
        defaultLocale: string;
    };
    models: {
        [key: string]: boolean | import("../dist/interfaces/adminpanelConfig").ModelConfig;
    };
    generator: {};
    globalSettings: {
        enableMigrations: boolean;
    };
    migrations: {
        path: string;
    };
};
export default _default;
