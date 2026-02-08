import { AbstractModel } from "../model/AbstractModel";
import { DataAccessor } from "../DataAccessor";
import { Field, Fields } from "../../helpers/fieldsHelper";
import { BaseFieldConfig } from "../../interfaces/adminpanelConfig";
import { FilterCondition, FilterOperator } from "../../models/FilterAP";
import { Adminizer } from "../Adminizer";
import {
  CustomFieldHandler,
  CustomFieldCondition,
  CustomFieldHandlerContext
} from "./CustomFieldHandler";

const SECURITY_LIMITS = {
  maxDepth: 5,
  maxConditions: 100,
  maxArrayLength: 50,
  maxStringLength: 256,
  maxRegexLength: 256
} as const;

const DEFAULT_OPERATORS: FilterOperator[] = [
  "eq",
  "neq",
  "like",
  "in",
  "notIn",
  "isNull",
  "isNotNull"
];

const OPERATORS_BY_TYPE: Record<string, FilterOperator[]> = {
  string: [
    "eq",
    "neq",
    "like",
    "ilike",
    "startsWith",
    "endsWith",
    "in",
    "notIn",
    "isNull",
    "isNotNull",
    "regex"
  ],
  number: [
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "between",
    "in",
    "notIn",
    "isNull",
    "isNotNull"
  ],
  boolean: ["eq", "neq", "isNull", "isNotNull"],
  date: ["eq", "neq", "gt", "gte", "lt", "lte", "between", "isNull", "isNotNull"],
  datetime: ["eq", "neq", "gt", "gte", "lt", "lte", "between", "isNull", "isNotNull"],
  time: ["eq", "neq", "gt", "gte", "lt", "lte", "between", "isNull", "isNotNull"],
  uuid: ["eq", "neq", "in", "notIn", "isNull", "isNotNull"],
  enum: ["eq", "neq", "in", "notIn", "isNull", "isNotNull"],
  array: ["eq", "neq", "in", "notIn", "isNull", "isNotNull"],
  json: ["eq", "neq", "isNull", "isNotNull"],
  default: DEFAULT_OPERATORS
};

const RAW_SQL_KEY = "__rawSQL";

type ConditionCounter = {
  remaining: number;
};

type ValueValidationResult = {
  valid: boolean;
  reason?: string;
  suspicious?: boolean;
};

type InMemoryPredicate = (record: Record<string, unknown>) => boolean;

export type QuerySortDirection = "ASC" | "DESC";

export interface QueryParams {
  page: number;
  limit: number;
  sort?: string;
  sortDirection?: QuerySortDirection;
  filters?: FilterCondition[];
  globalSearch?: string;
  fields?: string[];
}

export interface QueryResult<T = Record<string, unknown>> {
  data: T[];
  total: number;
  filtered: number;
  page: number;
  limit: number;
  pages: number;
}

type ConditionLogic = "AND" | "OR" | "NOT";

export class ModernQueryBuilder {
  private readonly fieldKeys: string[];
  private readonly adapterType: string;
  private readonly securityLimits = SECURITY_LIMITS;
  private readonly customHandlerCache = new Map<string, CustomFieldCondition>();
  private requiresInMemoryFiltering = false;

  constructor(
    private readonly model: AbstractModel<any>,
    private readonly fields: Fields,
    private readonly dataAccessor: DataAccessor
  ) {
    this.fieldKeys = Object.keys(this.fields ?? {});
    this.adapterType = this.resolveAdapterType();
  }

  async execute(params: QueryParams): Promise<QueryResult> {
    const safePage = this.normalizePage(params.page);
    const safeLimit = this.normalizeLimit(params.limit);
    const whereClause = await this.buildWhere(params);
    const orderClause = this.buildOrder(params);
    const offset = (safePage - 1) * safeLimit;
    const inMemoryPredicate = this.requiresInMemoryFiltering
      ? this.buildInMemoryPredicate(params)
      : null;

    if (!this.requiresInMemoryFiltering) {
      const [data, total, filtered] = await Promise.all([
        this.model.find(
          {
            where: whereClause,
            sort: orderClause,
            skip: offset,
            limit: safeLimit
          },
          this.dataAccessor
        ),
        this.model.count({}, this.dataAccessor),
        this.model.count({ where: whereClause }, this.dataAccessor)
      ]);

      const mappedData = this.mapData(data ?? []);
      const pages = safeLimit > 0 ? Math.ceil(filtered / safeLimit) : 1;

      return {
        data: mappedData,
        total,
        filtered,
        page: safePage,
        limit: safeLimit,
        pages
      };
    }

    const [rawData, total] = await Promise.all([
      this.model.find(
        {
          where: whereClause,
          sort: orderClause
        },
        this.dataAccessor
      ),
      this.model.count({}, this.dataAccessor)
    ]);

    const filteredData = inMemoryPredicate
      ? rawData.filter((record) => inMemoryPredicate(record as Record<string, unknown>))
      : rawData;

    const filtered = filteredData.length;
    const start = (safePage - 1) * safeLimit;
    const pageData = safeLimit > 0
      ? filteredData.slice(start, start + safeLimit)
      : filteredData;
    const mappedData = this.mapData(pageData ?? []);
    const pages = safeLimit > 0 ? Math.ceil(filtered / safeLimit) : 1;

    return {
      data: mappedData,
      total,
      filtered,
      page: safePage,
      limit: safeLimit,
      pages
    };
  }

  async *stream(
    params: QueryParams,
    options: { chunkSize?: number } = {}
  ): AsyncGenerator<Record<string, unknown>> {
    const chunkSize = this.normalizeLimit(options.chunkSize ?? params.limit ?? 500);
    const whereClause = await this.buildWhere(params);
    const orderClause = this.buildOrder(params);
    const inMemoryPredicate = this.requiresInMemoryFiltering
      ? this.buildInMemoryPredicate(params)
      : null;

    if (!this.requiresInMemoryFiltering) {
      let offset = 0;
      while (true) {
        const data = await this.model.find(
          {
            where: whereClause,
            sort: orderClause,
            skip: offset,
            limit: chunkSize
          },
          this.dataAccessor
        );

        if (!data || data.length === 0) {
          break;
        }

        const mappedData = this.mapData(data ?? []);
        for (const row of mappedData) {
          yield row;
        }

        if (data.length < chunkSize) {
          break;
        }
        offset += chunkSize;
      }
      return;
    }

    const rawData = await this.model.find(
      {
        where: whereClause,
        sort: orderClause
      },
      this.dataAccessor
    );

    const filteredData = inMemoryPredicate
      ? rawData.filter((record) => inMemoryPredicate(record as Record<string, unknown>))
      : rawData;

    const mappedData = this.mapData(filteredData ?? []);
    for (const row of mappedData) {
      yield row;
    }
  }

  private normalizePage(page: number): number {
    if (!Number.isFinite(page) || page < 1) {
      return 1;
    }
    return Math.floor(page);
  }

  private normalizeLimit(limit: number): number {
    if (!Number.isFinite(limit) || limit < 1) {
      return 10;
    }
    return Math.floor(limit);
  }

  private resolveAdapterType(): string {
    const modelAdapter = this.dataAccessor?.entity?.config?.adapter;
    if (modelAdapter) {
      return String(modelAdapter).toLowerCase();
    }

    const defaultAdapter = this.dataAccessor?.adminizer?.config?.system?.defaultORM;
    if (defaultAdapter) {
      return String(defaultAdapter).toLowerCase();
    }

    const adapters = this.dataAccessor?.adminizer?.ormAdapters;
    if (Array.isArray(adapters) && adapters.length === 1) {
      return String(adapters[0].ormType).toLowerCase();
    }

    return "waterline";
  }

  private resetCustomHandlerState(): void {
    this.customHandlerCache.clear();
    this.requiresInMemoryFiltering = false;
  }

  private async buildWhere(params: QueryParams): Promise<Record<string, any>> {
    this.resetCustomHandlerState();
    const conditions: Record<string, any>[] = [];

    if (Array.isArray(params.filters) && params.filters.length > 0) {
      const counter: ConditionCounter = {
        remaining: this.securityLimits.maxConditions
      };
      const filterGroup = this.buildConditionGroup(params.filters, "AND", 0, counter);
      if (Object.keys(filterGroup).length > 0) {
        conditions.push(filterGroup);
      }
    }

    if (params.globalSearch) {
      const globalSearch = this.buildGlobalSearch(params.globalSearch, params.fields);
      if (globalSearch) {
        conditions.push(globalSearch);
      }
    }

    if (conditions.length === 0) {
      return {};
    }
    if (conditions.length === 1) {
      return conditions[0];
    }

    return { and: conditions };
  }

  private buildConditionGroup(
    conditions: FilterCondition[],
    logic: ConditionLogic = "AND",
    depth = 0,
    counter?: ConditionCounter
  ): Record<string, any> {
    const activeCounter = counter ?? { remaining: this.securityLimits.maxConditions };

    if (depth > this.securityLimits.maxDepth) {
      this.logSuspicious("Filter nesting depth exceeded", {
        depth,
        maxDepth: this.securityLimits.maxDepth
      });
      return {};
    }

    const clauses: Record<string, any>[] = [];

    for (const cond of conditions) {
      if (activeCounter.remaining <= 0) {
        this.logSuspicious("Filter condition limit exceeded", {
          maxConditions: this.securityLimits.maxConditions
        });
        break;
      }

      activeCounter.remaining -= 1;

      if (!this.isValidCondition(cond, depth)) {
        continue;
      }

      if (Array.isArray(cond.children) && cond.children.length > 0) {
        const nestedLogic = cond.logic ?? "AND";
        const nested = this.buildConditionGroup(
          cond.children,
          nestedLogic,
          depth + 1,
          activeCounter
        );
        if (Object.keys(nested).length > 0) {
          clauses.push(nested);
        }
        continue;
      }

      const clause = this.buildSingleCondition(cond);
      if (Object.keys(clause).length > 0) {
        clauses.push(clause);
      }
    }

    if (logic === "NOT") {
      if (clauses.length !== 1) {
        throw new Error("NOT operator requires exactly one condition");
      }
      return { not: clauses[0] };
    }

    if (clauses.length === 0) {
      return {};
    }
    if (clauses.length === 1) {
      return clauses[0];
    }

    return logic === "OR" ? { or: clauses } : { and: clauses };
  }

  private isValidCondition(cond: FilterCondition, depth = 0): boolean {
    if (depth > this.securityLimits.maxDepth) {
      return false;
    }

    if (Array.isArray(cond.children) && cond.children.length > 0) {
      return this.hasValidChildren(cond.children, depth + 1);
    }

    if (!cond.operator) {
      return false;
    }

    if (cond.customHandler) {
      const handlerId = String(cond.customHandler ?? "").trim();
      const handler = handlerId ? CustomFieldHandler.get(handlerId) : undefined;

      if (!handler) {
        this.logSuspicious("Custom filter handler not registered", {
          handler: cond.customHandler,
          field: cond.field
        });
        return false;
      }

      if (handler.operators && !handler.operators.includes(cond.operator)) {
        this.logSuspicious("Custom filter operator not allowed", {
          handler: cond.customHandler,
          operator: cond.operator
        });
        return false;
      }

      if (handler.validate) {
        const context = this.buildCustomHandlerContext(cond);
        const validation = handler.validate(context);
        if (!validation.valid) {
          this.logSuspicious(validation.reason ?? "Custom filter validation failed", {
            handler: cond.customHandler,
            operator: cond.operator
          });
          return false;
        }
      }

      return true;
    }

    if (cond.operator === "custom") {
      this.logSuspicious("Custom filter operator missing handler", {
        operator: cond.operator,
        field: cond.field
      });
      return false;
    }

    if (cond.relation || cond.relationField) {
      return this.isValidRelationCondition(cond);
    }

    if (!cond.field || !this.isFieldAllowed(cond.field)) {
      this.logSuspicious("Filter field not allowed", { field: cond.field });
      return false;
    }

    const fieldType = this.resolveFieldType(this.fields[cond.field]);
    if (!this.isOperatorAllowed(cond.operator, fieldType)) {
      this.logSuspicious("Filter operator not allowed", {
        field: cond.field,
        operator: cond.operator
      });
      return false;
    }

    const sanitizedValue = this.sanitizeValue(cond.operator, cond.value, fieldType);
    const validation = this.validateOperatorValue(cond.operator, sanitizedValue, fieldType);
    if (!validation.valid) {
      if (validation.suspicious) {
        this.logSuspicious(validation.reason ?? "Invalid filter value", {
          field: cond.field,
          operator: cond.operator
        });
      }
      return false;
    }

    return true;
  }

  private hasValidChildren(children: FilterCondition[], depth = 0): boolean {
    return children.some((child) => this.isValidCondition(child, depth));
  }

  private isValidRelationCondition(cond: FilterCondition): boolean {
    const relationName = String(cond.relation ?? "").trim();
    const relationField = String(cond.relationField ?? "").trim();
    if (!relationName || !relationField || !cond.operator) {
      return false;
    }

    const relation = this.fields[relationName];
    if (!relation) {
      this.logSuspicious("Relation filter references unknown relation", {
        relation: relationName
      });
      return false;
    }

    const relationType = this.resolveFieldType(relation);
    if (relationType !== "association" && relationType !== "association-many") {
      this.logSuspicious("Relation filter references non-association field", {
        relation: relationName,
        relationType
      });
      return false;
    }

    if (relation.populated && !relation.populated[relationField]) {
      this.logSuspicious("Relation filter references unknown relation field", {
        relation: relationName,
        field: relationField
      });
      return false;
    }

    const relationFieldType = relation.populated?.[relationField]
      ? this.resolveFieldType(relation.populated[relationField])
      : undefined;

    if (!this.isOperatorAllowed(cond.operator, relationFieldType)) {
      this.logSuspicious("Relation filter operator not allowed", {
        relation: relationName,
        field: relationField,
        operator: cond.operator
      });
      return false;
    }

    const sanitizedValue = this.sanitizeValue(cond.operator, cond.value, relationFieldType);
    const validation = this.validateOperatorValue(cond.operator, sanitizedValue, relationFieldType);
    if (!validation.valid) {
      if (validation.suspicious) {
        this.logSuspicious(validation.reason ?? "Invalid relation filter value", {
          relation: relationName,
          field: relationField,
          operator: cond.operator
        });
      }
      return false;
    }

    return true;
  }

  private resolveFieldType(field?: Field): string | undefined {
    if (!field) {
      return undefined;
    }
    const modelType = field.model?.type;
    if (modelType) {
      return String(modelType);
    }
    const configType = (field.config as BaseFieldConfig | undefined)?.type;
    return configType ? String(configType) : undefined;
  }

  private normalizeFieldType(fieldType?: string): string {
    if (!fieldType) {
      return "default";
    }

    const normalized = fieldType.toLowerCase();
    if (["int", "integer", "float", "decimal", "number"].includes(normalized)) {
      return "number";
    }
    if (["bool", "boolean", "binary"].includes(normalized)) {
      return "boolean";
    }
    if (["datetime-local"].includes(normalized)) {
      return "datetime";
    }
    if (["text", "longtext", "mediumtext", "string", "password", "email", "color", "month", "week", "range"].includes(normalized)) {
      return "string";
    }
    if (["association", "association-many"].includes(normalized)) {
      return "uuid";
    }
    if (["object"].includes(normalized)) {
      return "json";
    }
    return normalized;
  }

  private isFieldAllowed(fieldKey: string): boolean {
    const normalized = String(fieldKey ?? "").trim();
    if (!normalized) {
      return false;
    }
    return Boolean(this.fields[normalized]);
  }

  private isOperatorAllowed(operator: FilterOperator, fieldType?: string): boolean {
    if (operator === "custom") {
      return true;
    }
    const normalizedType = this.normalizeFieldType(fieldType);
    const allowed = OPERATORS_BY_TYPE[normalizedType] ?? OPERATORS_BY_TYPE.default;
    return allowed.includes(operator);
  }

  private sanitizeValue(
    operator: FilterOperator,
    value: unknown,
    fieldType?: string
  ): unknown {
    if (operator === "isNull" || operator === "isNotNull") {
      return null;
    }

    const normalizedType = this.normalizeFieldType(fieldType);

    if (operator === "between") {
      if (!Array.isArray(value)) {
        return value;
      }
      const pair = value.slice(0, 2);
      return pair.map((item) => this.sanitizePrimitive(item, normalizedType, operator));
    }

    if (operator === "in" || operator === "notIn") {
      const list = Array.isArray(value) ? value : [value];
      return list.map((item) => this.sanitizePrimitive(item, normalizedType, operator));
    }

    return this.sanitizePrimitive(value, normalizedType, operator);
  }

  private sanitizePrimitive(
    value: unknown,
    normalizedType: string,
    operator: FilterOperator
  ): unknown {
    if (value === undefined || value === null) {
      return value;
    }

    if (["like", "ilike", "startsWith", "endsWith", "regex"].includes(operator)) {
      return String(value).trim();
    }

    if (normalizedType === "boolean") {
      if (typeof value === "boolean") {
        return value;
      }
      if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "true") {
          return true;
        }
        if (normalized === "false") {
          return false;
        }
      }
      return value;
    }

    if (normalizedType === "number") {
      if (typeof value === "number") {
        return value;
      }
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) {
          return value;
        }
        const parsed = Number(trimmed);
        return Number.isFinite(parsed) ? parsed : value;
      }
      return value;
    }

    if (normalizedType === "string") {
      return typeof value === "string" ? value.trim() : String(value);
    }

    if (typeof value === "string") {
      return value.trim();
    }

    return value;
  }

  private validateOperatorValue(
    operator: FilterOperator,
    value: unknown,
    fieldType?: string
  ): ValueValidationResult {
    const normalizedType = this.normalizeFieldType(fieldType);
    const maxStringLength = this.securityLimits.maxStringLength;
    const maxRegexLength = this.securityLimits.maxRegexLength;
    const maxArrayLength = this.securityLimits.maxArrayLength;

    if (operator === "isNull" || operator === "isNotNull") {
      return { valid: true };
    }

    if (operator === "between") {
      if (!Array.isArray(value) || value.length !== 2) {
        return { valid: false };
      }
      const [from, to] = value;
      if (this.isEmptyValue(from) || this.isEmptyValue(to)) {
        return { valid: false };
      }
      if (this.isValueTooLong(from, maxStringLength) || this.isValueTooLong(to, maxStringLength)) {
        return {
          valid: false,
          suspicious: true,
          reason: "Filter value exceeds maximum length"
        };
      }
      if (normalizedType === "number") {
        return this.isNumericValue(from) && this.isNumericValue(to)
          ? { valid: true }
          : { valid: false };
      }
      if (normalizedType === "boolean") {
        return this.isBooleanValue(from) && this.isBooleanValue(to)
          ? { valid: true }
          : { valid: false };
      }
      return { valid: true };
    }

    if (operator === "in" || operator === "notIn") {
      const list = Array.isArray(value) ? value : [value];
      if (list.length === 0) {
        return { valid: false };
      }
      if (list.length > maxArrayLength) {
        return {
          valid: false,
          suspicious: true,
          reason: "Filter value list exceeds maximum length"
        };
      }
      for (const item of list) {
        if (this.isEmptyValue(item)) {
          return { valid: false };
        }
        if (this.isValueTooLong(item, maxStringLength)) {
          return {
            valid: false,
            suspicious: true,
            reason: "Filter value exceeds maximum length"
          };
        }
        if (normalizedType === "number" && !this.isNumericValue(item)) {
          return { valid: false };
        }
        if (normalizedType === "boolean" && !this.isBooleanValue(item)) {
          return { valid: false };
        }
      }
      return { valid: true };
    }

    if (["like", "ilike", "startsWith", "endsWith"].includes(operator)) {
      if (typeof value !== "string" && typeof value !== "number") {
        return { valid: false };
      }
      const textValue = String(value).trim();
      if (!textValue) {
        return { valid: false };
      }
      if (textValue.length > maxStringLength) {
        return {
          valid: false,
          suspicious: true,
          reason: "Filter value exceeds maximum length"
        };
      }
      return { valid: true };
    }

    if (operator === "regex") {
      if (typeof value !== "string" && typeof value !== "number") {
        return { valid: false };
      }
      const textValue = String(value).trim();
      if (!textValue) {
        return { valid: false };
      }
      if (textValue.length > maxRegexLength) {
        return {
          valid: false,
          suspicious: true,
          reason: "Regex value exceeds maximum length"
        };
      }
      return { valid: true };
    }

    if (operator === "gt" || operator === "gte" || operator === "lt" || operator === "lte") {
      return this.isNumericValue(value) ? { valid: true } : { valid: false };
    }

    if (operator === "eq" || operator === "neq") {
      if (normalizedType === "boolean") {
        return this.isBooleanValue(value) ? { valid: true } : { valid: false };
      }
      if (normalizedType === "number") {
        return this.isNumericValue(value) ? { valid: true } : { valid: false };
      }
      if (normalizedType === "json") {
        if (value === undefined || value === null) {
          return { valid: false };
        }
        if (typeof value === "string" && value.trim().length === 0) {
          return { valid: false };
        }
        if (this.isValueTooLong(value, maxStringLength)) {
          return {
            valid: false,
            suspicious: true,
            reason: "Filter value exceeds maximum length"
          };
        }
        return { valid: true };
      }
      if (this.isValueTooLong(value, maxStringLength)) {
        return {
          valid: false,
          suspicious: true,
          reason: "Filter value exceeds maximum length"
        };
      }
      return !this.isEmptyValue(value) ? { valid: true } : { valid: false };
    }

    if (this.isValueTooLong(value, maxStringLength)) {
      return {
        valid: false,
        suspicious: true,
        reason: "Filter value exceeds maximum length"
      };
    }

    return !this.isEmptyValue(value) ? { valid: true } : { valid: false };
  }

  private isOperatorValueValid(
    operator: FilterOperator,
    value: unknown,
    fieldType?: string
  ): boolean {
    return this.validateOperatorValue(operator, value, fieldType).valid;
  }

  private isValueTooLong(value: unknown, maxLength: number): boolean {
    if (typeof value !== "string") {
      return false;
    }
    return value.length > maxLength;
  }

  private isEmptyValue(value: unknown): boolean {
    if (value === undefined || value === null) {
      return true;
    }
    if (typeof value === "string") {
      return value.trim().length === 0;
    }
    return false;
  }

  private isNumericValue(value: unknown): boolean {
    if (typeof value === "number") {
      return Number.isFinite(value);
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) {
        return false;
      }
      const parsed = Number(trimmed);
      return Number.isFinite(parsed);
    }
    return false;
  }

  private isBooleanValue(value: unknown): boolean {
    if (typeof value === "boolean") {
      return true;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      return normalized === "true" || normalized === "false";
    }
    return false;
  }

  private logSuspicious(message: string, details?: Record<string, unknown>): void {
    const modelName =
      (this.model as unknown as { tableName?: string })?.tableName ??
      (this.model as unknown as { modelname?: string })?.modelname ??
      "unknown";
    const payload = details ? ` ${JSON.stringify(details)}` : "";
    Adminizer.log.warn(`[FilterSecurity] ${message} (model: ${modelName})${payload}`);
  }

  private buildSingleCondition(cond: FilterCondition): Record<string, any> {
    if (cond.customHandler) {
      return this.buildCustomHandlerCondition(cond);
    }

    if (cond.rawSQL) {
      this.logSuspicious("Raw SQL condition rejected without custom handler", {
        field: cond.field
      });
      return {};
    }

    if (cond.relation && cond.relationField) {
      return this.buildRelationCondition(cond);
    }

    if (!cond.field) {
      return {};
    }

    const field = this.fields[cond.field];
    const fieldType = this.resolveFieldType(field);
    const sanitizedValue = this.sanitizeValue(cond.operator, cond.value, fieldType);
    if (!this.validateOperatorValue(cond.operator, sanitizedValue, fieldType).valid) {
      return {};
    }

    const mapped = this.mapOperatorToCondition(cond.operator, sanitizedValue);
    if (mapped === undefined) {
      return {};
    }

    return { [cond.field]: mapped };
  }

  private buildRelationCondition(cond: FilterCondition): Record<string, any> {
    if (this.adapterType !== "sequelize") {
      return {};
    }

    const relation = cond.relation ? this.fields[cond.relation] : undefined;
    const relationFieldType = relation?.populated?.[String(cond.relationField)]
      ? this.resolveFieldType(relation.populated[String(cond.relationField)])
      : undefined;
    const sanitizedValue = this.sanitizeValue(cond.operator, cond.value, relationFieldType);
    if (!this.validateOperatorValue(cond.operator, sanitizedValue, relationFieldType).valid) {
      return {};
    }

    const mapped = this.mapOperatorToCondition(cond.operator, sanitizedValue);
    if (mapped === undefined) {
      return {};
    }

    return {
      _relation: {
        name: cond.relation,
        field: cond.relationField,
        condition: mapped
      }
    };
  }

  private buildCustomHandlerContext(cond: FilterCondition): CustomFieldHandlerContext {
    const modelName = this.model?.modelname ?? this.model?.identity;
    return {
      operator: cond.operator,
      value: cond.value,
      adapterType: this.adapterType,
      field: cond.field,
      modelName,
      params: cond.customHandlerParams
    };
  }

  private resolveCustomHandlerCondition(cond: FilterCondition): CustomFieldCondition | null {
    const handlerId = String(cond.customHandler ?? "").trim();
    if (!handlerId) {
      return null;
    }

    const cacheKey = cond.id ? `${handlerId}:${cond.id}` : `${handlerId}:${cond.operator}:${JSON.stringify(cond.value)}`;
    const cached = this.customHandlerCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const handler = CustomFieldHandler.get(handlerId);
    if (!handler) {
      return null;
    }

    const context = this.buildCustomHandlerContext(cond);

    try {
      const condition = handler.buildCondition(context);
      this.customHandlerCache.set(cacheKey, condition);
      return condition;
    } catch (error) {
      Adminizer.log.error(`Custom handler "${handlerId}" failed:`, error);
      return null;
    }
  }

  private buildCustomHandlerCondition(cond: FilterCondition): Record<string, any> {
    const handlerId = String(cond.customHandler ?? "").trim();
    if (!handlerId) {
      return {};
    }

    const handler = CustomFieldHandler.get(handlerId);
    if (!handler) {
      return {};
    }

    const condition = this.resolveCustomHandlerCondition(cond);
    if (!condition) {
      return {};
    }

    if (condition.rawSQL) {
      if (this.adapterType === "sequelize") {
        const params = Array.isArray(condition.rawSQLParams) ? condition.rawSQLParams : [];
        return {
          [RAW_SQL_KEY]: {
            sql: condition.rawSQL,
            params
          }
        };
      }

      if (!condition.inMemory) {
        this.logSuspicious("Raw SQL custom handler requires in-memory fallback", {
          handler: handlerId,
          adapter: this.adapterType
        });
      }

      this.requiresInMemoryFiltering = true;
      return {};
    }

    if (condition.criteria && Object.keys(condition.criteria).length > 0) {
      return condition.criteria;
    }

    if (condition.inMemory) {
      this.requiresInMemoryFiltering = true;
      return {};
    }

    return {};
  }

  private mapOperatorToCondition(operator: FilterOperator, value: unknown): any {
    switch (operator) {
      case "eq":
        return value;
      case "neq":
        return { "!=": value };
      case "gt":
        return { ">": value };
      case "gte":
        return { ">=": value };
      case "lt":
        return { "<": value };
      case "lte":
        return { "<=": value };
      case "like":
        return { contains: value };
      case "ilike": {
        const strValue = String(value ?? "");
        if (this.adapterType === "sequelize") {
          return { ilike: `%${strValue}%` };
        }
        return { contains: strValue };
      }
      case "startsWith":
        return { startsWith: value };
      case "endsWith":
        return { endsWith: value };
      case "regex": {
        const strValue = String(value ?? "");
        if (this.adapterType === "sequelize") {
          return { regexp: strValue };
        }
        return { contains: strValue };
      }
      case "in": {
        const list = Array.isArray(value) ? value : [value];
        return { in: list };
      }
      case "notIn": {
        const list = Array.isArray(value) ? value : [value];
        return { nin: list };
      }
      case "between": {
        if (!Array.isArray(value) || value.length !== 2) {
          return undefined;
        }
        return { ">=": value[0], "<=": value[1] };
      }
      case "isNull":
        return null;
      case "isNotNull":
        return { "!=": null };
      case "custom":
        return undefined;
      default:
        return value;
    }
  }

  private buildGlobalSearch(
    searchValue: string,
    targetFields?: string[]
  ): Record<string, any> | null {
    const trimmedValue = String(searchValue).trim();
    if (!trimmedValue) {
      return null;
    }
    if (trimmedValue.length > this.securityLimits.maxStringLength) {
      this.logSuspicious("Global search value exceeds maximum length", {
        length: trimmedValue.length
      });
      return null;
    }

    const searchFields = Array.isArray(targetFields) && targetFields.length > 0
      ? targetFields.filter((field) => this.fields[field])
      : this.fieldKeys;

    const clauses = searchFields
      .map((fieldKey) => this.buildSearchCondition(fieldKey, trimmedValue))
      .filter((condition) => condition !== null) as Record<string, any>[];

    if (clauses.length === 0) {
      return null;
    }

    return { or: clauses };
  }

  private buildSearchCondition(fieldKey: string, searchValue: string): Record<string, any> | null {
    const field = this.fields[fieldKey];
    if (!field) {
      return null;
    }

    const modelType = field.model?.type;
    if (modelType === "boolean") {
      if (searchValue.toLowerCase() === "true") {
        return { [fieldKey]: true };
      }
      if (searchValue.toLowerCase() === "false") {
        return { [fieldKey]: false };
      }
      return null;
    }

    if (modelType === "number") {
      if (searchValue.startsWith(">") || searchValue.startsWith("<")) {
        const num = parseFloat(searchValue.slice(1));
        if (Number.isNaN(num)) {
          return null;
        }
        if (searchValue.startsWith(">")) {
          return { [fieldKey]: { ">=": num } };
        }
        return { [fieldKey]: { "<=": num } };
      }

      const parsed = parseFloat(searchValue);
      if (!Number.isNaN(parsed)) {
        return { [fieldKey]: parsed };
      }
      return null;
    }

    if (modelType === "string") {
      return { [fieldKey]: { contains: searchValue } };
    }

    return null;
  }

  private buildInMemoryPredicate(params: QueryParams): InMemoryPredicate | null {
    const filters = Array.isArray(params.filters) ? params.filters : [];
    const filterPredicate = filters.length > 0
      ? this.buildConditionEvaluator(filters, "AND", 0)
      : null;
    const globalPredicate = params.globalSearch
      ? this.buildGlobalSearchEvaluator(params.globalSearch, params.fields)
      : null;

    if (!filterPredicate && !globalPredicate) {
      return null;
    }

    return (record) => {
      const filterPass = filterPredicate ? filterPredicate(record) : true;
      const globalPass = globalPredicate ? globalPredicate(record) : true;
      return filterPass && globalPass;
    };
  }

  private buildConditionEvaluator(
    conditions: FilterCondition[],
    logic: ConditionLogic = "AND",
    depth = 0
  ): InMemoryPredicate | null {
    if (depth > this.securityLimits.maxDepth) {
      return null;
    }

    const evaluators: InMemoryPredicate[] = [];

    for (const cond of conditions) {
      if (!this.isValidCondition(cond, depth)) {
        continue;
      }

      if (Array.isArray(cond.children) && cond.children.length > 0) {
        const childEvaluator = this.buildConditionEvaluator(
          cond.children,
          cond.logic ?? "AND",
          depth + 1
        );
        if (childEvaluator) {
          evaluators.push(childEvaluator);
        }
        continue;
      }

      const leafEvaluator = this.buildLeafEvaluator(cond);
      if (leafEvaluator) {
        evaluators.push(leafEvaluator);
      }
    }

    if (evaluators.length === 0) {
      return null;
    }

    if (logic === "NOT") {
      if (evaluators.length !== 1) {
        throw new Error("NOT operator requires exactly one condition");
      }
      return (record) => !evaluators[0](record);
    }

    if (logic === "OR") {
      return (record) => evaluators.some((fn) => fn(record));
    }

    return (record) => evaluators.every((fn) => fn(record));
  }

  private buildLeafEvaluator(cond: FilterCondition): InMemoryPredicate | null {
    if (cond.customHandler) {
      const handlerCondition = this.resolveCustomHandlerCondition(cond);
      if (!handlerCondition) {
        return null;
      }

      if (handlerCondition.inMemory) {
        return (record) => handlerCondition.inMemory?.(record) ?? false;
      }

      if (handlerCondition.criteria) {
        return this.buildCriteriaEvaluator(handlerCondition.criteria);
      }

      this.logSuspicious("Custom handler missing in-memory support", {
        handler: cond.customHandler
      });
      return null;
    }

    if (cond.relation && cond.relationField) {
      return this.buildRelationEvaluator(cond);
    }

    if (!cond.field) {
      return null;
    }

    const field = this.fields[cond.field];
    const fieldType = this.resolveFieldType(field);
    const sanitizedValue = this.sanitizeValue(cond.operator, cond.value, fieldType);
    if (!this.validateOperatorValue(cond.operator, sanitizedValue, fieldType).valid) {
      return null;
    }

    return (record) =>
      this.evaluateOperator(
        (record as Record<string, unknown>)[cond.field],
        cond.operator,
        sanitizedValue,
        fieldType
      );
  }

  private buildRelationEvaluator(cond: FilterCondition): InMemoryPredicate | null {
    const relationName = String(cond.relation ?? "").trim();
    const relationField = String(cond.relationField ?? "").trim();
    if (!relationName || !relationField) {
      return null;
    }

    const relation = this.fields[relationName];
    const relationFieldType = relation?.populated?.[relationField]
      ? this.resolveFieldType(relation.populated[relationField])
      : undefined;
    const sanitizedValue = this.sanitizeValue(cond.operator, cond.value, relationFieldType);
    if (!this.validateOperatorValue(cond.operator, sanitizedValue, relationFieldType).valid) {
      return null;
    }

    return (record) => {
      const relationValue = (record as Record<string, unknown>)[relationName];
      if (Array.isArray(relationValue)) {
        return relationValue.some((item) => {
          if (!item || typeof item !== "object") {
            return false;
          }
          return this.evaluateOperator(
            (item as Record<string, unknown>)[relationField],
            cond.operator,
            sanitizedValue,
            relationFieldType
          );
        });
      }

      if (relationValue && typeof relationValue === "object") {
        return this.evaluateOperator(
          (relationValue as Record<string, unknown>)[relationField],
          cond.operator,
          sanitizedValue,
          relationFieldType
        );
      }

      return false;
    };
  }

  private buildCriteriaEvaluator(criteria: Record<string, unknown>): InMemoryPredicate | null {
    if (!criteria || typeof criteria !== "object") {
      return null;
    }

    return (record) => this.evaluateCriteriaObject(criteria, record);
  }

  private evaluateCriteriaObject(
    criteria: Record<string, unknown>,
    record: Record<string, unknown>
  ): boolean {
    let result = true;

    for (const [key, value] of Object.entries(criteria)) {
      const normalizedKey = key.toLowerCase();
      if (normalizedKey === "and") {
        const list = Array.isArray(value) ? value : [];
        result = result && list.every((entry) =>
          entry && typeof entry === "object"
            ? this.evaluateCriteriaObject(entry as Record<string, unknown>, record)
            : true
        );
        continue;
      }
      if (normalizedKey === "or") {
        const list = Array.isArray(value) ? value : [];
        result = result && list.some((entry) =>
          entry && typeof entry === "object"
            ? this.evaluateCriteriaObject(entry as Record<string, unknown>, record)
            : false
        );
        continue;
      }
      if (normalizedKey === "not") {
        if (value && typeof value === "object") {
          result = result && !this.evaluateCriteriaObject(value as Record<string, unknown>, record);
        }
        continue;
      }

      result = result && this.evaluateCriteriaValue(record[key], value);
    }

    return result;
  }

  private evaluateCriteriaValue(recordValue: unknown, criteriaValue: unknown): boolean {
    if (criteriaValue === undefined) {
      return true;
    }
    if (criteriaValue === null) {
      return recordValue === null || recordValue === undefined;
    }
    if (Array.isArray(criteriaValue)) {
      if (Array.isArray(recordValue)) {
        return recordValue.some((item) => criteriaValue.includes(item));
      }
      return criteriaValue.includes(recordValue as never);
    }
    if (typeof criteriaValue === "object") {
      const entries = Object.entries(criteriaValue as Record<string, unknown>);
      if (entries.length === 0) {
        return true;
      }
      return entries.every(([op, operand]) =>
        this.evaluateCriteriaOperator(recordValue, op, operand)
      );
    }

    if (Array.isArray(recordValue)) {
      return recordValue.includes(criteriaValue as never);
    }

    return recordValue === criteriaValue;
  }

  private evaluateCriteriaOperator(
    recordValue: unknown,
    operator: string,
    operand: unknown
  ): boolean {
    switch (operator) {
      case "contains":
        return this.evaluateOperator(recordValue, "like", operand);
      case "ilike":
        return this.evaluateOperator(recordValue, "ilike", operand);
      case "startsWith":
        return this.evaluateOperator(recordValue, "startsWith", operand);
      case "endsWith":
        return this.evaluateOperator(recordValue, "endsWith", operand);
      case "regexp":
      case "regex":
        return this.evaluateOperator(recordValue, "regex", operand);
      case ">":
        return this.evaluateOperator(recordValue, "gt", operand);
      case ">=":
        return this.evaluateOperator(recordValue, "gte", operand);
      case "<":
        return this.evaluateOperator(recordValue, "lt", operand);
      case "<=":
        return this.evaluateOperator(recordValue, "lte", operand);
      case "!=":
        return this.evaluateOperator(recordValue, "neq", operand);
      case "in":
        return this.evaluateOperator(recordValue, "in", operand);
      case "nin":
      case "notIn":
        return this.evaluateOperator(recordValue, "notIn", operand);
      default:
        return this.evaluateOperator(recordValue, "eq", operand);
    }
  }

  private buildGlobalSearchEvaluator(
    searchValue: string,
    targetFields?: string[]
  ): InMemoryPredicate | null {
    const trimmedValue = String(searchValue).trim();
    if (!trimmedValue) {
      return null;
    }
    if (trimmedValue.length > this.securityLimits.maxStringLength) {
      this.logSuspicious("Global search value exceeds maximum length", {
        length: trimmedValue.length
      });
      return null;
    }

    const searchFields = Array.isArray(targetFields) && targetFields.length > 0
      ? targetFields.filter((field) => this.fields[field])
      : this.fieldKeys;

    const evaluators = searchFields
      .map((fieldKey) => this.buildSearchFieldEvaluator(fieldKey, trimmedValue))
      .filter((fn): fn is InMemoryPredicate => Boolean(fn));

    if (evaluators.length === 0) {
      return null;
    }

    return (record) => evaluators.some((fn) => fn(record));
  }

  private buildSearchFieldEvaluator(fieldKey: string, searchValue: string): InMemoryPredicate | null {
    const field = this.fields[fieldKey];
    if (!field) {
      return null;
    }

    const modelType = field.model?.type;
    if (modelType === "boolean") {
      const lower = searchValue.toLowerCase();
      if (lower !== "true" && lower !== "false") {
        return null;
      }
      const target = lower === "true";
      return (record) => (record[fieldKey] as boolean) === target;
    }

    if (modelType === "number") {
      const hasComparator = searchValue.startsWith(">") || searchValue.startsWith("<");
      if (hasComparator) {
        const parsed = parseFloat(searchValue.slice(1));
        if (Number.isNaN(parsed)) {
          return null;
        }
        if (searchValue.startsWith(">")) {
          return (record) => {
            const value = record[fieldKey];
            return typeof value === "number" ? value >= parsed : false;
          };
        }
        return (record) => {
          const value = record[fieldKey];
          return typeof value === "number" ? value <= parsed : false;
        };
      }

      const parsed = parseFloat(searchValue);
      if (!Number.isNaN(parsed)) {
        return (record) => record[fieldKey] === parsed;
      }
      return null;
    }

    if (modelType === "string") {
      return (record) => {
        const value = record[fieldKey];
        return typeof value === "string" ? value.includes(searchValue) : false;
      };
    }

    return null;
  }

  private evaluateOperator(
    recordValue: unknown,
    operator: FilterOperator,
    comparisonValue: unknown,
    fieldType?: string
  ): boolean {
    const normalizedType = this.normalizeFieldType(fieldType);
    const left = this.coerceValueForComparison(recordValue, normalizedType, operator);
    const right = this.coerceValueForComparison(comparisonValue, normalizedType, operator);

    switch (operator) {
      case "eq":
        if (normalizedType === "json") {
          return JSON.stringify(recordValue ?? null) === JSON.stringify(comparisonValue ?? null);
        }
        if (Array.isArray(left) && Array.isArray(right)) {
          return JSON.stringify(left) === JSON.stringify(right);
        }
        if (Array.isArray(left)) {
          return left.includes(right as never);
        }
        return left === right;
      case "neq":
        if (normalizedType === "json") {
          return JSON.stringify(recordValue ?? null) !== JSON.stringify(comparisonValue ?? null);
        }
        if (Array.isArray(left) && Array.isArray(right)) {
          return JSON.stringify(left) !== JSON.stringify(right);
        }
        if (Array.isArray(left)) {
          return !left.includes(right as never);
        }
        return left !== right;
      case "gt":
      case "gte":
      case "lt":
      case "lte": {
        const leftNum = this.isNumericValue(left) ? Number(left) : NaN;
        const rightNum = this.isNumericValue(right) ? Number(right) : NaN;
        if (Number.isNaN(leftNum) || Number.isNaN(rightNum)) {
          return false;
        }
        if (operator === "gt") return leftNum > rightNum;
        if (operator === "gte") return leftNum >= rightNum;
        if (operator === "lt") return leftNum < rightNum;
        return leftNum <= rightNum;
      }
      case "like": {
        const leftStr = String(left ?? "");
        const rightStr = String(right ?? "");
        return leftStr.includes(rightStr);
      }
      case "ilike": {
        const leftStr = String(left ?? "").toLowerCase();
        const rightStr = String(right ?? "").toLowerCase();
        return leftStr.includes(rightStr);
      }
      case "startsWith": {
        const leftStr = String(left ?? "");
        const rightStr = String(right ?? "");
        return leftStr.startsWith(rightStr);
      }
      case "endsWith": {
        const leftStr = String(left ?? "");
        const rightStr = String(right ?? "");
        return leftStr.endsWith(rightStr);
      }
      case "regex": {
        try {
          const regex = new RegExp(String(right ?? ""));
          return regex.test(String(left ?? ""));
        } catch (error) {
          return false;
        }
      }
      case "in":
      case "notIn": {
        const list = Array.isArray(right) ? right : [right];
        const matches = Array.isArray(left)
          ? left.some((item) => list.includes(item as never))
          : list.includes(left as never);
        return operator === "in" ? matches : !matches;
      }
      case "between": {
        if (!Array.isArray(right) || right.length !== 2) {
          return false;
        }
        const [min, max] = right;
        const leftNum = this.isNumericValue(left) ? Number(left) : NaN;
        const minNum = this.isNumericValue(min) ? Number(min) : NaN;
        const maxNum = this.isNumericValue(max) ? Number(max) : NaN;
        if (!Number.isNaN(leftNum) && !Number.isNaN(minNum) && !Number.isNaN(maxNum)) {
          return leftNum >= minNum && leftNum <= maxNum;
        }
        const leftStr = String(left ?? "");
        return leftStr >= String(min ?? "") && leftStr <= String(max ?? "");
      }
      case "isNull":
        return recordValue === null || recordValue === undefined;
      case "isNotNull":
        return recordValue !== null && recordValue !== undefined;
      default:
        return false;
    }
  }

  private coerceValueForComparison(
    value: unknown,
    normalizedType: string,
    operator: FilterOperator
  ): unknown {
    if (value === undefined || value === null) {
      return value;
    }

    if (["like", "ilike", "startsWith", "endsWith", "regex"].includes(operator)) {
      return String(value);
    }

    if (normalizedType === "boolean") {
      if (typeof value === "boolean") {
        return value;
      }
      if (typeof value === "string") {
        const lower = value.trim().toLowerCase();
        if (lower === "true") return true;
        if (lower === "false") return false;
      }
      return value;
    }

    if (normalizedType === "number") {
      if (typeof value === "number") {
        return value;
      }
      if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : value;
      }
      return value;
    }

    if (normalizedType === "string") {
      return typeof value === "string" ? value : String(value);
    }

    return value;
  }

  private buildOrder(params: QueryParams): string {
    const sortField = params.sort;
    const direction = this.normalizeSortDirection(params.sortDirection);

    if (sortField && this.fields[sortField]) {
      return `${sortField} ${direction}`;
    }

    const fallbackField = this.resolveFallbackSortField();
    return `${fallbackField} DESC`;
  }

  private resolveFallbackSortField(): string {
    if (this.fieldKeys.includes("createdAt")) {
      return "createdAt";
    }

    if (this.model.primaryKey) {
      return String(this.model.primaryKey);
    }

    if (this.fieldKeys.length > 0) {
      return this.fieldKeys[0];
    }

    return "createdAt";
  }

  private normalizeSortDirection(direction?: QuerySortDirection): QuerySortDirection {
    return direction === "ASC" ? "ASC" : "DESC";
  }

  private mapData(data: Array<Record<string, any>>): Array<Record<string, any>> {
    if (!Array.isArray(data)) {
      return [];
    }

    const rows: Array<Record<string, any>> = [];
    const primaryKey = this.model.primaryKey ?? "id";

    data.forEach((record) => {
      const row: Record<string, any> = {};
      row[primaryKey] = record?.[primaryKey];

      this.fieldKeys.forEach((fieldKey) => {
        const field = this.fields[fieldKey] as Field;
        if (!field) {
          return;
        }

        const fieldConfig = field.config as BaseFieldConfig;
        const fieldValue = record?.[fieldKey];

        if (fieldConfig && typeof fieldConfig.displayModifier === "function") {
          row[fieldKey] = fieldConfig.displayModifier(fieldValue);
          return;
        }

        if (field.model?.model) {
          row[fieldKey] = this.getAssociationValue(field, fieldValue);
          return;
        }

        if (field.model?.type === "association-many" || field.model?.type === "association") {
          row[fieldKey] = this.getAssociationValue(field, fieldValue);
          return;
        }

        if (field.model?.type === "json") {
          if (fieldValue === null || fieldValue === undefined) {
            row[fieldKey] = null;
          } else {
            const stringified = typeof fieldValue === "string"
              ? fieldValue
              : JSON.stringify(fieldValue);
            row[fieldKey] = stringified === "{}" ? "" : stringified;
          }
          return;
        }

        row[fieldKey] = fieldValue;
      });

      rows.push(row);
    });

    return rows;
  }

  private getAssociationValue(field: Field, fieldValue: unknown): string | number | null {
    if (fieldValue === null || fieldValue === undefined) {
      return null;
    }

    const displayField = this.resolveDisplayField(field, fieldValue);

    if (Array.isArray(fieldValue)) {
      const values = fieldValue
        .map((item) => {
          if (item && typeof item === "object") {
            const record = item as Record<string, any>;
            return record[displayField] ?? record[(field.config as BaseFieldConfig)?.identifierField ?? "id"];
          }
          return item;
        })
        .filter((item) => item !== undefined && item !== null)
        .map((item) => String(item));

      return values.length > 0 ? values.join(", ") : null;
    }

    if (typeof fieldValue === "object") {
      const record = fieldValue as Record<string, any>;
      const value = record[displayField];
      if (value !== undefined && value !== null) {
        return value as string | number;
      }
      const identifierField = (field.config as BaseFieldConfig)?.identifierField ?? "id";
      return record[identifierField] ?? null;
    }

    return fieldValue as string | number;
  }

  private resolveDisplayField(field: Field, fieldValue: unknown): string {
    const fieldConfig = field.config as BaseFieldConfig;
    const modelConfig = field.modelConfig;

    if (fieldConfig?.displayField) {
      return fieldConfig.displayField;
    }
    if (modelConfig?.titleField) {
      return modelConfig.titleField;
    }
    if (fieldConfig?.identifierField) {
      return fieldConfig.identifierField;
    }
    if (modelConfig?.identifierField) {
      return modelConfig.identifierField;
    }

    if (fieldValue && typeof fieldValue === "object") {
      if ("title" in fieldValue) {
        return "title";
      }
      if ("name" in fieldValue) {
        return "name";
      }
    }

    return "id";
  }
}
