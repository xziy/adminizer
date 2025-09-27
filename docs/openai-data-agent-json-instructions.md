# OpenAI Data Agent JSON Instructions

The fixture registers a single AI assistant model that proxies all read/write requests through `DataAccessor`. Every interaction must be expressed as JSON so the agent can safely execute the request with the currently authenticated user's permissions.

## Query records

Use the `query_model_records` tool whenever the assistant needs to read data. Provide the model name and, optionally, filters, field projections, and a limit.

```json
{
  "action": "query",
  "tool": "query_model_records",
  "args": {
    "model": "Example",
    "filter": { "title": { "contains": "demo" } },
    "fields": ["id", "title", "ownerId"],
    "limit": 5
  }
}
```

The agent will call `DataAccessor` with the authenticated user, ensuring that only permitted rows and fields are returned.

## Create records

To create a record, call the `mutate_model_records` tool with the `create` action and a JSON payload that contains only the fields that should be written.

```json
{
  "action": "mutate",
  "tool": "mutate_model_records",
  "args": {
    "action": "create",
    "model": "Test",
    "data": {
      "title": "Created from AI",
      "sort": true
    }
  }
}
```

The tool filters the payload against the user's writable fields before calling `model.create()`.

## Update or delete records

When editing or deleting data, include either an `id` or a full `criteria` object to select the target record.

```json
{
  "action": "mutate",
  "tool": "mutate_model_records",
  "args": {
    "action": "update",
    "model": "Example",
    "id": 42,
    "data": {
      "title": "Updated by AI"
    }
  }
}
```

```json
{
  "action": "mutate",
  "tool": "mutate_model_records",
  "args": {
    "action": "delete",
    "model": "Example",
    "criteria": { "title": "Deprecated" }
  }
}
```

The helper automatically merges `id` into the criteria and rejects empty selectors so records cannot be modified accidentally.

## Permission handling

- **Read access** relies on `new DataAccessor(adminizer, user, entity, 'list')`.
- **Create access** uses `'add'`, **update access** uses `'edit'`, and **delete access** uses `'remove'`.
- If the current user is missing a permission, the tool throws an explicit error message instead of performing the operation.

This structure ensures the assistant can safely work with Adminizer data while respecting the authenticated user's capabilities.
