# Auto-Generate Filters

Adminizer can automatically generate basic filters for your models based on their field definitions. This feature saves time by creating commonly used filters without manual configuration.

## Configuration

Enable auto-generation for specific models in your `adminpanelConfig`:

```typescript
const config: AdminpanelConfig = {
  // ... other config
  
  filters: {
    enabled: true
  },
  
  modelFilters: {
    UserAP: {
      enabled: true,
      autoGenerateFilters: true,
      excludeFields: ['password', 'token'],
      autoFilterPrefix: 'Auto: '
    },
    OrderAP: {
      enabled: true,
      autoGenerateFilters: true,
      includeFields: ['status', 'createdAt', 'total'], // Whitelist mode
      autoFilterPrefix: ''
    }
  }
};
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autoGenerateFilters` | `boolean` | `false` | Enable auto-generation for this model |
| `excludeFields` | `string[]` | `[]` | Fields to exclude from auto-generated filters |
| `includeFields` | `string[]` | `undefined` | Whitelist of fields (takes priority over excludeFields) |
| `autoFilterPrefix` | `string` | `'Auto: '` | Prefix for auto-generated filter names |
| `showAutoFilters` | `boolean` | `true` | Whether to show auto-generated filters in UI |

## Default Excluded Fields

The following fields are excluded by default (sensitive data):
- `password`, `passwordHash`, `hash`, `salt`
- `apiKey`, `apiSecret`, `token`, `refreshToken`
- `secret`, `privateKey`, `encryptedPassword`

## Generated Filter Types

### "All" Filter
Always generated - shows all records without conditions.

### Boolean Fields
- `{Field} = Yes` - Records where field is true
- `{Field} = No` - Records where field is false

### Date/DateTime Fields
- `{Field} Today` - Records from today
- `{Field} This Week` - Records from current week
- `{Field} This Month` - Records from current month

### Number Fields
- `{Field} Empty` - Records where field is null
- `{Field} Has Value` - Records where field is not null

### String/Text Fields
- `{Field} Not Empty` - Records where field is not null/empty
- `{Field} Empty` - Records where field is null/empty

### Select Fields
- `{Field} Filter` - Template filter (user sets value)

## Automatic Generation

Filters are automatically generated when:
1. User first accesses the filters list for a model
2. `autoGenerateFilters` is enabled for that model
3. No auto-generated filters exist yet

## API Endpoints

### Generate Filters (Admin only)
```http
POST /adminizer/filters/generate
Content-Type: application/json

{
  "modelName": "UserAP",
  "force": false,
  "dryRun": false
}
```

**Parameters:**
- `modelName` (required) - Target model name
- `force` (optional) - Regenerate even if filters exist
- `dryRun` (optional) - Return definitions without saving

**Response:**
```json
{
  "success": true,
  "data": {
    "generated": [
      { "id": "uuid", "name": "Auto: All Users", "slug": "auto-all-users" }
    ],
    "skipped": ["Auto: Status = Active"],
    "errors": []
  },
  "meta": {
    "totalGenerated": 5,
    "totalSkipped": 1,
    "totalErrors": 0,
    "dryRun": false
  }
}
```

### Regenerate Filters (Admin only)
```http
POST /adminizer/filters/regenerate
Content-Type: application/json

{
  "modelName": "UserAP"
}
```

Deletes existing auto-generated filters and creates new ones.

### Delete Auto Filters (Admin only)
```http
DELETE /adminizer/filters/auto/:modelName
```

Removes all auto-generated filters for the specified model.

## Dynamic Date Values

Auto-generated date filters use special placeholders:

| Placeholder | Description |
|-------------|-------------|
| `$TODAY_START` | Start of current day (00:00:00) |
| `$TODAY_END` | End of current day (23:59:59) |
| `$WEEK_START` | Start of current week (Monday 00:00:00) |
| `$WEEK_END` | End of current week (Sunday 23:59:59) |
| `$MONTH_START` | Start of current month |
| `$MONTH_END` | End of current month |

These are resolved at query execution time, so filters always show current data.

## Example Configuration

```typescript
const config: AdminpanelConfig = {
  routePrefix: '/admin',
  filters: {
    enabled: true
  },
  modelFilters: {
    // Full auto-generation
    ProductAP: {
      enabled: true,
      autoGenerateFilters: true
    },
    
    // Selective fields only
    OrderAP: {
      enabled: true,
      autoGenerateFilters: true,
      includeFields: ['status', 'createdAt', 'total', 'isPaid'],
      autoFilterPrefix: ''
    },
    
    // Exclude sensitive fields
    UserAP: {
      enabled: true,
      autoGenerateFilters: true,
      excludeFields: ['password', 'apiKey', 'lastLoginIp']
    },
    
    // Disable for specific model
    AuditLogAP: {
      enabled: true,
      autoGenerateFilters: false
    }
  },
  models: {
    // ... model configurations
  }
};
```

## Filter Visibility

Auto-generated filters are created with:
- `visibility: 'system'` - Accessible to all authenticated users
- `isSystemFilter: true` - Marked as system filter

They appear in the filter list alongside user-created filters but cannot be edited by non-admin users.
