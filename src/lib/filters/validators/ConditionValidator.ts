import { FilterCondition, FilterOperator } from "../../../models/FilterAP";
import { UserAP } from "../../../models/UserAP";
import { Adminizer } from "../../Adminizer";
import { Field, Fields } from "../../../helpers/fieldsHelper";
import {
  CustomFieldHandler,
  CustomFieldHandlerContext
} from "../../query-builder/CustomFieldHandler";
import { FilterAccessService } from "../services/FilterAccessService";
import { resolveModelContext } from "../utils/modelResolver";

export type ValidationError = {
  path: string;
  code: string;
  message: string;
};

export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
  sanitizedConditions?: FilterCondition[];
};

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
  date: [
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "between",
    "isNull",
    "isNotNull"
  ],
  datetime: [
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "between",
    "isNull",
    "isNotNull"
  ],
  time: [
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "between",
    "isNull",
    "isNotNull"
  ],
  uuid: ["eq", "neq", "in", "notIn", "isNull", "isNotNull"],
  json: ["eq", "neq", "isNull", "isNotNull"],
  default: ["eq", "neq", "like", "in", "notIn", "isNull", "isNotNull"]
};

export class ConditionValidator {
  private readonly accessService: FilterAccessService;

  constructor(private readonly adminizer: Adminizer, accessService?: FilterAccessService) {
    this.accessService = accessService ?? new FilterAccessService(adminizer);
  }

  public validate(
    conditions: FilterCondition[],
    modelName: string,
    user: UserAP
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(conditions)) {
      return {
        valid: false,
        errors: [
          {
            path: "conditions",
            code: "INVALID_TYPE",
            message: "conditions must be an array"
          }
        ],
        warnings
      };
    }

    let fields: Fields = {};
    let adapterType = "waterline";
    let resolvedModelName = modelName;

    try {
      const context = resolveModelContext(this.adminizer, modelName, user, "list");
      fields = context.fields;
      adapterType = context.adapterType;
      resolvedModelName = context.entry.name;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        valid: false,
        errors: [
          {
            path: "modelName",
            code: "MODEL_NOT_FOUND",
            message
          }
        ],
        warnings
      };
    }

    const sanitizedConditions = this.validateConditions(
      conditions,
      fields,
      adapterType,
      resolvedModelName,
      user,
      errors,
      warnings,
      "conditions"
    );

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      sanitizedConditions: errors.length === 0 ? sanitizedConditions : undefined
    };
  }

  private validateConditions(
    conditions: FilterCondition[],
    fields: Fields,
    adapterType: string,
    modelName: string,
    user: UserAP,
    errors: ValidationError[],
    warnings: string[],
    path: string
  ): FilterCondition[] {
    const sanitized: FilterCondition[] = [];

    conditions.forEach((condition, index) => {
      const conditionPath = `${path}[${index}]`;
      const next = this.validateCondition(
        condition,
        fields,
        adapterType,
        modelName,
        user,
        errors,
        warnings,
        conditionPath
      );

      if (next) {
        sanitized.push(next);
      }
    });

    return sanitized;
  }

  private validateCondition(
    condition: FilterCondition,
    fields: Fields,
    adapterType: string,
    modelName: string,
    user: UserAP,
    errors: ValidationError[],
    warnings: string[],
    path: string
  ): FilterCondition | null {
    if (condition.children && Array.isArray(condition.children)) {
      const children = this.validateConditions(
        condition.children,
        fields,
        adapterType,
        modelName,
        user,
        errors,
        warnings,
        `${path}.children`
      );

      if (children.length === 0) {
        errors.push({
          path: `${path}.children`,
          code: "EMPTY_GROUP",
          message: "Condition group must contain at least one valid child"
        });
        return null;
      }

      return { ...condition, children };
    }

    if (!condition.operator) {
      errors.push({
        path: `${path}.operator`,
        code: "MISSING_OPERATOR",
        message: "Operator is required"
      });
      return null;
    }

    if (condition.customHandler) {
      return this.validateCustomHandlerCondition(
        condition,
        adapterType,
        modelName,
        user,
        errors,
        warnings,
        path
      );
    }

    if (condition.rawSQL) {
      errors.push({
        path: `${path}.rawSQL`,
        code: "RAW_SQL_UNSUPPORTED",
        message: "Raw SQL conditions require a custom handler"
      });
      return null;
    }

    if (condition.operator === "custom") {
      errors.push({
        path: `${path}.customHandler`,
        code: "MISSING_CUSTOM_HANDLER",
        message: "Custom operator requires a customHandler"
      });
      return null;
    }

    if (condition.relation || condition.relationField) {
      return this.validateRelationCondition(
        condition,
        fields,
        errors,
        path
      );
    }

    return this.validateFieldCondition(condition, fields, errors, path);
  }

  private validateCustomHandlerCondition(
    condition: FilterCondition,
    adapterType: string,
    modelName: string,
    user: UserAP,
    errors: ValidationError[],
    warnings: string[],
    path: string
  ): FilterCondition | null {
    const handlerId = String(condition.customHandler ?? "").trim();
    if (!handlerId) {
      errors.push({
        path: `${path}.customHandler`,
        code: "INVALID_CUSTOM_HANDLER",
        message: "Custom handler id is required"
      });
      return null;
    }

    const handler = CustomFieldHandler.get(handlerId);
    if (!handler) {
      errors.push({
        path: `${path}.customHandler`,
        code: "UNKNOWN_CUSTOM_HANDLER",
        message: `Custom handler "${handlerId}" is not registered`
      });
      return null;
    }

    if (handler.operators && !handler.operators.includes(condition.operator)) {
      errors.push({
        path: `${path}.operator`,
        code: "INVALID_OPERATOR",
        message: `Operator "${condition.operator}" is not allowed for handler "${handlerId}"`
      });
      return null;
    }

    const context: CustomFieldHandlerContext = {
      operator: condition.operator,
      value: condition.value,
      adapterType,
      field: condition.field,
      modelName,
      params: condition.customHandlerParams
    };

    if (handler.validate) {
      const validation = handler.validate(context);
      if (!validation.valid) {
        errors.push({
          path,
          code: "CUSTOM_VALIDATION_FAILED",
          message: validation.reason ?? "Custom handler validation failed"
        });
        return null;
      }
    }

    try {
      const built = handler.buildCondition(context);
      if (built.rawSQL && !this.accessService.canUseRawSQL(user)) {
        errors.push({
          path: `${path}.rawSQL`,
          code: "RAW_SQL_FORBIDDEN",
          message: "Raw SQL conditions are only allowed for administrators"
        });
        return null;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push({
        path,
        code: "CUSTOM_HANDLER_ERROR",
        message
      });
      return null;
    }

    warnings.push(
      `Custom handler "${handlerId}" validated at ${path}`
    );

    return condition;
  }

  private validateRelationCondition(
    condition: FilterCondition,
    fields: Fields,
    errors: ValidationError[],
    path: string
  ): FilterCondition | null {
    const relationName = String(condition.relation ?? "").trim();
    const relationField = String(condition.relationField ?? "").trim();

    if (!relationName || !relationField) {
      errors.push({
        path: `${path}.relation`,
        code: "INVALID_RELATION",
        message: "Relation and relationField are required"
      });
      return null;
    }

    const relation = fields[relationName];
    if (!relation) {
      errors.push({
        path: `${path}.relation`,
        code: "INVALID_RELATION",
        message: `Relation "${relationName}" does not exist`
      });
      return null;
    }

    const relationType = this.resolveFieldType(relation);
    if (relationType !== "association" && relationType !== "association-many") {
      errors.push({
        path: `${path}.relation`,
        code: "INVALID_RELATION",
        message: `Field "${relationName}" is not an association`
      });
      return null;
    }

    const relatedField = relation.populated?.[relationField];
    if (!relatedField) {
      errors.push({
        path: `${path}.relationField`,
        code: "INVALID_RELATION_FIELD",
        message: `Relation field "${relationField}" does not exist`
      });
      return null;
    }

    const fieldType = this.normalizeFieldType(this.resolveFieldType(relatedField));
    const operatorError = this.validateOperator(condition.operator, fieldType);
    if (operatorError) {
      errors.push({
        path: `${path}.operator`,
        code: "INVALID_OPERATOR",
        message: operatorError
      });
      return null;
    }

    const sanitizedValue = this.sanitizeValue(condition.value, condition.operator, fieldType);
    const valueError = this.validateValue(sanitizedValue, condition.operator, fieldType);
    if (valueError) {
      errors.push({
        path: `${path}.value`,
        code: "INVALID_VALUE",
        message: valueError
      });
      return null;
    }

    return {
      ...condition,
      value: sanitizedValue
    };
  }

  private validateFieldCondition(
    condition: FilterCondition,
    fields: Fields,
    errors: ValidationError[],
    path: string
  ): FilterCondition | null {
    const fieldName = String(condition.field ?? "").trim();
    if (!fieldName) {
      errors.push({
        path: `${path}.field`,
        code: "MISSING_FIELD",
        message: "Field is required"
      });
      return null;
    }

    const field = fields[fieldName];
    if (!field) {
      errors.push({
        path: `${path}.field`,
        code: "INVALID_FIELD",
        message: `Field "${fieldName}" does not exist`
      });
      return null;
    }

    const fieldType = this.normalizeFieldType(this.resolveFieldType(field));
    const operatorError = this.validateOperator(condition.operator, fieldType);
    if (operatorError) {
      errors.push({
        path: `${path}.operator`,
        code: "INVALID_OPERATOR",
        message: operatorError
      });
      return null;
    }

    const sanitizedValue = this.sanitizeValue(condition.value, condition.operator, fieldType);
    const valueError = this.validateValue(sanitizedValue, condition.operator, fieldType);
    if (valueError) {
      errors.push({
        path: `${path}.value`,
        code: "INVALID_VALUE",
        message: valueError
      });
      return null;
    }

    return {
      ...condition,
      field: fieldName,
      value: sanitizedValue
    };
  }

  private resolveFieldType(field?: Field): string | undefined {
    if (!field) {
      return undefined;
    }
    const modelType = field.model?.type;
    if (modelType) {
      return String(modelType);
    }
    const configType = field.config && typeof field.config === "object" ? field.config.type : undefined;
    return configType ? String(configType) : undefined;
  }

  private normalizeFieldType(type?: string): string {
    if (!type) {
      return "default";
    }

    const normalized = type.toLowerCase();
    if (["int", "integer", "float", "decimal", "number", "bigint"].includes(normalized)) {
      return "number";
    }
    if (["bool", "boolean", "binary"].includes(normalized)) {
      return "boolean";
    }
    if (["datetime-local", "datetime"].includes(normalized)) {
      return "datetime";
    }
    if (["date", "timestamp"].includes(normalized)) {
      return "date";
    }
    if (["time"].includes(normalized)) {
      return "time";
    }
    if (["association", "association-many"].includes(normalized)) {
      return "uuid";
    }
    if (["object", "json", "jsonb"].includes(normalized)) {
      return "json";
    }
    if (["text", "longtext", "mediumtext", "string", "password", "email", "color", "month", "week", "range", "enum", "uuid", "array"].includes(normalized)) {
      return "string";
    }

    return normalized;
  }

  private validateOperator(operator: FilterOperator, fieldType: string): string | null {
    const allowed = OPERATORS_BY_TYPE[fieldType] ?? OPERATORS_BY_TYPE.default;
    if (!allowed.includes(operator)) {
      return `Operator "${operator}" is not valid for field type "${fieldType}"`;
    }
    return null;
  }

  private validateValue(
    value: unknown,
    operator: FilterOperator,
    _fieldType: string
  ): string | null {
    if (operator === "isNull" || operator === "isNotNull") {
      return null;
    }

    if (value === undefined || value === null) {
      return "Value is required for this operator";
    }

    if (operator === "between") {
      if (!Array.isArray(value) || value.length !== 2) {
        return "Between operator requires an array of two values";
      }
    }

    if (operator === "in" || operator === "notIn") {
      if (!Array.isArray(value)) {
        return "IN operator requires an array of values";
      }
    }

    return null;
  }

  private sanitizeValue(
    value: unknown,
    operator: FilterOperator,
    fieldType: string
  ): unknown {
    if (operator === "isNull" || operator === "isNotNull") {
      return null;
    }

    if (operator === "between") {
      if (!Array.isArray(value)) {
        return value;
      }
      const pair = value.slice(0, 2).map((item) =>
        this.sanitizePrimitive(item, fieldType)
      );
      return pair;
    }

    if (operator === "in" || operator === "notIn") {
      const list = Array.isArray(value)
        ? value
        : typeof value === "string"
          ? value
              .split(",")
              .map((item) => item.trim())
              .filter((item) => item.length > 0)
          : [value];
      return list.map((item) => this.sanitizePrimitive(item, fieldType));
    }

    return this.sanitizePrimitive(value, fieldType);
  }

  private sanitizePrimitive(value: unknown, fieldType: string): unknown {
    if (value === undefined || value === null) {
      return value;
    }

    if (fieldType === "boolean") {
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

    if (fieldType === "number") {
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

    if (typeof value === "string") {
      return value.trim();
    }

    return value;
  }
}
