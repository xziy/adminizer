import { Adminizer } from "../../Adminizer";
import { ModernQueryBuilder, QueryParams, QueryResult, QuerySortDirection } from "../../query-builder/ModernQueryBuilder";
import { FilterAP, FilterCondition } from "../../../models/FilterAP";
import { UserAP } from "../../../models/UserAP";
import { resolveModelContext } from "../utils/modelResolver";

export type FilterExecutionOptions = {
  page?: number;
  limit?: number;
  sort?: string;
  sortDirection?: QuerySortDirection;
  globalSearch?: string;
  extraFilters?: FilterCondition[];
  selectFields?: string[];
};

export class FilterExecutionService {
  constructor(private readonly adminizer: Adminizer) {}

  public async executeTemporary(
    modelName: string,
    conditions: FilterCondition[],
    user: UserAP,
    options: FilterExecutionOptions = {}
  ): Promise<QueryResult> {
    const context = resolveModelContext(this.adminizer, modelName, user, "list");
    const queryBuilder = new ModernQueryBuilder(
      context.entry.model,
      context.fields,
      context.dataAccessor
    );

    const queryParams: QueryParams = {
      page: options.page ?? 1,
      limit: options.limit ?? 25,
      filters: Array.isArray(conditions) ? conditions : []
    };

    if (options.sort) {
      queryParams.sort = options.sort;
    }
    if (options.sortDirection) {
      queryParams.sortDirection = options.sortDirection;
    }
    if (options.globalSearch) {
      queryParams.globalSearch = options.globalSearch;
    }
    queryParams.selectFields = this.normalizeSelectedFields(
      options.selectFields,
      context.fields,
      context.entry.model.primaryKey
    );

    return queryBuilder.execute(queryParams);
  }

  public async executeFilter(
    filter: Partial<FilterAP>,
    user: UserAP,
    options: FilterExecutionOptions = {}
  ): Promise<QueryResult> {
    const modelName = String(filter.modelName ?? "");
    if (!modelName) {
      throw new Error("Filter is missing modelName");
    }

    const context = resolveModelContext(this.adminizer, modelName, user, "list");
    const queryBuilder = new ModernQueryBuilder(
      context.entry.model,
      context.fields,
      context.dataAccessor
    );

    const queryParams = this.buildQueryParams(filter, options);
    queryParams.selectFields = this.normalizeSelectedFields(
      options.selectFields ?? filter.selectedFields,
      context.fields,
      context.entry.model.primaryKey
    );
    return queryBuilder.execute(queryParams);
  }

  public async count(filter: Partial<FilterAP>, user: UserAP): Promise<number> {
    const result = await this.executeFilter(filter, user, { page: 1, limit: 1 });
    return result.filtered;
  }

  private buildQueryParams(
    filter: Partial<FilterAP>,
    options: FilterExecutionOptions
  ): QueryParams {
    const baseFilters = Array.isArray(filter.conditions) ? filter.conditions : [];
    const extraFilters = Array.isArray(options.extraFilters) ? options.extraFilters : [];
    const mergedFilters = [...baseFilters, ...extraFilters];

    const queryParams: QueryParams = {
      page: options.page ?? 1,
      limit: options.limit ?? 25,
      filters: mergedFilters
    };

    const sortField = options.sort ?? filter.sortField;
    if (sortField) {
      queryParams.sort = sortField;
    }

    const sortDirection =
      options.sortDirection ?? this.normalizeSortDirection(filter.sortDirection);
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
    fields: Record<string, unknown>,
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

  private normalizeSortDirection(
    direction?: string
  ): QuerySortDirection | undefined {
    if (!direction) {
      return undefined;
    }
    return direction.toUpperCase() === "ASC" ? "ASC" : "DESC";
  }
}
