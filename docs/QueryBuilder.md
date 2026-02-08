# Query Builder

## Overview

`ModernQueryBuilder` replaces the legacy NodeTable pipeline and provides a Promise-based, ORM-friendly way to build list queries with filters, sorting, and pagination.

NodeTable is no longer part of the codebase. Use `ModernQueryBuilder` for list queries.

## Usage

```typescript
import { ModernQueryBuilder } from "adminizer";

const queryBuilder = new ModernQueryBuilder(entity.model, fields, dataAccessor);

const result = await queryBuilder.execute({
  page: 1,
  limit: 25,
  sort: "createdAt",
  sortDirection: "DESC",
  globalSearch: "alice",
  filters: [
    { id: "1", field: "status", operator: "eq", value: "active" }
  ]
});
```

## Query Parameters

`QueryParams` supports:

- `page` and `limit` for pagination (required)
- `sort` and `sortDirection` for ordering (optional)
- `filters` for structured conditions (optional)
- `globalSearch` for legacy-compatible search behavior (optional)
- `fields` to limit which columns participate in global search (optional)

## List Controller Query Params

The list controller still accepts query string parameters used by the current UI:

- `page`: 1-based page number
- `count`: page size
- `column`: 1-based column index for sorting
- `direction`: `asc` or `desc`
- `globalSearch`: legacy global search input
- `searchColumn`: repeated param with column indices for per-column search
- `searchColumnValue`: repeated param with search values, aligned with `searchColumn`
- `filter` or `filterSlug`: apply a saved filter by slug when filters are enabled
- `filterId`: apply a saved filter by id when filters are enabled

These are mapped to `QueryParams` before calling `ModernQueryBuilder.execute()`.

## Filter Slug Usage

If `filterId`, `filter`, or `filterSlug` is provided and filters are enabled for the model, the list controller loads the filter and executes the query builder with:

- Saved filter conditions
- Optional per-column filters (legacy search inputs)
- Optional `globalSearch` when legacy search is enabled

The list response also includes UI flags:

- `filtersEnabled`: whether filters are enabled for this model
- `useLegacySearch`: whether the model forces legacy search
- `appliedFilter`: the slug or id of the applied filter (if any)

## Filter Builder UI

The frontend filter UI lives in `src/assets/js/components/filter-builder.tsx`. It manages `FilterCondition[]` state, supports nested AND/OR/NOT groups, and automatically constrains operators based on the selected field type.

Basic usage:

```tsx
import { FilterBuilder, type FilterCondition, type FilterField, type FilterRelation } from "@/components/filter-builder";

const fields: FilterField[] = [
  { name: "name", label: "Name", type: "string" },
  { name: "age", label: "Age", type: "number" },
  { name: "isActive", label: "Active", type: "boolean" }
];

const relations: FilterRelation[] = [
  {
    name: "company",
    label: "Company",
    fields: [
      { name: "title", label: "Title", type: "string" },
      { name: "country", label: "Country", type: "string" }
    ]
  }
];

export function FilterBuilderExample() {
  const handleChange = (conditions: FilterCondition[]) => {
    // Persist to FilterAP.conditions or send to preview endpoint
  };

  return (
    <FilterBuilder
      fields={fields}
      relations={relations}
      onChange={handleChange}
      maxDepth={3}
    />
  );
}
```

Value conventions:

- `between` uses a two-item array: `["from", "to"]`.
- `in` and `notIn` use arrays (comma-separated input in the UI).
- `isNull` and `isNotNull` ignore the value input.
- Relation conditions set `relation` and `relationField` instead of `field`.

The output shape matches the `FilterCondition` interface used by `FilterAP` and `ModernQueryBuilder`.

## Supported Operators

`FilterCondition.operator` supports:

- `eq`, `neq`, `gt`, `gte`, `lt`, `lte`
- `like`, `ilike`, `startsWith`, `endsWith`
- `in`, `notIn`, `between`
- `isNull`, `isNotNull`
- `regex`

Notes:

- `ilike` and `regex` are mapped to Sequelize operators when using the Sequelize adapter.
- For other adapters, these operators fall back to `contains`.

## Validation

`ModernQueryBuilder` ignores invalid filter conditions:

- Unknown fields are skipped.
- Operators require compatible values (for example, `between` needs a two-item array).
- Invalid nested groups are removed if they contain no valid children.

## Security Limits

`ModernQueryBuilder` applies additional guardrails to reduce abusive or malformed filter payloads:

- Maximum nesting depth for groups (default: 5).
- Maximum number of conditions processed per request (default: 100).
- Maximum string length for values (default: 256).
- Maximum array length for `in`/`notIn` values (default: 50).
- Maximum regex length (default: 256).

Conditions exceeding these limits are ignored, and a warning is logged via `Adminizer.log`.

## Result Shape

`execute()` returns:

- `data`: mapped rows (display modifiers and associations applied)
- `total`: total records count (no filters)
- `filtered`: records count after filters
- `page`, `limit`, `pages`

## Association Filters

`FilterCondition` can include `relation` and `relationField` to target associated data. Relation filters are applied for Sequelize models. Other adapters ignore relation conditions for now.

## Custom Field Handlers

Use `CustomFieldHandler` to define model-specific filters for complex fields (JSON paths, computed values, external data).

Each handler receives a context object and returns one of:

- `criteria`: Waterline-style criteria object (used by all adapters).
- `rawSQL`: raw SQL fragment with placeholders (Sequelize only).
- `inMemory`: predicate for in-memory filtering (used for Waterline or as a fallback).

If a handler returns only `inMemory`, `ModernQueryBuilder` evaluates the full filter tree in memory and fetches all records before paging.

### Registering a Handler

```typescript
import { CustomFieldHandler } from "adminizer";

CustomFieldHandler.register("Order.phone", {
  name: "Order phone",
  operators: ["eq", "like"],
  buildCondition: ({ operator, value, adapterType }) => {
    const searchValue = String(value ?? "");

    if (adapterType === "sequelize") {
      if (operator === "like") {
        return {
          rawSQL: "phone->>'number' LIKE ?",
          rawSQLParams: [`%${searchValue}%`]
        };
      }
      return {
        rawSQL: "phone->>'number' = ?",
        rawSQLParams: [searchValue]
      };
    }

    return {
      inMemory: (record) =>
        typeof record.phone === "object" &&
        typeof record.phone.number === "string" &&
        record.phone.number.includes(searchValue)
    };
  }
});
```

### Raw SQL Placeholders

`rawSQL` supports `?` or `$1`/`$2` placeholders. Parameters are escaped by the Sequelize adapter before interpolation. For non-Sequelize adapters, `rawSQL` is ignored unless an `inMemory` predicate is provided.
