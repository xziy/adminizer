import type { FilterOperator } from "../../models/FilterAP";
import type { CustomFieldHandlerDefinition } from "./CustomFieldHandler";
import { CustomConditionRegistry } from "./CustomConditionRegistry";

export type FullTextMatcherOptions = {
  handlerId: string;
  fields: string[];
  name?: string;
  description?: string;
  maxQueryLength?: number;
  postgresLanguage?: string;
  mysqlBooleanMode?: boolean;
};

const DEFAULT_MAX_QUERY_LENGTH = 256;
const DEFAULT_POSTGRES_LANGUAGE = "simple";
const SUPPORTED_OPERATORS: FilterOperator[] = ["eq", "like", "ilike"];

/**
 * Build a full-text custom handler definition with SQL and in-memory fallback.
 */
export function createFullTextMatcher(options: FullTextMatcherOptions): CustomFieldHandlerDefinition {
  const normalizedFields = normalizeFields(options.fields);
  const maxQueryLength = options.maxQueryLength ?? DEFAULT_MAX_QUERY_LENGTH;
  const postgresLanguage = normalizeLanguage(options.postgresLanguage ?? DEFAULT_POSTGRES_LANGUAGE);
  const mysqlMode = options.mysqlBooleanMode ? "IN BOOLEAN MODE" : "IN NATURAL LANGUAGE MODE";

  return {
    name: options.name ?? `${options.handlerId}-full-text`,
    description:
      options.description ?? `Full-text matcher for ${normalizedFields.join(", ")}`,
    operators: SUPPORTED_OPERATORS,
    validate: ({ operator, value }) => {
      if (!SUPPORTED_OPERATORS.includes(operator)) {
        return { valid: false, reason: `Unsupported operator "${operator}" for full-text matcher` };
      }

      if (typeof value !== "string") {
        return { valid: false, reason: "Full-text query must be a string" };
      }

      const query = value.trim();
      if (!query) {
        return { valid: false, reason: "Full-text query cannot be empty" };
      }

      if (query.length > maxQueryLength) {
        return { valid: false, reason: `Full-text query exceeds max length ${maxQueryLength}` };
      }

      return { valid: true };
    },
    buildCondition: ({ adapterType, operator, value }) => {
      const query = String(value ?? "").trim();
      const inMemory = (record: Record<string, unknown>): boolean => {
        const haystack = normalizedFields
          .map((field) => {
            const raw = record[field];
            return raw === null || raw === undefined ? "" : String(raw);
          })
          .join(" ");

        if (operator === "like") {
          return haystack.includes(query);
        }
        return haystack.toLowerCase().includes(query.toLowerCase());
      };

      if (adapterType === "sequelize") {
        return buildPostgresCondition(normalizedFields, postgresLanguage, operator, query, inMemory);
      }

      if (adapterType === "mysql") {
        return buildMysqlCondition(normalizedFields, mysqlMode, operator, query, inMemory);
      }

      return { inMemory };
    }
  };
}

/**
 * Register a full-text custom handler in the global custom condition registry.
 */
export function registerFullTextMatcher(options: FullTextMatcherOptions): void {
  const registry = new CustomConditionRegistry();
  registry.register(options.handlerId, createFullTextMatcher(options));
}

function buildPostgresCondition(
  fields: string[],
  language: string,
  operator: FilterOperator,
  query: string,
  inMemory: (record: Record<string, unknown>) => boolean
) {
  const vectorExpression = fields.map((field) => `COALESCE(${field}, '')`).join(" || ' ' || ");
  if (operator === "eq") {
    return {
      rawSQL: `to_tsvector('${language}', ${vectorExpression}) @@ plainto_tsquery('${language}', ?)`,
      rawSQLParams: [query],
      inMemory
    };
  }

  if (operator === "like") {
    return {
      rawSQL: `${vectorExpression} LIKE ?`,
      rawSQLParams: [`%${query}%`],
      inMemory
    };
  }

  return {
    rawSQL: `LOWER(${vectorExpression}) LIKE LOWER(?)`,
    rawSQLParams: [`%${query}%`],
    inMemory
  };
}

function buildMysqlCondition(
  fields: string[],
  mysqlMode: string,
  operator: FilterOperator,
  query: string,
  inMemory: (record: Record<string, unknown>) => boolean
) {
  const matchExpression = `MATCH (${fields.join(", ")}) AGAINST (? ${mysqlMode})`;
  const concatExpression = `CONCAT_WS(' ', ${fields.join(", ")})`;

  if (operator === "eq") {
    return {
      rawSQL: matchExpression,
      rawSQLParams: [query],
      inMemory
    };
  }

  if (operator === "like") {
    return {
      rawSQL: `${concatExpression} LIKE ?`,
      rawSQLParams: [`%${query}%`],
      inMemory
    };
  }

  return {
    rawSQL: `LOWER(${concatExpression}) LIKE LOWER(?)`,
    rawSQLParams: [`%${query}%`],
    inMemory
  };
}

function normalizeFields(fields: string[]): string[] {
  if (!Array.isArray(fields) || fields.length === 0) {
    throw new Error("FullTextMatcher requires at least one field");
  }

  return fields.map((field) => normalizeIdentifier(field));
}

function normalizeIdentifier(identifier: string): string {
  const normalized = String(identifier ?? "").trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(normalized)) {
    throw new Error(`Invalid full-text field identifier "${identifier}"`);
  }
  return normalized;
}

function normalizeLanguage(language: string): string {
  const normalized = String(language ?? "").trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(normalized)) {
    throw new Error(`Invalid postgres language "${language}"`);
  }
  return normalized;
}
