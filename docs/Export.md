# Data Export

Adminizer can export list results into JSON, CSV, and Excel files. Exports respect access rights and the same filter logic used in list views.

## Endpoints

`GET /adminizer/export/formats`
Returns available formats.

`POST /adminizer/export`
Creates an export file and returns a download URL.

Request body:
- `format` (required): `json`, `csv`, `xlsx`
- `modelName` (required if no filter): model key from admin config
- `filterId` or `filterSlug` (optional): export a saved filter
- `columns` (optional): array or comma-separated list of field keys
- `includeHeaders` (optional, default `true`): include header row (CSV/Excel)
- `delimiter` (optional, default `,`): CSV delimiter
- `encoding` (optional, default `utf-8`): CSV encoding
- `sheetName` (optional, default `Export`): Excel sheet name
- `autoFilter` (optional, default `true`): Excel auto-filter
- `freezeHeaders` (optional, default `true`): Excel freeze header row
- `limit` (optional): max rows to export
- `chunkSize` (optional): fetch chunk size when streaming
- `background` (optional): enqueue export job (returns job status)

Query parameters (legacy search, same as list view):
- `column`, `direction`
- `globalSearch`
- `searchColumn`, `searchColumnValue`

Response:
- `success`
- `downloadUrl`
- `fileName`
- `rowCount`

`GET /adminizer/export/filter/:id/:format`
Shortcut to export a saved filter by ID and format.

`GET /adminizer/export/download/:filename`
Downloads a previously generated export file.

## Behavior

- Applies filter conditions and column visibility/order if a filter is provided.
- Exports only fields visible to the current user.
- Uses list display modifiers and association display fields for values.
- Writes files to `exports/` under the project root.

## Permissions

When auth is enabled, exports require access rights tokens:

- `export-json` for `json` and `csv`
- `export-excel` for `xlsx`

## UI

The list view shows an export format selector and button. It uses the current list query string (sorting, legacy search, and filter parameters) to build the export request.
