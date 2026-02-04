# Filters

The Adminizer filter system provides advanced data filtering capabilities with a modern, flexible architecture. It allows users to create, save, and manage complex filter conditions for any model in the system.

## Overview

The filter system consists of several key components:

- **Filter Models**: `FilterAP` and `FilterColumnAP` for storing filter configurations
- **Query Builder**: `ModernQueryBuilder` for building database queries from filter conditions
- **UI Components**: React components for building and managing filters
- **API Endpoints**: RESTful API for filter CRUD operations
- **Access Control**: User-owned filters with group sharing capabilities

## Data Model

### FilterAP Model

The main filter model stores filter configurations:

```typescript
interface FilterAPAttributes {
  id: string;                      // UUID
  name: string;                    // Filter name
  description?: string;            // Optional description
  modelName: string;               // Target model name
  slug: string;                    // Unique slug for URL/API
  conditions: FilterCondition[];   // Filter conditions
  sortField?: string;              // Sort field
  sortDirection?: 'ASC' | 'DESC';  // Sort direction
  visibility: 'private' | 'public' | 'groups' | 'system';
  owner: number;                   // Owner user ID
  groupIds?: number[];             // Shared group IDs
  isSystemFilter?: boolean;        // System filter flag
  apiEnabled: boolean;             // API access enabled
  apiKey?: string;                 // API key for public access
  icon?: string;                   // UI icon
  color?: string;                  // UI color
  isPinned?: boolean;              // Pinned in UI
  version: number;                 // Filter format version
  schemaVersion?: string;          // Schema version
  createdAt: Date;
  updatedAt: Date;
}
```

### FilterCondition Structure

Filter conditions support complex nested logic:

```typescript
interface FilterCondition {
  id: string;                      // UUID
  field: string;                   // Field name
  operator: FilterOperator;        // Comparison operator
  value: any;                      // Filter value
  logic?: 'AND' | 'OR' | 'NOT';    // Logical operator for groups
  children?: FilterCondition[];    // Nested conditions
  relation?: string;               // Relation name for joins
  relationField?: string;          // Field in related model
  customHandler?: string;          // Custom field handler ID
  customHandlerParams?: any;       // Handler parameters
  rawSQL?: string;                 // Raw SQL condition
  rawSQLParams?: any[];            // SQL parameters
}
```

### Supported Operators

The system supports comprehensive filtering operators:

- `eq` - Equal to
- `neq` - Not equal to
- `gt` - Greater than
- `gte` - Greater than or equal
- `lt` - Less than
- `lte` - Less than or equal
- `like` - LIKE pattern matching
- `ilike` - Case-insensitive LIKE
- `startsWith` - Starts with pattern
- `endsWith` - Ends with pattern
- `in` - In array
- `notIn` - Not in array
- `between` - Between range
- `isNull` - Is null
- `isNotNull` - Is not null
- `regex` - Regular expression
- `custom` - Custom handler

## Query Building

The `ModernQueryBuilder` class transforms filter conditions into database queries:

```typescript
class ModernQueryBuilder {
  buildWhere(conditions: FilterCondition[]): WhereClause {
    // Builds WHERE clause from conditions
  }

  buildConditionGroup(conditions: FilterCondition[]): ConditionGroup {
    // Handles AND/OR/NOT logic
  }

  buildSingleCondition(condition: FilterCondition): SingleCondition {
    // Maps operators to database queries
  }
}
```

### Custom Field Handlers

For complex field types, custom handlers can be registered:

```typescript
interface CustomFieldHandler {
  buildCondition(operator: FilterOperator, value: any, params?: any): WhereClause;
  validate(operator: FilterOperator, value: any): boolean;
}
```

## UI Components

### FilterBuilder Component

React component for building filter conditions:

```tsx
<FilterBuilder
  conditions={conditions}
  onChange={setConditions}
  modelName="UserAP"
  availableFields={fields}
/>
```

### FilterDialog Component

Modal dialog for filter management:

```tsx
<FilterDialog
  filter={currentFilter}
  onSave={handleSave}
  onDelete={handleDelete}
/>
```

### Column Customization

Users can customize table columns:

```tsx
<ColumnSelector
  columns={availableColumns}
  selectedColumns={selectedColumns}
  onChange={setSelectedColumns}
/>
```

## API Endpoints

### Filter CRUD Operations

```
GET    /api/filters              # List filters
POST   /api/filters              # Create filter
GET    /api/filters/:id          # Get filter
PUT    /api/filters/:id          # Update filter
DELETE /api/filters/:id          # Delete filter
GET    /api/filters/:slug/apply  # Apply filter to data
```

### Public API Access

Filters can be accessed via public API with API keys:

```
GET /api/public/filters/:apiKey/data?model=UserAP
```

## Access Control

Filters implement user-owned records pattern:

- **Private**: Only owner can access
- **Public**: Anyone can view (read-only)
- **Groups**: Shared with specific user groups
- **System**: Built-in system filters

All filter operations go through `DataAccessor` with `userAccessRelation: 'owner'`.

## Integration with Data Accessor

Filters integrate with the existing data access layer:

```typescript
const dataAccessor = new DataAccessor(modelName, user);
const filteredData = await dataAccessor.find({
  where: queryBuilder.buildWhere(filter.conditions),
  sort: filter.sortField ? [[filter.sortField, filter.sortDirection]] : undefined
});
```

## Advanced Features

### Inline Editing

Edit data directly in table cells:

```tsx
<InlineEdit
  record={record}
  field={field}
  onSave={handleSave}
/>
```

### Batch Editing

Edit multiple records simultaneously:

```tsx
<BatchEdit
  selectedRecords={selected}
  fields={editableFields}
  onSave={handleBatchSave}
/>
```

### Export Formats

Export filtered data in various formats:

- CSV
- JSON
- XML
- Excel

### Notifications

Get notified about filter changes and data updates.

### Quick Links

Save filter states as quick-access links.

### Dashboard Widgets

Display filter results in dashboard widgets.

### Custom Conditions

Create custom filter conditions with dynamic parameters.

## Configuration

Enable filters in adminpanel configuration:

```javascript
module.exports.adminpanel = {
  filters: {
    enabled: true,
    models: {
      UserAP: {
        filtersEnabled: true,
        inlineEditing: true,
        batchEditing: true
      }
    }
  }
}
```

## Security Considerations

- SQL injection prevention through parameterized queries
- Field access control validation
- User ownership enforcement
- API key authentication for public access
- Input validation and sanitization

## Performance

The filter system is optimized for performance:

- Efficient query building
- Database index utilization
- Pagination support
- Caching for frequently used filters
- Background processing for heavy operations

## Migration from Legacy

The system replaces the old NodeTable implementation with modern architecture while maintaining backward compatibility through feature flags.

See [Migration Guide](migration.md) for details on upgrading from legacy filtering.