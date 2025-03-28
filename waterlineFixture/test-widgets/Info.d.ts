import InfoBase from "../../dist/lib/widgets/abstractInfo";
export declare class InfoOne extends InfoBase {
    icon?: string;
    backgroundCSS: string;
    size: {
        h: number;
        w: number;
    };
    readonly id: string;
    readonly department: string;
    readonly description: string;
    readonly name: string;
    readonly widgetType = "info";
    private info;
    getInfo(): Promise<string>;
}
export declare class InfoTwo extends InfoBase {
    icon?: string;
    readonly id: string;
    readonly department: string;
    readonly description: string;
    readonly name: string;
    readonly widgetType = "info";
    readonly backgroundCSS = "#8c3116";
    readonly size: {
        h: number;
        w: number;
    };
    private info;
    getInfo(): Promise<string>;
}
export declare class Info3 extends InfoBase {
    icon?: string;
    backgroundCSS: string;
    readonly id: string;
    readonly department: string;
    readonly description: string;
    readonly name: string;
    readonly widgetType = "info";
    readonly size: {
        h: number;
        w: number;
    };
    private info;
    getInfo(): Promise<string>;
}
export declare class Info4 extends InfoBase {
    icon?: string;
    readonly id: string;
    readonly department: string;
    readonly description: string;
    readonly name: string;
    readonly widgetType = "info";
    readonly backgroundCSS = "#051c3a";
    readonly size: {
        h: number;
        w: number;
    };
    private info;
    getInfo(): Promise<string>;
}
