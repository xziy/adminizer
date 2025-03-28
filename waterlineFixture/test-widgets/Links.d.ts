import LinkBase, { Links } from "../../dist/lib/widgets/abstractLink";
export declare class SiteLinks extends LinkBase {
    icon?: string;
    size: {
        h: number;
        w: number;
    };
    readonly id: string;
    readonly department: string;
    readonly description: string;
    readonly name: string;
    readonly widgetType = "link";
    readonly links: Links[];
    getLinks(): Promise<Links[]>;
}
