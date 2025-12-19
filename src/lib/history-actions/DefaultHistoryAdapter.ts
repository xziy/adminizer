import { HistoryActionsAP } from "../../models/HistoryActionsAP";
import { Adminizer } from "../Adminizer";
import { AbstractHistoryAdapter } from "./AbstrcatHistoryAdapter";

export class DefaultHistoryAdapter extends AbstractHistoryAdapter {
    public id: string = 'default';
    public model: string = 'historyactionsap';
    protected readonly adminizer: Adminizer;

    constructor(adminizer: Adminizer) {
        super(adminizer);
        this.adminizer = adminizer;
    }

    public async getHistory(modelId: string | number, modelName: string): Promise<HistoryActionsAP[]> {
        return await this.adminizer.modelHandler.model.get(this.model)["_find"]({
            where: { modelName: modelName, modelId: String(modelId) },
            sort: "createdAt DESC"
        })
    }
    public async setHistory(data: Omit<HistoryActionsAP, "createdAt" | "updatedAt">): Promise<void> {
        try {
            await this.adminizer.modelHandler.model.get(this.model)["_update"](
                {
                    where: {
                        modelId: String(data.modelId),
                        modelName: data.modelName,
                        isCurrent: true
                    }
                },
                { isCurrent: false }
            )
            await this.adminizer.modelHandler.model.get(this.model)["_create"]({
                ...data,
                modelId: String(data.modelId),
                isCurrent: true
            })
        } catch (e) {
            Adminizer.log.error('Eror saving history', e)
        }
    }
}