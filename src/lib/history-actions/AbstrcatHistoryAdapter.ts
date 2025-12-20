import { HistoryActionsAP } from "../../models/HistoryActionsAP";
import { Adminizer } from "../Adminizer";


export abstract class AbstractHistoryAdapter {
    public abstract id: string
    public abstract model: string;

    protected constructor(adminizer: Adminizer) {
        this._bindAccessRight(adminizer)
    }

    private _bindAccessRight(adminizer: Adminizer) {
        setTimeout(() => {
            adminizer.accessRightsHelper.registerToken({
                id: `history-${this.id}`,
                name: this.id,
                description: `Access to history for ${this.id}`,
                department: 'history-actions',
            });
        }, 100)
    }

    public abstract getHistory(modelId: string | number, modelName: string): Promise<HistoryActionsAP[]>
    public abstract setHistory(data: Omit<HistoryActionsAP, "id" | "createdAt" | "updatedAt" | "isCurrent">): Promise<void>
    public abstract getModelFieldsHistory(historyId: number): Promise<Record<string, any>>
}