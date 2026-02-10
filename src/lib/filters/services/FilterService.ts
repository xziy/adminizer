import type { FilterAP, FilterCondition } from "../../../models/FilterAP";
import type { Fields } from "../../../helpers/fieldsHelper";
import type { QuerySortDirection } from "../../query-builder/ModernQueryBuilder";

type SearchPair = { column: string; value: string };

// Centralize parsing, normalization, and legacy filter construction.
export class FilterService {
  // Normalize various query values into a single trimmed string or undefined.
  // This keeps all query parsing rules in one place for controllers and services.
  getQueryStringValue(value: unknown): string | undefined {
    if (Array.isArray(value)) {
      const found = value.map(String).find((item) => item.trim().length > 0);
      return found ? found.trim() : undefined;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }
    if (value === undefined || value === null) {
      return undefined;
    }
    const stringValue = String(value).trim();
    return stringValue.length > 0 ? stringValue : undefined;
  }

  // Parse numeric pagination params with defaults and optional upper bounds.
  // This prevents invalid values from leaking into query building.
  normalizePositiveInt(value: unknown, fallback: number, max?: number): number {
    if (value === undefined || value === null) {
      return fallback;
    }
    const parsed = typeof value === "number" ? value : parseInt(String(value), 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return fallback;
    }
    const normalized = Math.floor(parsed);
    if (max !== undefined) {
      return Math.min(normalized, max);
    }
    return normalized;
  }

  // Convert common boolean-ish values into a boolean or undefined.
  // This standardizes flag handling across controllers.
  parseBoolean(value: unknown): boolean | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value === "boolean") {
      return value;
    }
    const normalized = String(value).trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
    return undefined;
  }

  // Normalize sort directions into the query-builder format.
  // This keeps sorting logic centralized for all filter consumers.
  normalizeSortDirection(direction?: string): QuerySortDirection | undefined {
    if (!direction) {
      return undefined;
    }
    return direction.toUpperCase() === "ASC" ? "ASC" : "DESC";
  }

  // Resolve a sort field from either a column index or a field key.
  // This enables both legacy and modern column sort formats.
  resolveSortField(
    orderColumn: string | undefined,
    fieldKeys: string[],
    fields: Fields
  ): string | undefined {
    if (!orderColumn) {
      return undefined;
    }
    if (fields?.[orderColumn]) {
      return orderColumn;
    }
    const parsed = parseInt(orderColumn, 10);
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= fieldKeys.length) {
      return fieldKeys[parsed - 1];
    }
    return undefined;
  }

  // Build search pairs with last-write-wins for duplicate columns.
  // This matches the historical behavior of list filters.
  buildSearchPairs(searchColumns: string[], searchColumnValues: string[]): SearchPair[] {
    const searchMap = new Map<string, string>();
    for (let i = 0; i < searchColumns.length; i++) {
      const column = searchColumns[i];
      const value = searchColumnValues[i] || "";
      searchMap.set(column, value);
    }
    return Array.from(searchMap.entries()).map(([column, value]) => ({ column, value }));
  }

  // Build legacy column filters from {column, value} pairs.
  // This keeps legacy filtering consistent across list and export flows.
  buildLegacyColumnFilters(fields: Fields, searchPairs: SearchPair[]): FilterCondition[] {
    if (!searchPairs.length) {
      return [];
    }

    const filters: FilterCondition[] = [];
    const fieldKeys = Object.keys(fields ?? {});

    searchPairs.forEach((pair, index) => {
      const rawValue = pair.value?.trim();
      if (!rawValue) {
        return;
      }

      const fieldKey = this.resolveSortField(pair.column, fieldKeys, fields);
      if (!fieldKey) {
        return;
      }

      const field = fields[fieldKey];
      if (!field || !field.model?.type) {
        return;
      }

      const fieldType = field.model.type;
      let operator: FilterCondition["operator"] | null = null;
      let value: unknown = rawValue;

      if (fieldType === "boolean") {
        const lower = rawValue.toLowerCase();
        if (lower !== "true" && lower !== "false") {
          return;
        }
        operator = "eq";
        value = lower === "true";
      } else if (fieldType === "number") {
        if (rawValue.startsWith(">") || rawValue.startsWith("<")) {
          const parsed = parseFloat(rawValue.slice(1));
          if (Number.isNaN(parsed)) {
            return;
          }
          operator = rawValue.startsWith(">") ? "gte" : "lte";
          value = parsed;
        } else {
          const parsed = parseFloat(rawValue);
          if (Number.isNaN(parsed)) {
            return;
          }
          operator = "eq";
          value = parsed;
        }
      } else if (fieldType === "string") {
        operator = "like";
        value = rawValue;
      } else {
        return;
      }

      filters.push({
        id: `column-${fieldKey}-${index}`,
        field: fieldKey,
        operator,
        value
      });
    });

    return filters;
  }

  // Build a normalized set of model identifiers used for filter validation.
  // This avoids repeating lowercase normalization across callers.
  buildTargetNameSet(values: Array<string | undefined | null>): Set<string> {
    const targetNames = new Set<string>();
    values.forEach((value) => {
      const normalized = String(value ?? "").trim();
      if (!normalized) {
        return;
      }
      targetNames.add(normalized.toLowerCase());
    });
    return targetNames;
  }

  // Validate that a filter targets the same model as the current context.
  // This protects against using a filter with a mismatched model.
  assertFilterMatchesModel(
    filter: Partial<FilterAP>,
    targetNames: Set<string>,
    targetLabel: string
  ): void {
    const filterModelName = String(filter.modelName ?? "").toLowerCase();
    if (!filterModelName) {
      return;
    }

    if (targetNames.size === 0 || targetNames.has(filterModelName)) {
      return;
    }

    throw new Error(
      `Filter "${filter.name ?? filter.id}" is configured for model "${filter.modelName}", not "${targetLabel}"`
    );
  }
}
