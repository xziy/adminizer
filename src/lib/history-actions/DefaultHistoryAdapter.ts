import { HistoryActionsAP } from "../../models/HistoryActionsAP";
import { Adminizer } from "../Adminizer";
import { AbstractHistoryAdapter } from "./AbstrcatHistoryAdapter";


export class DefaultHistoryAdapter extends AbstractHistoryAdapter {
    public id: string = 'default';
    public model: string = 'historyactionsap';
    protected readonly adminizer: Adminizer;

    constructor(adminizer: Adminizer){
        super(adminizer);
        this.adminizer = adminizer;
    }

    public getHistory(): Promise<any> {
        throw new Error("Method not implemented.");
    }
    public async setHistory(data: Omit<HistoryActionsAP, "createdAt" | "updatedAt">): Promise<any> {
        await this.adminizer.modelHandler.model.get(this.model)["_create"](data)
    }
    
}