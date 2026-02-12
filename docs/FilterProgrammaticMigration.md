# Programmatic Filters Migration Guide

This guide describes how to migrate custom programmatic filter code to the current Phase 11 API.

## Target API

Use the typed builder + runtime API stack:
- `CriteriaBuilder`
- `FilterBuilder`
- `FilterRegistry`
- `FilterPresets`
- `FilterMigration`
- `FilterProgrammaticApi`

## 1) Migrate raw condition objects to `CriteriaBuilder`

Before:

```ts
const conditions = [
  { id: "1", field: "status", operator: "eq", value: "active", logic: "AND" }
];
```

After:

```ts
import { CriteriaBuilder } from "adminizer";

const conditions = new CriteriaBuilder()
  .where("status", "active")
  .build();
```

## 2) Migrate plain draft objects to `FilterBuilder`

Before:

```ts
const draft = {
  name: "Active users",
  modelName: "User",
  conditions
};
```

After:

```ts
import { FilterBuilder } from "adminizer";

const draft = FilterBuilder.create("Active users", "User")
  .withConditions(conditions)
  .withVisibility("private")
  .build();
```

## 3) Replace custom preset maps with `FilterRegistry` or `FilterPresets`

If your project has hand-written preset maps, move them to:
- `FilterRegistry` for key->factory registration;
- `FilterPresets` for reusable named presets plus defaults.

## 4) Add explicit version upgrades through `FilterMigration`

Use versioned migration steps:

```ts
import { FilterMigration } from "adminizer";

const migration = new FilterMigration();
migration.register(1, (draft) => ({
  ...draft,
  selectedFields: draft.selectedFields ?? ["id", "name"]
}));

const v2Draft = migration.migrate(v1Draft, 1, 2);
```

## 5) Use `FilterProgrammaticApi` for repository CRUD and hooks

```ts
import { FilterProgrammaticApi } from "adminizer";

const api = new FilterProgrammaticApi(filterRepository, user);
api.on("beforeCreate", async ({ data }) => {
  // custom validation
});

const created = await api.create(v2Draft);
await api.update(String(created.id), { name: "Active users v2" });
await api.delete(String(created.id));
```

## Validation Checklist

- Run `npm run build` to verify backend/ui TypeScript compilation.
- Run `npm test` to validate unit + integration suites.
- Run `npm run docs:typedoc` to regenerate API docs for filter builder.
