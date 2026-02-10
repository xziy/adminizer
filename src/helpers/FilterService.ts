import type { Adminizer } from "../lib/Adminizer";
import { DataAccessor } from "../lib/DataAccessor";
import { AbstractModel } from "../lib/model/AbstractModel";
import { ModernQueryBuilder, QueryParams, QueryResult, QuerySortDirection } from "../lib/query-builder/ModernQueryBuilder";
import { FilterAP, FilterCondition } from "../models/FilterAP";
import { ActionType, ModelConfig } from "../interfaces/adminpanelConfig";
import { Entity } from "../interfaces/types";
import { Fields } from "./fieldsHelper";
import { UserAP } from "../models/UserAP";

type FilterServiceOptions = {
  page?: number;
  limit?: number;
  sort?: string;
  sortDirection?: QuerySortDirection;
  globalSearch?: string;
  extraFilters?: FilterCondition[];
  selectFields?: string[];
};

type ModelConfigEntry = {
  name: string;
  config: ModelConfig;
};

export class FilterService {
  constructor(private readonly adminizer: Adminizer) {}

  isFiltersEnabled(): boolean {
    return this.adminizer.config.filtersEnabled !== false;
  }

  isFiltersEnabledForModel(modelName: string): boolean {
    if (!this.isFiltersEnabled()) {
      return false;
    }
    const modelConfig = this.getModelFilterConfig(modelName);
    if (!modelConfig) {
      return true;
    }
    return modelConfig.enabled !== false;
  }

  shouldUseLegacySearch(modelName: string): boolean {
    const modelConfig = this.getModelFilterConfig(modelName);
    return modelConfig?.useLegacySearch === true;
  }

  async applyFilter(
    filterId: string,
    model: AbstractModel<any>,
    fields: Fields,
    dataAccessor: DataAccessor,
    options: FilterServiceOptions = {}
  ): Promise<QueryResult> {
    const user = dataAccessor.user;
    const filterDataAccessor = this.createFilterDataAccessor(user, "list");
    const filterModel = this.getFilterModel();
    const filter = await filterModel.findOne({ id: filterId }, filterDataAccessor);

    if (!filter) {
      throw new Error(`Filter "${filterId}" was not found`);
    }
    this.assertFilterMatchesModel(filter, dataAccessor, model);

    const queryParams = this.buildQueryParams(filter, options, fields, model.primaryKey);
    const queryBuilder = new ModernQueryBuilder(model, fields, dataAccessor);

    return queryBuilder.execute(queryParams);
  }

  async applyFilterBySlug(
    slug: string,
    model: AbstractModel<any>,
    fields: Fields,
    dataAccessor: DataAccessor,
    options: FilterServiceOptions = {}
  ): Promise<QueryResult> {
    const user = dataAccessor.user;
    const filterDataAccessor = this.createFilterDataAccessor(user, "list");
    const filterModel = this.getFilterModel();

    let filter = await filterModel.findOne({ slug }, filterDataAccessor);
    if (!filter) {
      filter = await this.findPublicFilterBySlug(slug);
    }

    if (!filter) {
      throw new Error(`Filter "${slug}" was not found`);
    }
    this.assertFilterMatchesModel(filter, dataAccessor, model);

    const queryParams = this.buildQueryParams(filter, options, fields, model.primaryKey);
    const queryBuilder = new ModernQueryBuilder(model, fields, dataAccessor);

    return queryBuilder.execute(queryParams);
  }

  private buildQueryParams(
    filter: Partial<FilterAP>,
    options: FilterServiceOptions,
    fields: Fields,
    primaryKey?: string
  ): QueryParams {
    const filters = Array.isArray(filter.conditions) ? filter.conditions : [];
    const extraFilters = Array.isArray(options.extraFilters) ? options.extraFilters : [];
    const mergedFilters = [...filters, ...extraFilters];

    const queryParams: QueryParams = {
      page: options.page ?? 1,
      limit: options.limit ?? 10,
      filters: mergedFilters
    };
    queryParams.selectFields = this.normalizeSelectedFields(
      options.selectFields ?? filter.selectedFields,
      fields,
      primaryKey
    );

    const sortField = options.sort ?? filter.sortField;
    if (sortField) {
      queryParams.sort = sortField;
    }

    const sortDirection = options.sortDirection ?? this.normalizeSortDirection(filter.sortDirection);
    if (sortDirection) {
      queryParams.sortDirection = sortDirection;
    }

    if (options.globalSearch) {
      queryParams.globalSearch = options.globalSearch;
    }

    return queryParams;
  }

  private normalizeSelectedFields(
    selectedFields: unknown,
    fields: Fields,
    primaryKey?: string
  ): string[] | undefined {
    if (!Array.isArray(selectedFields) || selectedFields.length === 0) {
      return undefined;
    }

    const normalized = selectedFields
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0);

    if (normalized.length === 0) {
      return undefined;
    }

    const allowed = normalized.filter((field) => Boolean(fields?.[field]));
    if (allowed.length === 0) {
      return undefined;
    }

    const unique = new Set<string>();
    const result: string[] = [];

    if (primaryKey) {
      const key = String(primaryKey);
      unique.add(key);
      result.push(key);
    }

    allowed.forEach((field) => {
      if (!unique.has(field)) {
        unique.add(field);
        result.push(field);
      }
    });

    return result;
  }

  private normalizeSortDirection(direction?: string): QuerySortDirection | undefined {
    if (!direction) {
      return undefined;
    }
    return direction.toUpperCase() === "ASC" ? "ASC" : "DESC";
  }

  private async findPublicFilterBySlug(slug: string): Promise<Partial<FilterAP> | null> {
    const filterModel = this.getFilterModel();
    const adminAccessor = this.createFilterDataAccessor(this.createSystemUser(), "list");
    return filterModel.findOne({ slug, visibility: "public" }, adminAccessor);
  }

  private assertFilterMatchesModel(
    filter: Partial<FilterAP>,
    dataAccessor: DataAccessor,
    model: AbstractModel<any>
  ): void {
    const filterModelName = String(filter.modelName ?? "").toLowerCase();
    if (!filterModelName) {
      return;
    }

    const targetNames = new Set<string>();
    if (dataAccessor?.entity?.name) {
      targetNames.add(String(dataAccessor.entity.name).toLowerCase());
    }
    if (dataAccessor?.entity?.config?.model) {
      targetNames.add(String(dataAccessor.entity.config.model).toLowerCase());
    }
    if (model?.modelname) {
      targetNames.add(String(model.modelname).toLowerCase());
    }
    if (model?.identity) {
      targetNames.add(String(model.identity).toLowerCase());
    }

    if (targetNames.size === 0 || targetNames.has(filterModelName)) {
      return;
    }

    const targetLabel = dataAccessor?.entity?.name
      ?? dataAccessor?.entity?.config?.model
      ?? model?.modelname
      ?? model?.identity
      ?? "unknown";

    throw new Error(
      `Filter "${filter.name ?? filter.id}" is configured for model "${filter.modelName}", not "${targetLabel}"`
    );
  }

  private getFilterModel(): AbstractModel<FilterAP> {
    const entry = this.getFilterConfigEntry();
    const model = this.adminizer.modelHandler.model.get(entry.config.model);
    if (!model) {
      throw new Error(`Filter model "${entry.config.model}" was not found`);
    }
    return model as AbstractModel<FilterAP>;
  }

  private createFilterDataAccessor(user: UserAP, action: ActionType): DataAccessor {
    const entry = this.getFilterConfigEntry();
    const model = this.adminizer.modelHandler.model.get(entry.config.model);
    if (!model) {
      throw new Error(`Filter model "${entry.config.model}" was not found`);
    }

    const entity: Entity = {
      name: entry.name,
      uri: `${this.adminizer.config.routePrefix}/model/${entry.name}`,
      type: "model",
      config: entry.config,
      model: model as AbstractModel<FilterAP>
    };

    return new DataAccessor(this.adminizer, user, entity, action);
  }

  private createSystemUser(): UserAP {
    return {
      id: 0,
      login: "system",
      fullName: "System",
      isAdministrator: true,
      groups: []
    } as UserAP;
  }

  private getFilterConfigEntry(): ModelConfigEntry {
    const models = this.adminizer.config.models ?? {};
    const direct = this.findModelConfigEntry("FilterAP");
    if (direct) {
      return direct;
    }

    const entry = Object.entries(models).find(([name, config]) => {
      if (!config || typeof config === "boolean") {
        return false;
      }
      return config.model?.toLowerCase() === "filterap" || name.toLowerCase() === "filterap";
    });

    if (!entry || typeof entry[1] === "boolean") {
      throw new Error("FilterAP model configuration was not found");
    }

    return { name: entry[0], config: entry[1] as ModelConfig };
  }

  private findModelConfigEntry(modelName: string): ModelConfigEntry | null {
    const models = this.adminizer.config.models ?? {};
    const entry = Object.entries(models).find(([name]) => name.toLowerCase() === modelName.toLowerCase());
    if (!entry || typeof entry[1] === "boolean") {
      return null;
    }
    return { name: entry[0], config: entry[1] as ModelConfig };
  }

  private getModelFilterConfig(modelName: string): { enabled?: boolean; useLegacySearch?: boolean } | undefined {
    const modelFilters = this.adminizer.config.modelFilters;
    if (!modelFilters) {
      return undefined;
    }

    const direct = modelFilters[modelName];
    if (direct) {
      return direct;
    }

    const entry = Object.entries(modelFilters).find(
      ([name]) => name.toLowerCase() === modelName.toLowerCase()
    );

    return entry?.[1];
  }
}
