import InstallStepAbstract from "../../dist/lib/installStepper/InstallStepAbstract";
export default class Step1 extends InstallStepAbstract {
    canBeSkipped: boolean;
    description: string;
    ejsPath: string;
    id: string;
    scriptsUrl: string;
    sortOrder: number;
    groupSortOrder: number;
    stylesUrl: string;
    title: string;
    badge: string;
    isSkipped: boolean;
    renderer: "ejs";
    isProcessed: boolean;
    check(): Promise<boolean>;
    process(data: any, context: any): Promise<void>;
    skip(): Promise<void>;
    finally(): Promise<void>;
}
