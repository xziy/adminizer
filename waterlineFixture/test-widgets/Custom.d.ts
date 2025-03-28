import CustomBase from '../../dist/lib/widgets/abstractCustom';
export declare class CustomOne extends CustomBase {
    readonly id: string;
    readonly department: string;
    readonly description: string;
    readonly icon: string;
    readonly name: string;
    readonly widgetType = "custom";
    readonly backgroundCSS = "#da4fcf";
    readonly size: {
        h: number;
        w: number;
    };
    readonly hideAdminPanelUI: boolean;
    readonly scriptUrl: string;
    readonly constructorName: string;
    readonly constructorOption: any;
}
export declare class CustomTwo extends CustomBase {
    size: {
        h: number;
        w: number;
    };
    readonly id: string;
    readonly department: string;
    readonly description: string;
    readonly icon: string;
    readonly name: string;
    readonly widgetType = "custom";
    readonly backgroundCSS = "#779d64";
    readonly hideAdminPanelUI: boolean;
    readonly scriptUrl: string;
    readonly constructorName: string;
    readonly constructorOption: any;
}
