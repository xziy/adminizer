import { HistoryActionsAP } from "../../models/HistoryActionsAP";
import { UserAP } from "../../models/UserAP";
import { Adminizer } from "../Adminizer";
import { AbstractHistoryAdapter } from "./AbstractHistoryAdapter";

export class DefaultHistoryAdapter extends AbstractHistoryAdapter {
    public id: string = 'default';
    public model: string = 'historyactionsap';


    constructor(adminizer: Adminizer) {
        super(adminizer);

    }

    public async getAllModelHistory(modelId: string | number, modelName: string): Promise<HistoryActionsAP[]> {
        try {
            return await this.adminizer.modelHandler.model.get(this.model)["_find"]({
                where: { modelName: modelName, modelId: String(modelId) },
                sort: "createdAt DESC"
            })
        } catch (e) {
            Adminizer.log.error('Eror getting history', e)
            throw new Error("Eror getting history");
        }
    }

    public async getAllHistory(modelName: string, all: boolean): Promise<HistoryActionsAP[]> {
        try {
            return await this.adminizer.modelHandler.model.get(this.model)["_find"]({
                where: all ? {} : { modelName: modelName },
                sort: "createdAt DESC"
            })

        } catch (e) {
            Adminizer.log.error('Eror getting history', e)
            throw new Error("Eror getting history");
        }
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

    public async getModelHistory(historyId: number, user: UserAP): Promise<Record<string, any>> {
        const history = await this.adminizer.modelHandler.model.get(this.model)["_findOne"]({ id: historyId })
        return await this.getModelFieldsHistory(history, user)
    }
}