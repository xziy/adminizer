import {Entity, EntityType} from "../interfaces/types";
import {ActionType, CreateUpdateConfig, ModelConfig} from "../interfaces/adminpanelConfig";
import {AbstractModel} from "../lib/v4/model/AbstractModel";
import {Adminizer} from "../lib/Adminizer";

/**
 * @deprecated need refactor actions
 */
type ActionConfig = CreateUpdateConfig

export class ControllerHelper {

    /**
     * Default configuration for entity
     *
     * @see ControllerHelper.findConfig
     */
    private static _defaultModelConfig = {
        list: true,
        add: true,
        edit: true,
        remove: true,
        view: true
    };

    /**
     * Default configs that will be returned for action. If nothing exists in config file.
     *
     * @see ControllerHelper.findActionConfig
     */
    private static _defaultActionConfig = {
        fields: {}
    };

    /**
     * Check if given entity config has all required properties
     *
     * @param {Object} config
     * @returns {boolean}
     * @private
     */
    private static _isValidModelConfig(config: ModelConfig): boolean {
        return (typeof config === "object" && typeof config.model === "string");
    };

    /**
     * Normalizing entity config.
     * Will return fulfilled configuration object.
     *
     * @see ControllerHelper._isValidModelConfig
     * @param entityName
     * @param {Object} config
     * @returns {Object}
     * @private
     */
    private static _normalizeModelConfig(entityName: string, config: ModelConfig | boolean): ModelConfig {
        if (typeof config === "boolean") {
            config = {
                model: entityName,
                icon: 'description',
                title: entityName
            }
        }

        if (!this._isValidModelConfig(config)) {
            Adminizer.log.error('Wrong entity configuration, using default');
            config = {
                model: entityName,
                icon: 'description',
                title: entityName
            }
        }
        config = {...this._defaultModelConfig, ...config};
        return config;
    };

    /**
     * Normalize action config object
     *
     * @param {Object} config
     * @returns {Object}
     * @private
     */
    private static _normalizeActionConfig(config: ActionConfig): ActionConfig {
        //Adding fields
        config.fields = config.fields || {};
        return {...this._defaultActionConfig, ...config};
    };

    /**
     * Get entity type
     *
     * @param {Request} req
     * @returns {?string}
     */
    public static findEntityType(req: ReqType): EntityType {
        const entityType = req.params.entityType as EntityType | undefined;

        if (!entityType) {
            const extractedEntityType = req.originalUrl.split('/')[2] as EntityType | undefined;

            if (["form", "model"].includes(extractedEntityType)) {
                return extractedEntityType;
            } else {
                return null;
            }
        }

        return entityType;
    };

    /**
     * Get entity name
     *
     * @param {Request} req
     * @returns {?string}
     */
    public static findEntityName(req: ReqType): string {
        if (!req.params.entityName) {
            let entityType = req.originalUrl.split('/')[2];
            let entityName = req.originalUrl.split('/')[3];
            if (entityType === "form" && (!req.adminizer.config.forms || !req.adminizer.config.forms.data || !req.adminizer.config.forms.data[entityName])) {
                return null
            } else if (entityType === "model" && (!req.adminizer.config.models || !req.adminizer.config.models[entityName])) {
                return null;
            } else {
                return entityName
            }
        }
        return req.params.entityName;
    };

    /**
     * Searches for config from admin panel
     *
     * @param {Request} req
     * @param {String} entityName
     * @returns {?Object}
     */
    public static findModelConfig(req: ReqType, entityName: string): ModelConfig {
        if (!req.adminizer.config.models || !req.adminizer.config.models[entityName]) {
            Adminizer.log.error('No such route exists');
            return null;
        }
        return this._normalizeModelConfig(entityName, req.adminizer.config.models[entityName]);
    }

    /**
     * Will get action config from configuration file depending to given action
     *
     * Config will consist of all configuration props from config file.
     *
     * @example
     *
     *  {
     *      'fields': {
     *          name: 'Name',
     *          email: true,
     *          anotherField: {
     *              title: 'Another field',
     *              //... some more options here
     *          }
     *      }
     *  }
     *
     * @throws {Error} if req or actionType not passed
     * @param {Object} entity Entity object with `name`, `config`, `model` {@link ControllerHelper.findEntityObject}
     * @param {string} actionType Type of action that config should be loaded for. Example: list, edit, add, remove, view.
     * @returns {Object} Will return object with configs or default configs.
     */
    public static findActionConfig(entity: Entity, actionType: ActionType): ActionConfig {
        if (!entity || !actionType) {
            throw new Error('No `entity` or `actionType` passed !');
        }
        let result = {...this._defaultActionConfig};
        if (!entity.config || !entity.config[actionType]) {
            return result;
        }
        /**
         * Here we could get true/false so need to update it to Object for later manipulations
         * In this function
         */
        if (typeof entity.config[actionType] === "boolean") {
            return result;
        }
        return this._normalizeActionConfig(entity.config[actionType] as ActionConfig);
    }

    /**
     * Will create entity object from request.
     *
     * Entity Object will have this format:
     *
     * @example
     * ```javascript
     * {
     *  name: 'user',
     *  model: Model,
     *  config: { ... },
     *  uri: ''
     * }
     * ```
     *
     * @param req
     * @returns {Object}
     */
    public static findEntityObject(req: ReqType): Entity {
        // Retrieve entity name and type based on the request
        const entityName = this.findEntityName(req);
        const entityType = this.findEntityType(req);

        // Construct the entity URI
        const entityUri = `${req.adminizer.config.routePrefix}/${entityType}/${entityName}`;

        // Initialize the Entity object
        const entity: Entity = {
            name: entityName,
            uri: entityUri,
            type: entityType,
            model: null
        };
        // If the entity type is "model", add additional properties
        if (entityType === "model") {
            // Find and add the model configuration to the entity
            entity.config = this.findModelConfig(req, entityName);

            // Find and add the model itself to the entity
            if (this._isValidModelConfig(entity.config)) {
                entity.model = req.adminizer.modelHandler.model.get(entity.config.model);
            }
        }

        // Return the completed entity object
        return entity;
    }
}
