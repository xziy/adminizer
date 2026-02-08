import { Adminizer } from "../../Adminizer";
import { ActionType, ModelConfig } from "../../../interfaces/adminpanelConfig";
import { Entity } from "../../../interfaces/types";
import { AbstractModel } from "../../model/AbstractModel";
import { DataAccessor } from "../../DataAccessor";
import { Fields } from "../../../helpers/fieldsHelper";
import { UserAP } from "../../../models/UserAP";

export type ModelEntry = {
  name: string;
  config: ModelConfig;
  model: AbstractModel<any>;
};

export type ModelContext = {
  entry: ModelEntry;
  entity: Entity;
  dataAccessor: DataAccessor;
  fields: Fields;
  adapterType: string;
};

const normalizeModelConfig = (name: string, config: ModelConfig | boolean): ModelConfig => {
  if (typeof config === "boolean") {
    if (!config) {
      throw new Error(`Model "${name}" is disabled in config`);
    }
    return {
      model: name,
      title: name,
      icon: "description",
      list: true,
      add: true,
      edit: true,
      remove: true,
      view: true
    } as ModelConfig;
  }

  return {
    model: name,
    title: name,
    icon: "description",
    list: true,
    add: true,
    edit: true,
    remove: true,
    view: true,
    ...config
  } as ModelConfig;
};

export const resolveModelEntry = (adminizer: Adminizer, modelName: string): ModelEntry => {
  if (!adminizer?.config?.models) {
    throw new Error("Adminizer model configuration is not available");
  }

  const normalized = String(modelName ?? "").trim().toLowerCase();
  if (!normalized) {
    throw new Error("Model name is required");
  }

  const models = adminizer.config.models;
  const direct = Object.entries(models).find(([name]) => name.toLowerCase() === normalized);
  if (direct) {
    const [entryName, entryConfig] = direct;
    const config = normalizeModelConfig(entryName, entryConfig as ModelConfig | boolean);
    const model = adminizer.modelHandler.model.get(config.model);
    if (!model) {
      throw new Error(`Model "${config.model}" was not found`);
    }
    return { name: entryName, config, model };
  }

  const byModel = Object.entries(models).find(([, entryConfig]) => {
    if (typeof entryConfig === "boolean") {
      return false;
    }
    if (!entryConfig?.model) {
      return false;
    }
    return entryConfig.model.toLowerCase() === normalized;
  });

  if (!byModel) {
    throw new Error(`Model "${modelName}" was not found in config`);
  }

  const [entryName, entryConfig] = byModel;
  const config = normalizeModelConfig(entryName, entryConfig as ModelConfig);
  const model = adminizer.modelHandler.model.get(config.model);
  if (!model) {
    throw new Error(`Model "${config.model}" was not found`);
  }

  return { name: entryName, config, model };
};

export const buildEntity = (adminizer: Adminizer, entry: ModelEntry): Entity => {
  return {
    name: entry.name,
    uri: `${adminizer.config.routePrefix}/model/${entry.name}`,
    type: "model",
    config: entry.config,
    model: entry.model
  } as Entity;
};

export const resolveAdapterType = (adminizer: Adminizer, entry: ModelEntry): string => {
  if (entry.config?.adapter) {
    return String(entry.config.adapter).toLowerCase();
  }

  const defaultAdapter = adminizer.config.system?.defaultORM;
  if (defaultAdapter) {
    return String(defaultAdapter).toLowerCase();
  }

  const adapters = adminizer.ormAdapters;
  if (Array.isArray(adapters) && adapters.length === 1) {
    return String(adapters[0].ormType).toLowerCase();
  }

  return "waterline";
};

export const resolveModelContext = (
  adminizer: Adminizer,
  modelName: string,
  user: UserAP,
  action: ActionType
): ModelContext => {
  const entry = resolveModelEntry(adminizer, modelName);
  const entity = buildEntity(adminizer, entry);
  const dataAccessor = new DataAccessor(adminizer, user, entity, action);
  const fields = dataAccessor.getFieldsConfig();
  if (!fields) {
    throw new Error(`Access denied for model "${entry.name}"`);
  }

  return {
    entry,
    entity,
    dataAccessor,
    fields,
    adapterType: resolveAdapterType(adminizer, entry)
  };
};
