import { HistoryActionsAP } from "../../models/HistoryActionsAP";
import { UserAP } from "../../models/UserAP";
import { Adminizer } from "../Adminizer";
import { Field, Fields } from "../../helpers/fieldsHelper";
import { ActionType, ModelConfig } from "../../interfaces/adminpanelConfig";
import { Entity } from "../../interfaces/types";
import { ModelAnyInstance } from "../model/AbstractModel";
import { isObject } from "../../helpers/JsUtils";
import { DataAccessor } from "../DataAccessor";
import { BaseFieldConfig, MediaManagerOptionsField } from "../../interfaces/adminpanelConfig";
import { setAssociationValues } from "../../helpers/inertiaAddHelper";

/**
 * Set of model names that are excluded from history tracking.
 * These models are internal or administrative and should not appear in user-accessible history.
 */
const excludedModels = new Set([
    'HistoryActionsAP',
    'MediaManagerAP',
    'MediaManagerAssociationsAP',
    'MediaManagerMetaAP',
    'NavigationAP',
    'NotificationAP',
    'UserNotificationAP',
    'UserAP',
    'GroupAP'
]);

/**
 * Abstract base class for handling history operations in the AdminPanel.
 * Provides common methods and structure for retrieving, filtering, and formatting historical data.
 * Subclasses must implement model-specific logic for persistence and retrieval.
 *
 * @abstract
 */
export abstract class AbstractHistoryAdapter {
    /**
     * Unique identifier for this history adapter instance.
     * Used for access rights registration and identification.
     */
    public abstract id: string;

    /**
     * Reference to the main Adminizer instance.
     * Provides access to models, configuration, access rights, and services.
     */
    protected adminizer: Adminizer;

    /**
     * Constructs a new history adapter and binds access rights.
     *
     * @param adminizer - The main Adminizer instance.
     */
    protected constructor(adminizer: Adminizer) {
        this._bindAccessRight(adminizer);
    }

    /**
     * Registers access rights for this history adapter.
     * Called during construction with a slight delay to ensure Adminizer is ready.
     *
     * @param adminizer - The Adminizer instance to bind to.
     * @private
     */
    private _bindAccessRight(adminizer: Adminizer) {
        this.adminizer = adminizer;
        setTimeout(() => {
            adminizer.accessRightsHelper.registerTokens([
                {
                    id: `history-${this.id}`,
                    name: this.id,
                    description: `Access to history for ${this.id}`,
                    department: 'History actions',
                },
                {
                    id: `users-history-${this.id}`,
                    name: 'Access to users history',
                    description: `Access to users history for ${this.id}`,
                    department: 'History actions',
                },
            ]);
        }, 100);
    }

    /**
     * Retrieves all history records for a specific model instance.
     *
     * @param modelId - ID of the model instance.
     * @param modelName - Name of the model.
     * @returns Promise resolving to an array of history records.
     */
    public abstract getAllModelHistory(modelId: string | number, modelName: string, user: UserAP): Promise<HistoryActionsAP[]>;

    /**
     * Retrieves all accessible history records for a user.
     *
     * @param user - User requesting the data.
     * @param modelName - Optional model name to filter results.
     * @returns Promise resolving to a record of history data.
     */
    public abstract getAllHistory(user: UserAP, forUserName: string, modelName: string, limit?: number, offset?: number): Promise<{ data: HistoryActionsAP[] }>;

    /**
     * Saves a new history record.
     *
     * @param data - History data excluding auto-generated fields (`id`, `createdAt`, `updatedAt`, `isCurrent`).
     * @returns Promise resolving when the record is saved.
     */
    public abstract setHistory(data: Omit<HistoryActionsAP, "id" | "createdAt" | "updatedAt" | "isCurrent" | "user"> & { user: string | number }): Promise<void>;

    /**
     * Retrieves detailed history data for a specific history record.
     * Processes field values based on their type (e.g., media manager, associations).
     *
     * @param historyId - ID of the history record.
     * @param user - User requesting the data (used for access control).
     * @returns Promise resolving to formatted history data.
     */
    public abstract getModelFieldsHistory(historyId: number, user: UserAP): Promise<Record<string, any>>;

    /**
     * Gets a list of models for which the user has update permissions.
     * Excludes internal models defined in `excludedModels`.
     *
     * @param user - User whose permissions are checked.
     * @returns Array of model names (in lowercase) the user can access.
     */
    public getModels(user: UserAP): string[] {
        const models = this.adminizer.modelHandler.all
            .filter(model => !excludedModels.has(model.modelname))
            .map(model => model.modelname.toLowerCase());

        const accessModels: string[] = [];
        for (const model of models) {
            const access = this.adminizer.accessRightsHelper.enoughPermissions([
                `read-${model}-model`,
            ], user);
            if (access) accessModels.push(model);
        }

        return accessModels;
    }

    protected async _getAllModelHistory(history: HistoryActionsAP[], user: UserAP): Promise<HistoryActionsAP[]> {
        const accessToUsersHistory = this.adminizer.accessRightsHelper.enoughPermissions([
            `users-history-${this.id}`
        ], user);

        if (!accessToUsersHistory) {
            history = history.filter((historyRecord) => {
                return historyRecord.user.id === user.id;
            });
        }
        return history;
    }

    /**
     * Filters history records based on user permissions and checks if the associated model records exist.
     *
     * @param history - Array of raw history records.
     * @param user - User requesting the data.
     * @returns Promise resolving to filtered history records the user can access.
     * @protected
     */
    protected async _getAllHistory(history: HistoryActionsAP[], user: UserAP): Promise<HistoryActionsAP[]> {
        try {
            let accessHistory: HistoryActionsAP[] = [];
            const accessToUsersHistory = this.adminizer.accessRightsHelper.enoughPermissions([
                `users-history-${this.id}`
            ], user);

            if (!accessToUsersHistory) {
                history = history.filter((historyRecord) => {
                    return historyRecord.user.id === user.id;
                });
            }
            for (const historyRecord of history) {
                const access = this.adminizer.accessRightsHelper.enoughPermissions([
                    `read-${historyRecord.modelName}-model`
                ], user);

                if (access) accessHistory.push(historyRecord);

            }

            return accessHistory;

        } catch (e) {
            Adminizer.log.error('Eror getting history', e);
            throw new Error("Eror getting history");
        }
    }

    /**
     * Formats a single history record for frontend consumption.
     * Processes field types such as media manager, color, and associations.
     *
     * @param history - The history record to process.
     * @param user - User requesting the data.
     * @returns Promise resolving to formatted data object.
     * @protected
     */
    protected async _getModelFieldsHistory(history: HistoryActionsAP, user: UserAP): Promise<Record<string, any>> {
        const entity = this.findEntityObject(history);
        const dataAccessor = new DataAccessor(this.adminizer, user, entity, "edit");
        let fields = dataAccessor.getFieldsConfig();
        fields = await this.loadAssociations(fields, user, "edit");

        let data: Record<string, any> = {};
        for (const field of Object.keys(fields)) {
            const fieldConfigConfig = fields[field].config as BaseFieldConfig;
            if (fieldConfigConfig.type === 'mediamanager') {
                const mediaManager = this.adminizer.mediaManagerHandler.get((fieldConfigConfig.options as MediaManagerOptionsField)?.id ?? "default");
                data[field] = [];
                if (history.data[field]) {
                    for (const file of history.data[field]) {
                        const media = await mediaManager.getFile(file.mimeType, file.id);
                        data[field].push({
                            id: media.id,
                            mimeType: media.mimeType,
                            filename: media.filename,
                            url: media.url,
                            variants: []
                        });
                    }
                }

            } else if (fieldConfigConfig.type === 'color') {
                data[field] = history.data[field] ? history.data[field] : '#000000';
            } else if (fieldConfigConfig.type === 'association' || fieldConfigConfig.type === 'association-many') {
                const { initValue } = setAssociationValues(fields[field], history.data[field]);
                data[field] = await this.getModelRelationsHistory(fields[field].model.model ?? fields[field].model.collection, initValue);
            } else {
                data[field] = history.data[field];
            }
        }

        return data;
    }

    /**
     * Filters related model IDs to only those that exist in the database.
     *
     * @param model - Name of the related model.
     * @param ids - Array of IDs to validate.
     * @returns Promise resolving to array of existing IDs.
     * @protected
     * @template T - Type of the ID (string or number).
     */
    protected async getModelRelationsHistory<T extends string | number>(model: string, ids: T[]): Promise<T[]> {
        const data: T[] = [];
        for (const id of ids) {
            const record = await this.adminizer.modelHandler.model.get(model.toLowerCase())["_findOne"]({ id });
            if (record) {
                data.push(id);
            }
        }
        return data;
    }

    /**
     * Constructs an Entity object from a history record.
     * Used to access model configuration and instance.
     *
     * @param history - The history record.
     * @returns Entity object with name, URI, type, model instance, and config.
     * @protected
     */
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

    /**
     * Loads associated records for association-type fields.
     * Populates `records` array in field config for widget rendering.
     *
     * @param fields - Fields configuration to process.
     * @param user - User requesting data.
     * @param action - Optional action type (e.g., "view", "edit").
     * @returns Promise resolving to updated fields with loaded associations.
     * @protected
     */
    protected async loadAssociations(fields: Fields, user: UserAP, action?: ActionType): Promise<Fields> {

        let loadAssoc = async (key: string, action?: ActionType) => {
            let fieldConfigConfig = fields[key].config as Field["config"];
            if (!isObject(fieldConfigConfig)) {
                throw 'type error: fieldConfigConfig should be normalized';
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
                Adminizer.log.error(e);
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

        return fields;
    }
}
