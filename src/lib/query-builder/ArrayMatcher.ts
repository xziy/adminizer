import type { FilterOperator } from "../../models/FilterAP";
import type { CustomFieldHandlerDefinition } from "./CustomFieldHandler";
import { CustomConditionRegistry } from "./CustomConditionRegistry";

export type ArrayMatcherMode = "contains" | "overlaps" | "containsAll";

export type ArrayMatcherOptions = {
  handlerId: string;
  fieldName: string;
  mode: ArrayMatcherMode;
  name?: string;
  description?: string;
  maxValues?: number;
};

const SUPPORTED_OPERATORS: FilterOperator[] = ["eq"];
const DEFAULT_MAX_VALUES = 100;

/**
 * Build an array matcher definition for contains/overlaps/contains-all modes.
 */
export function createArrayMatcher(options: ArrayMatcherOptions): CustomFieldHandlerDefinition {
  const fieldName = normalizeIdentifier(options.fieldName);
  const maxValues = options.maxValues ?? DEFAULT_MAX_VALUES;

  return {
    name: options.name ?? `${options.handlerId}-array-${options.mode}`,
    description: options.description ?? `Array matcher (${options.mode}) for ${fieldName}`,
    operators: SUPPORTED_OPERATORS,
    validate: ({ operator, value }) => {
      if (!SUPPORTED_OPERATORS.includes(operator)) {
        return { valid: false, reason: `Unsupported operator "${operator}" for array matcher` };
      }
      const parsed = parsePayload(options.mode, value, maxValues);
      if (!parsed.valid) {
        return parsed;
      }
      return { valid: true };
    },
    buildCondition: ({ adapterType, value }) => {
      const parsed = parsePayload(options.mode, value, maxValues);
      if (!parsed.valid) {
        return { inMemory: () => false };
      }

      const values = parsed.values;
      const inMemory = (record: Record<string, unknown>): boolean => {
        const source = normalizeRecordArray(record[fieldName]);
        if (!source) {
          return false;
        }
        return evaluateArrayMode(source, values, options.mode);
      };

      if (adapterType === "waterline") {
        if (options.mode === "contains") {
          return {
            criteria: {
              [fieldName]: { contains: values[0] }
            },
            inMemory
          };
        }

        const predicates = values.map((item) => ({ [fieldName]: { contains: item } }));
        if (options.mode === "overlaps") {
          return { criteria: { or: predicates }, inMemory };
        }
        return { criteria: { and: predicates }, inMemory };
      }

      return { inMemory };
    }
  };
}

/**
 * Register a contains matcher in the global custom condition registry.
 */
export function registerArrayContainsMatcher(options: Omit<ArrayMatcherOptions, "mode">): void {
  const registry = new CustomConditionRegistry();
  registry.register(options.handlerId, createArrayMatcher({ ...options, mode: "contains" }));
}

/**
 * Register an overlaps matcher in the global custom condition registry.
 */
export function registerArrayOverlapsMatcher(options: Omit<ArrayMatcherOptions, "mode">): void {
  const registry = new CustomConditionRegistry();
  registry.register(options.handlerId, createArrayMatcher({ ...options, mode: "overlaps" }));
}

/**
 * Register a contains-all matcher in the global custom condition registry.
 */
export function registerArrayContainsAllMatcher(options: Omit<ArrayMatcherOptions, "mode">): void {
  const registry = new CustomConditionRegistry();
  registry.register(options.handlerId, createArrayMatcher({ ...options, mode: "containsAll" }));
}

function parsePayload(
  mode: ArrayMatcherMode,
  value: unknown,
  maxValues: number
): { valid: true; values: unknown[] } | { valid: false; reason: string } {
  const payload = value as Record<string, unknown>;

  if (mode === "contains") {
    if (!Object.prototype.hasOwnProperty.call(payload ?? {}, "value")) {
      return { valid: false, reason: "Array contains requires payload.value" };
    }
    return { valid: true, values: [payload.value] };
  }

  const values = Array.isArray(payload?.values) ? payload.values : null;
  if (!values || values.length === 0) {
    return { valid: false, reason: `${mode} requires a non-empty payload.values array` };
  }
  if (values.length > maxValues) {
    return { valid: false, reason: `${mode} values exceeds max limit ${maxValues}` };
  }

  return { valid: true, values };
}

function normalizeIdentifier(identifier: string): string {
  const normalized = String(identifier ?? "").trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(normalized)) {
    throw new Error(`Invalid array field identifier "${identifier}"`);
  }
  return normalized;
}

function normalizeRecordArray(value: unknown): unknown[] | null {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

function evaluateArrayMode(source: unknown[], values: unknown[], mode: ArrayMatcherMode): boolean {
  if (mode === "contains") {
    return source.some((item) => compareValues(item, values[0]));
  }
  if (mode === "overlaps") {
    return values.some((value) => source.some((item) => compareValues(item, value)));
  }
  return values.every((value) => source.some((item) => compareValues(item, value)));
}

function compareValues(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
