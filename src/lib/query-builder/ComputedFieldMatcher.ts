import type { FilterOperator } from "../../models/FilterAP";
import type { CustomFieldHandlerDefinition } from "./CustomFieldHandler";
import { CustomConditionRegistry } from "./CustomConditionRegistry";

export type ComparisonOperator = "=" | "==" | "!=" | ">" | ">=" | "<" | "<=";

export type ComputedFieldMatcherOptions = {
  handlerId: string;
  computedField: string;
  compute: (record: Record<string, unknown>) => unknown;
  allowedOperators?: ComparisonOperator[];
  name?: string;
  description?: string;
};

const DEFAULT_ALLOWED_OPERATORS: ComparisonOperator[] = ["=", "!=", ">", ">=", "<", "<="];
const SUPPORTED_FILTER_OPERATORS: FilterOperator[] = ["eq"];

/**
 * Build a computed-field matcher definition with in-memory filtering.
 */
export function createComputedFieldMatcher(
  options: ComputedFieldMatcherOptions
): CustomFieldHandlerDefinition {
  const computedField = normalizeIdentifier(options.computedField);
  const allowedOperators = normalizeAllowedOperators(options.allowedOperators ?? DEFAULT_ALLOWED_OPERATORS);

  return {
    name: options.name ?? `${options.handlerId}-computed`,
    description:
      options.description ?? `Computed field matcher for ${computedField}`,
    operators: SUPPORTED_FILTER_OPERATORS,
    validate: ({ operator, value }) => {
      if (!SUPPORTED_FILTER_OPERATORS.includes(operator)) {
        return { valid: false, reason: `Unsupported operator "${operator}" for computed field matcher` };
      }

      const parsed = parseComputedPayload(value);
      if (!parsed.valid) {
        return parsed;
      }
      if (!allowedOperators.includes(parsed.value.operator)) {
        return { valid: false, reason: `Comparison operator "${parsed.value.operator}" is not allowed` };
      }

      return { valid: true };
    },
    buildCondition: ({ value }) => {
      const parsed = parseComputedPayload(value);
      if (!parsed.valid) {
        return { inMemory: () => false };
      }

      const { operator: comparisonOperator, targetValue } = parsed.value;
      const inMemory = (record: Record<string, unknown>): boolean => {
        const computedValue = options.compute(record);
        return compareValues(computedValue, comparisonOperator, targetValue);
      };

      return { inMemory };
    }
  };
}

/**
 * Register a computed-field matcher in the global custom condition registry.
 */
export function registerComputedFieldMatcher(options: ComputedFieldMatcherOptions): void {
  const registry = new CustomConditionRegistry();
  registry.register(options.handlerId, createComputedFieldMatcher(options));
}

/**
 * Utility for post-processing arrays by computed values.
 */
export function filterByComputedField(
  records: Record<string, unknown>[],
  compute: (record: Record<string, unknown>) => unknown,
  operator: ComparisonOperator,
  targetValue: unknown
): Record<string, unknown>[] {
  return records.filter((record) => compareValues(compute(record), operator, targetValue));
}

function parseComputedPayload(
  value: unknown
): { valid: true; value: { operator: ComparisonOperator; targetValue: unknown } } | { valid: false; reason: string } {
  const payload = value as Record<string, unknown>;
  const operator = payload?.operator;

  if (typeof operator !== "string" || !isComparisonOperator(operator)) {
    return { valid: false, reason: "computed payload requires a valid comparison operator" };
  }
  if (!Object.prototype.hasOwnProperty.call(payload ?? {}, "targetValue")) {
    return { valid: false, reason: "computed payload requires targetValue" };
  }

  return {
    valid: true,
    value: {
      operator,
      targetValue: payload.targetValue
    }
  };
}

function compareValues(left: unknown, operator: ComparisonOperator, right: unknown): boolean {
  switch (operator) {
    case "=":
    case "==":
      return left === right;
    case "!=":
      return left !== right;
    case ">":
      return Number(left) > Number(right);
    case ">=":
      return Number(left) >= Number(right);
    case "<":
      return Number(left) < Number(right);
    case "<=":
      return Number(left) <= Number(right);
    default:
      return false;
  }
}

function normalizeIdentifier(identifier: string): string {
  const normalized = String(identifier ?? "").trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(normalized)) {
    throw new Error(`Invalid computed field identifier "${identifier}"`);
  }
  return normalized;
}

function normalizeAllowedOperators(operators: ComparisonOperator[]): ComparisonOperator[] {
  const normalized = Array.from(new Set(operators));
  if (normalized.length === 0) {
    throw new Error("ComputedFieldMatcher requires at least one comparison operator");
  }
  return normalized;
}

function isComparisonOperator(value: string): value is ComparisonOperator {
  return value === "=" || value === "==" || value === "!=" || value === ">" || value === ">=" || value === "<" || value === "<=";
}
