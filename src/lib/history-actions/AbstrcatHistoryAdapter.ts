import { HistoryActionsAP } from "../../models/HistoryActionsAP";
import { UserAP } from "../../models/UserAP";
import { Adminizer } from "../Adminizer";
import { Field, Fields } from "../../helpers/fieldsHelper";
import { ActionType, ModelConfig } from "../../interfaces/adminpanelConfig";
import { Entity } from "../../interfaces/types";
import { ModelAnyInstance } from "../model/AbstractModel";
import { isObject } from "../../helpers/JsUtils";
import { DataAccessor } from "../DataAccessor";

export abstract class AbstractHistoryAdapter {
    public abstract id: string
    public abstract model: string;
    protected adminizer: Adminizer;

    protected constructor(adminizer: Adminizer) {
        this._bindAccessRight(adminizer)
    }

    private _bindAccessRight(adminizer: Adminizer) {
        this.adminizer = adminizer;
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
    public abstract getModelFieldsHistory(historyId: number, user: UserAP): Promise<Record<string, any>>

    protected findEntityObject(history: HistoryActionsAP): Entity {
        const entityName = history.modelName;
        const entityType = "model";

        const entityUri = `${this.adminizer.config.routePrefix}/${entityType}/${entityName}`;
        const models = this.adminizer.config.models;
        const foundKey = Object.keys(models).find(
            key => key.toLowerCase() === entityName.toLowerCase()
        );

        const entity: Entity = {
            name: entityName,
            uri: entityUri,
            type: entityType,
            model: this.adminizer.modelHandler.model.get(history.modelName),
            config: models[foundKey]
        };
        return entity;
    }

    protected async loadAssociations(fields: Fields, user: UserAP, action?: ActionType): Promise<Fields> {

        let loadAssoc = async function (key: string, action?: ActionType) {
            let fieldConfigConfig = fields[key].config as Field["config"];
            if (!isObject(fieldConfigConfig)) {
                throw 'type error: fieldConfigConfig should be normalized'
            }
            if (fieldConfigConfig.type !== 'association' && fieldConfigConfig.type !== 'association-many') {
                return;
            }
            fieldConfigConfig.records = [];

            let modelName = fields[key].model.model || fields[key].model.collection;

            if (!modelName) {
                Adminizer.log.error('No model found for field: ', fields[key]);
                return;
            }

            let Model = this.adminizer.modelHandler.model.get(modelName);
            if (!Model) {
                return;
            }

            let list: ModelAnyInstance[];
            try {
                // adding deprecated records array to config for association widget
                Adminizer.log.warn("Warning: executing malicious job trying to add a huge amount of records in field config," +
                    " please rewrite this part of code in the nearest future");
                let entity: Entity = {
                    name: modelName, config: this.adminizer.config.models[modelName] as ModelConfig,
                    model: Model, uri: `${this.adminizer.config.routePrefix}/model/${modelName}`, type: "model"
                };
                let dataAccessor = new DataAccessor(this.adminizer, user, entity, "view");
                list = await Model.find({}, dataAccessor);
            } catch (e) {
                Adminizer.log.error(e)
                throw new Error("FieldsHelper > loadAssociations error");
            }

            fieldConfigConfig.records = list;
        };

        for await (let key of Object.keys(fields)) {
            try {
                await loadAssoc(key, action);
            } catch (e) {
                Adminizer.log.error(e);
                return e;
            }
        }

        return fields
    }
}