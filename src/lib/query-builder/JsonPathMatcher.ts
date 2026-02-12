import type { FilterOperator } from "../../models/FilterAP";
import type { CustomFieldHandlerDefinition } from "./CustomFieldHandler";
import { CustomConditionRegistry } from "./CustomConditionRegistry";

export type JsonPathMatcherOptions = {
  handlerId: string;
  jsonColumn: string;
  jsonPath: string | string[];
  name?: string;
  description?: string;
  maxStringLength?: number;
};

const DEFAULT_MAX_STRING_LENGTH = 512;
const SUPPORTED_OPERATORS: FilterOperator[] = ["eq", "neq", "like", "ilike", "isNull", "isNotNull"];

/**
 * Build a JSON-path custom handler definition with SQL and in-memory fallback.
 */
export function createJsonPathMatcher(options: JsonPathMatcherOptions): CustomFieldHandlerDefinition {
  const normalizedColumn = normalizeIdentifier(options.jsonColumn);
  const segments = normalizeJsonPath(options.jsonPath);
  const maxLength = options.maxStringLength ?? DEFAULT_MAX_STRING_LENGTH;

  return {
    name: options.name ?? `${options.handlerId}-json-path`,
    description: options.description ?? `JSON path matcher for ${normalizedColumn}.${segments.join(".")}`,
    operators: SUPPORTED_OPERATORS,
    validate: ({ operator, value }) => {
      if (!SUPPORTED_OPERATORS.includes(operator)) {
        return { valid: false, reason: `Unsupported operator "${operator}" for JSON path matcher` };
      }

      if (operator === "isNull" || operator === "isNotNull") {
        return { valid: true };
      }

      if (typeof value === "string" && value.length > maxLength) {
        return { valid: false, reason: `JSON path value exceeds max length ${maxLength}` };
      }

      if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
        return { valid: false, reason: "JSON path value must be string, number, or boolean" };
      }

      return { valid: true };
    },
    buildCondition: ({ adapterType, operator, value }) => {
      const valueAsString = value === null || value === undefined ? "" : String(value);
      const inMemory = (record: Record<string, unknown>): boolean => {
        const nestedValue = getJsonPathValue(record[normalizedColumn], segments);
        const nestedAsString = nestedValue === null || nestedValue === undefined ? "" : String(nestedValue);

        switch (operator) {
          case "eq":
            return nestedAsString === valueAsString;
          case "neq":
            return nestedAsString !== valueAsString;
          case "like":
            return nestedAsString.includes(valueAsString);
          case "ilike":
            return nestedAsString.toLowerCase().includes(valueAsString.toLowerCase());
          case "isNull":
            return nestedValue === null || nestedValue === undefined;
          case "isNotNull":
            return nestedValue !== null && nestedValue !== undefined;
          default:
            return false;
        }
      };

      if (adapterType === "sequelize") {
        const pathSql = buildPostgresJsonPathSql(normalizedColumn, segments);
        return buildSqlCondition(pathSql, operator, valueAsString, inMemory);
      }

      if (adapterType === "mysql") {
        const pathSql = buildMysqlJsonPathSql(normalizedColumn, segments);
        return buildSqlCondition(pathSql, operator, valueAsString, inMemory);
      }

      return { inMemory };
    }
  };
}

/**
 * Register a JSON-path custom handler in the global custom condition registry.
 */
export function registerJsonPathMatcher(options: JsonPathMatcherOptions): void {
  const registry = new CustomConditionRegistry();
  registry.register(options.handlerId, createJsonPathMatcher(options));
}

function buildSqlCondition(
  pathSql: string,
  operator: FilterOperator,
  value: string,
  inMemory: (record: Record<string, unknown>) => boolean
) {
  switch (operator) {
    case "eq":
      return { rawSQL: `${pathSql} = ?`, rawSQLParams: [value], inMemory };
    case "neq":
      return { rawSQL: `${pathSql} <> ?`, rawSQLParams: [value], inMemory };
    case "like":
      return { rawSQL: `${pathSql} LIKE ?`, rawSQLParams: [`%${value}%`], inMemory };
    case "ilike":
      return { rawSQL: `LOWER(${pathSql}) LIKE LOWER(?)`, rawSQLParams: [`%${value}%`], inMemory };
    case "isNull":
      return { rawSQL: `${pathSql} IS NULL`, rawSQLParams: [], inMemory };
    case "isNotNull":
      return { rawSQL: `${pathSql} IS NOT NULL`, rawSQLParams: [], inMemory };
    default:
      return { inMemory };
  }
}

function buildPostgresJsonPathSql(column: string, segments: string[]): string {
  const escapedSegments = segments.map((segment) => segment.replace(/'/g, "''")).join(",");
  return `${column}#>>'{${escapedSegments}}'`;
}

function buildMysqlJsonPathSql(column: string, segments: string[]): string {
  const path = segments.join(".");
  return `JSON_UNQUOTE(JSON_EXTRACT(${column}, '$.${path}'))`;
}

function normalizeIdentifier(identifier: string): string {
  const normalized = String(identifier ?? "").trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(normalized)) {
    throw new Error(`Invalid json column identifier "${identifier}"`);
  }
  return normalized;
}

function normalizeJsonPath(path: string | string[]): string[] {
  const segments = Array.isArray(path)
    ? path.map((segment) => String(segment))
    : String(path ?? "")
        .split(".")
        .filter(Boolean);

  if (segments.length === 0) {
    throw new Error("JSON path must contain at least one segment");
  }

  for (const segment of segments) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(segment)) {
      throw new Error(`Invalid JSON path segment "${segment}"`);
    }
  }

  return segments;
}

function getJsonPathValue(source: unknown, segments: string[]): unknown {
  let current: unknown = source;

  for (const segment of segments) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}
