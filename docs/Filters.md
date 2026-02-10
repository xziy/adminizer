# Saved Filters API

## Overview

Adminizer supports saving reusable filters for list views. Filters are stored in `FilterAP` and executed by `ModernQueryBuilder`.

Key capabilities:
- Preview conditions without saving.
- Create, update, delete saved filters.
- Count endpoint for dashboard widgets.
- Direct link endpoint that redirects to the list view with the filter applied.

## Implementation Principles

- Add a short comment (1-2 lines) above each meaningful block of code and text explaining what the block does and why it exists
- Keep controllers thin: accept the request, call the service, return the response
- Centralize all filter logic (parsing, normalization, condition building, sorting) in a single filter service used by controllers
- Do not bloat the codebase: extract repeated logic into helpers/services and avoid creating new helpers unless necessary
- During review, verify filter logic is not duplicated, controllers are not growing, and the shared filter service is used

## Filter Service

Filter parsing, normalization, and legacy condition building are centralized in `src/lib/filters/services/FilterService.ts`. Controllers and export flows should rely on this service instead of duplicating filter logic.
When importing from the package root, use `FilterParsingService` to access this parser (the legacy `FilterService` name is reserved for the adminizer helper).

## Endpoints

### GET `/adminizer/filters`
List filters accessible to the current user.

Query parameters:
- `modelName` (string, optional): filter by model name.
- `page` (number, optional, default `1`).
- `limit` (number, optional, default `50`, max `100`).
- `pinned` (boolean, optional): only pinned filters.
- `includeSystem` (boolean, optional): include system filters in the list.

Response:
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "name": "Active Users", "modelName": "UserAP" }
  ],
  "meta": { "total": 12, "page": 1, "limit": 50, "pages": 1 }
}
```

### GET `/adminizer/filters/:id`
Fetch a single filter by id.

### POST `/adminizer/filters/:id/validate`
Validate a saved filter against the current schema and format.

Response includes a validation summary:
```json
{
  "success": true,
  "data": { "id": "uuid", "name": "Active Users", "modelName": "UserAP" },
  "validation": {
    "valid": true,
    "errors": [],
    "warnings": [],
    "needsMigration": false,
    "version": 1
  }
}
```

### POST `/adminizer/filters/:id/migrate`
Attempt to migrate a filter to the latest format. Requires edit access.

If no migration is needed, the response returns `migrated: false` with the current filter.

### POST `/adminizer/filters/preview`
Execute conditions without saving a filter.

Body:
```json
{
  "modelName": "UserAP",
  "conditions": [
    { "id": "1", "field": "status", "operator": "eq", "value": "active" }
  ],
  "page": 1,
  "limit": 25,
  "sort": "createdAt",
  "sortDirection": "DESC"
}
```

Response:
```json
{
  "success": true,
  "data": [{ "id": 1, "status": "active" }],
  "meta": { "total": 120, "filtered": 1, "page": 1, "pages": 1, "limit": 25 }
}
```

### POST `/adminizer/filters`
Create a new filter.

Body (minimal):
```json
{
  "name": "Active Users",
  "modelName": "UserAP",
  "conditions": [
    { "id": "1", "field": "status", "operator": "eq", "value": "active" }
  ]
}
```

### PATCH `/adminizer/filters/:id`
Update an existing filter. You can update `conditions`, `sortField`, `visibility`, `groupIds`, `columns`, etc.

#### Selected Fields Payload
To reduce the data fetched for a filter, pass `selectedFields` with a list of field keys:

```json
{
  "selectedFields": ["id", "name", "email"]
}
```

When `selectedFields` is provided, the list view and filter execution will only fetch those fields (the primary key is always included). If omitted or empty, the full model fields are used.

#### Columns Payload
To store a column layout with a filter, pass a `columns` array when creating or updating:

```json
{
  "columns": [
    { "fieldName": "name", "order": 0, "isVisible": true, "isEditable": false },
    { "fieldName": "status", "order": 1, "isVisible": true, "isEditable": true },
    { "fieldName": "createdAt", "order": 2, "isVisible": false }
  ]
}
```

Each column item supports:
- `fieldName` (string, required)
- `order` (number, optional)
- `isVisible` (boolean, optional, default `true`)
- `isEditable` (boolean, optional, default `false`)
- `width` (number, optional)

### DELETE `/adminizer/filters/:id`
Delete a filter.

### GET `/adminizer/filters/:id/count`
Return the number of records that match the filter (useful for widgets).

If the saved filter no longer matches the current schema, the endpoint returns `400` with a validation payload.

### GET `/adminizer/filter/:id`
Direct link to a filter. Redirects to the list page with `filterId` applied.

### Quick Links API (Phase 9 - partial)
Use these endpoints to pin saved filters into Navigation quick links.

- `GET /adminizer/filters/quick-links?sectionId=<section>`: list quick links for a navigation section.
- `POST /adminizer/filters/:id/quick-links`: add a filter as a quick link. Optional body: `sectionId`, `customName`, `icon`.
- `DELETE /adminizer/filters/:id/quick-links?sectionId=<section>`: remove the quick link for a filter.

The generated URL targets list pages in the format `/adminizer/model/:modelName?filterSlug=<slug>` and falls back to `filterId` when slug is not available.

## System Filters

Set `isSystemFilter: true` to hide a filter from default lists. Use `includeSystem=true` to fetch them via API. System filters can still be accessed by id or used in widgets.

## Filters Disabled

If filters are disabled globally or for a model, endpoints return `403` with `filtersEnabled: false`. See `docs/Configuration/FilterDisableConfiguration.md` for details.

## Rate Limits

Default per-user limits:
- Preview: 30 requests per minute.
- Create: 10 requests per minute.
- Count: 60 requests per minute.

## Format Versioning

Filters store a `version` field. When the format changes, the API can warn about outdated versions and migrate deprecated operators automatically.

## Column Customization

When a saved filter is applied to a list view, column configuration from `FilterColumnAP` is used to reorder and hide columns. If a filter has no column config (or all columns are hidden), the default list configuration is used.

The list toolbar shows a **Columns** action when a saved filter is applied. Use it to reorder, toggle visibility, and save the layout back to the filter.

Column width values are optional and stored in pixels. When set, the list view clamps widths to a 80-600px range and applies them to the table. Leave the width empty to use the default layout.

## Inline Editing in List Views

Column layouts can also control inline editing. Set `isEditable: true` in the filter columns payload to enable inline editing for that field in the list view. Inline editing will only be available when the model field itself is marked `inlineEditable: true` in the model configuration.

Inline edits are sent to `PATCH /adminizer/model/:modelName/:id/field/:fieldName` and validated using the field `inlineEditConfig`. If a field is not available in the edit configuration for the model, inline updates are rejected.

### Batch Inline Updates

Send multiple inline edits in one request:

```
PATCH /adminizer/model/:modelName/batch
```

Body:
```json
{
  "updates": [
    { "id": 1, "fieldName": "status", "value": "active" },
    { "id": 2, "fieldName": "isActive", "value": false }
  ]
}
```

Response:
```json
{
  "success": false,
  "results": [
    { "id": 1, "fieldName": "status", "value": "active" }
  ],
  "errors": [
    { "id": 2, "fieldName": "isActive", "error": "Field is not editable inline", "status": 403 }
  ]
}
```

## List UI Migration Alert

When a list view is opened with a saved filter applied, the UI will call the validate endpoint and surface warnings or errors. If migration is possible, it offers an "Auto-migrate" action that calls `POST /adminizer/filters/:id/migrate`.
