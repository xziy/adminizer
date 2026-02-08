# Public API

Adminizer exposes a token-based public API for accessing filter results in JSON or feed formats.

## Overview

- Each user can have a single API token stored on `UserAP`.
- A valid token is required for every public API request.
- Filters must be marked as `apiEnabled: true`.
- Access rights are enforced using Access Rights Tokens.
- Public API requests are rate-limited per token (or per IP when no token is provided).

## Token Endpoints

All token endpoints are under the Adminizer route prefix (default `/adminizer`).

- `GET /adminizer/api/user/api-token`
- `POST /adminizer/api/user/api-token`
- `POST /adminizer/api/user/api-token/regenerate`
- `DELETE /adminizer/api/user/api-token`

Responses return:

```json
{
  "success": true,
  "token": "ap_xxxxxxxxx",
  "createdAt": "2026-02-08T12:00:00.000Z"
}
```

## Public Data Endpoints

Fetch results of a filter using its `id`, `slug`, or `apiKey`:

- `GET /adminizer/api/public/json/:filterId?token=...`
- `GET /adminizer/api/public/atom/:filterId?token=...`
- `GET /adminizer/api/public/rss/:filterId?token=...`

Optional query params:

- `page` (default `1`)
- `limit` (default `50`, max `500`, feeds capped at `100`)
- `sort` (field name)
- `direction` (`asc` or `desc`)
- `globalSearch` (string)

JSON response:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "total": 0,
    "filtered": 0,
    "page": 1,
    "limit": 50,
    "pages": 1,
    "filter": {
      "id": "uuid",
      "name": "My Filter",
      "slug": "my-filter"
    }
  }
}
```

## Access Rights Tokens

Token operations:

- `api-token-create`
- `api-token-view`
- `api-token-revoke`

Public API access:

- `api-public-access`

Export permissions:

- `export-json` for JSON
- `export-feed` for Atom/RSS

## Rate Limiting

Public API requests are limited to 120 requests per minute by default. The limiter keys by token if provided, otherwise by IP. Exceeding the limit returns `429` with a `Retry-After` header.

## CORS

Public API uses the standard CORS middleware. To enable cross-origin requests:

```ts
cors: {
  enabled: true,
  origin: "http://localhost:8080",
  path: "api/*"
}
```
