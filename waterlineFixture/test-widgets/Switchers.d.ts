import SwitchBase from "../../dist/lib/widgets/abstractSwitch";
export declare class SwitcherOne extends SwitchBase {
    readonly id: string;
    readonly department: string;
    readonly description: string;
    readonly icon: string;
    readonly name: string;
    readonly widgetType = "switcher";
    readonly backgroundCSS = "#da4fcf";
    readonly size: {
        h: number;
        w: number;
    };
    private state;
    getState(): Promise<boolean>;
    switchIt(): Promise<boolean>;
}
export declare class SwitcherTwo extends SwitchBase {
    size: {
        h: number;
        w: number;
    };
    readonly id: string;
    readonly department: string;
    readonly description: string;
    readonly icon: string;
    readonly name: string;
    readonly widgetType = "switcher";
    readonly backgroundCSS = "#779d64";
    private state;
    getState(): Promise<boolean>;
    switchIt(): Promise<boolean>;
}
