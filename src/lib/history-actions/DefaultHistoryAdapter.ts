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

    public async getAllHistory(user: UserAP, forUserName: string, modelName: string, limit: number = 15, skip: number = 0, from?: Date, to?: Date): Promise<{ data: HistoryActionsAP[] }> {
        console.log(from, to);


        let userId = null
        if (forUserName !== 'all') {
            const foundUser = await this.adminizer.modelHandler.model.get('userap')["_findOne"]({ login: forUserName });
            if (!foundUser) {
                throw new Error("User not found");

            }
            userId = foundUser.id;
        }



        const query: any = modelName === 'all' && forUserName === 'all' ? {} :
            {
                ...(modelName !== 'all' ? { modelName } : {}),
                ...(forUserName !== 'all' ? { user: userId } : {})
            }

        if (from && to) {
            query.createdAt = {
                '>=': from,
                '<=': to.setHours(23, 59, 59, 999)
            };
        }
        
        
        const history = await this.adminizer.modelHandler.model.get(this.model)["_find"]({
            where: query,
            sort: "createdAt DESC",
            limit,
            skip
        })

        return {
            data: await this._getAllHistory(history, user)
        }
    }

    public async getAllModelHistory(modelId: string | number, modelName: string, user: UserAP): Promise<HistoryActionsAP[]> {
        try {
            const history = await this.adminizer.modelHandler.model.get(this.model)["_find"]({
                where: { modelName: modelName, modelId: String(modelId) },
                sort: "createdAt DESC"
            })
            return await this._getAllModelHistory(history, user)
        } catch (e) {
            Adminizer.log.error('Eror getting history', e)
            throw new Error("Eror getting history");
        }
    }

    public async getModelFieldsHistory(historyId: number, user: UserAP): Promise<Record<string, any>> {
        const history = await this.adminizer.modelHandler.model.get(this.model)["_findOne"]({ id: historyId })

        return await this._getModelFieldsHistory(history, user)
    }

    public async setHistory(data: Omit<HistoryActionsAP, "createdAt" | "updatedAt" | "user"> & { user: string | number }): Promise<void> {
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