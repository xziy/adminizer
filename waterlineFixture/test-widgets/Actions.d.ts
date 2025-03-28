import ActionBase from "../../dist/lib/widgets/abstractAction";
export declare class ActionOne extends ActionBase {
    icon?: string;
    backgroundCSS: string;
    readonly id: string;
    readonly department: string;
    readonly description: string;
    readonly name: string;
    readonly widgetType = "action";
    readonly size: {
        h: number;
        w: number;
    };
    action(): Promise<boolean>;
}
export declare class ActionTwo extends ActionBase {
    icon?: string;
    backgroundCSS: string;
    readonly id: string;
    readonly department: string;
    readonly description: string;
    readonly name: string;
    readonly widgetType = "action";
    readonly size: {
        h: number;
        w: number;
    };
    action(): Promise<boolean>;
}
