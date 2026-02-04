import {ControllerHelper} from "../helpers/controllerHelper";
import {DataAccessor} from "../lib/DataAccessor";
import {ModernQueryBuilder, QueryParams, QueryResult} from "../lib/query-builder/ModernQueryBuilder";
import {Adminizer} from "../lib/Adminizer";
import {inertiaListHelper} from "../helpers/inertiaListHelper";
import {Field, Fields} from "../helpers/fieldsHelper";
import {BaseFieldConfig} from "../interfaces/adminpanelConfig";
import {FilterCondition, FilterAP} from "../models/FilterAP";
import {FilterColumnAP} from "../models/FilterColumnAP";
import {FilterService} from "../lib/filters/FilterService";

export default async function list(req: ReqType, res: ResType) {
    let entity = ControllerHelper.findEntityObject(req);
    if (!entity.model) {
        return res.status(404).send({error: 'Not Found'});
    }

    if (req.adminizer.config.auth.enable) {
        if (!req.user) {
            return res.redirect(`${req.adminizer.config.routePrefix}/model/userap/login`);
        } else if (!req.adminizer.accessRightsHelper.hasPermission(`read-${entity.name}-model`, req.user)) {
            return res.sendStatus(403);
        }
    }

    let dataAccessor = new DataAccessor(req.adminizer, req.user, entity, "list");
    let fields = dataAccessor.getFieldsConfig();
    const header = inertiaListHelper(entity, req, fields);

    // Parse pagination
    const page = req.query.page ? parseInt(req.query.page.toString(), 10) : 1;
    const limit = req.query.count ? parseInt(req.query.count.toString(), 10) : 5;

    // Parse sorting
    const orderColumn = req.query.column ? req.query.column.toString() : undefined;
    const direction = req.query.direction === "asc" ? 'ASC' : 'DESC';

    // Convert column index to field name
    const sortField = orderColumn ? getFieldNameByIndex(fields, parseInt(orderColumn, 10)) : undefined;

    // Parse global search
    const globalSearch = req.query.globalSearch ? req.query.globalSearch.toString() : "";

    // Check for saved filter (filterId parameter)
    const filterId = req.query.filterId ? req.query.filterId.toString() : undefined;
    let savedFilter: FilterAP | null = null;
    let savedColumns: FilterColumnAP[] = [];
    let filterError: string | null = null;

    if (filterId) {
        try {
            const filterService = new FilterService(req.adminizer);
            const result = await filterService.getFilterWithColumns(filterId, req.user);
            savedFilter = result.filter;
            savedColumns = result.columns;

            if (!savedFilter) {
                filterError = 'Filter not found or access denied';
            }
        } catch (err) {
            Adminizer.log.error('Error loading filter:', err);
            filterError = 'Error loading filter';
        }
    }

    // Parse column-specific search
    const searchColumns = req.query.searchColumn
        ? Array.isArray(req.query.searchColumn)
            ? req.query.searchColumn.map(String)
            : [req.query.searchColumn.toString()]
        : [];

    const searchColumnValues = req.query.searchColumnValue
        ? Array.isArray(req.query.searchColumnValue)
            ? req.query.searchColumnValue.map(String)
            : [req.query.searchColumnValue.toString()]
        : [];

    // Collect {column, value} pairs, removing duplicate columns
    const searchMap = new Map<string, string>();
    for (let i = 0; i < searchColumns.length; i++) {
        const column = searchColumns[i];
        const value = searchColumnValues[i] || "";
        searchMap.set(column, value);
    }

    const searchPairs = Array.from(searchMap.entries()).map(([column, value]) => ({
        column,
        value,
    }));

    // Build filter conditions
    let filters: FilterCondition[] = [];

    // If saved filter, use its conditions
    if (savedFilter && savedFilter.conditions) {
        filters = [...savedFilter.conditions];
    }

    // Add column search conditions on top
    const searchFilters = buildFiltersFromSearchPairs(fields, searchPairs);
    filters = [...filters, ...searchFilters];

    // Apply custom columns if filter has them
    let displayFields = fields;
    let customColumnsConfig: FilterColumnAP[] | null = null;

    if (savedColumns.length > 0) {
        customColumnsConfig = savedColumns;
        // Filter and reorder fields based on custom column configuration
        displayFields = applyCustomColumns(fields, savedColumns);
    }

    // Prepare columns for frontend
    const columns = setColumns(displayFields, orderColumn, direction.toLowerCase() as 'asc' | 'desc', searchPairs, req);

    // Determine sort field - prefer URL param, then filter setting
    let effectiveSortField = sortField;
    let effectiveSortDirection: 'ASC' | 'DESC' = direction;

    if (!effectiveSortField && savedFilter?.sortField) {
        effectiveSortField = savedFilter.sortField;
        effectiveSortDirection = savedFilter.sortDirection || 'DESC';
    }

    // Build query parameters
    const queryParams: QueryParams = {
        page,
        limit,
        sort: effectiveSortField,
        sortDirection: effectiveSortDirection,
        filters,
        globalSearch: globalSearch || undefined
    };

    // Execute query using ModernQueryBuilder (use original fields for query, displayFields for output)
    const queryBuilder = new ModernQueryBuilder(entity.model, fields, dataAccessor);

    try {
        const result = await queryBuilder.execute(queryParams);

        // Build active filter info for frontend
        const activeFilter = savedFilter ? {
            id: savedFilter.id,
            name: savedFilter.name,
            slug: savedFilter.slug,
            description: savedFilter.description,
            icon: savedFilter.icon,
            color: savedFilter.color
        } : null;

        return req.Inertia.render({
            component: 'list',
            props: {
                header: header,
                columns: columns,
                data: {
                    data: result.data,
                    recordsTotal: result.total,
                    recordsFiltered: result.filtered,
                    page: result.page,
                    pages: result.pages
                },
                activeFilter: activeFilter,
                filterError: filterError,
                customColumns: customColumnsConfig
            }
        });
    } catch (err) {
        Adminizer.log.error(err);
        return req.Inertia.render({
            component: 'list',
            props: {
                header: header,
                columns: columns,
                data: {
                    data: [],
                    recordsTotal: 0,
                    recordsFiltered: 0,
                    page: 1,
                    pages: 0
                },
                activeFilter: null,
                filterError: filterError || 'Query execution error',
                customColumns: null
            }
        });
    }
}

/**
 * Apply custom column configuration to fields
 * Returns fields filtered and ordered according to saved column config
 */
function applyCustomColumns(fields: Fields, columns: FilterColumnAP[]): Fields {
    // Sort columns by order
    const sortedColumns = [...columns].sort((a, b) => (a.order || 0) - (b.order || 0));

    // Only include visible columns that exist in fields
    const visibleColumns = sortedColumns.filter(col => col.isVisible && fields[col.fieldName]);

    // If no visible columns configured, return original fields
    if (visibleColumns.length === 0) {
        return fields;
    }

    // Build new fields object with custom order
    const result: Fields = {};

    for (const col of visibleColumns) {
        const field = fields[col.fieldName];
        if (field) {
            result[col.fieldName] = {
                ...field,
                // Add custom column properties
                customWidth: col.width,
                isEditable: col.isEditable
            } as Field;
        }
    }

    return result;
}

/**
 * Get field name by column index
 */
function getFieldNameByIndex(fields: Fields, index: number): string | undefined {
    const fieldNames = Object.keys(fields);
    // Index 0 is usually actions column, so actual fields start from index 1
    const fieldIndex = index - 1;
    return fieldIndex >= 0 && fieldIndex < fieldNames.length ? fieldNames[fieldIndex] : undefined;
}

/**
 * Build FilterCondition[] from search pairs
 */
function buildFiltersFromSearchPairs(
    fields: Fields,
    searchPairs: Array<{ column: string; value: string }>
): FilterCondition[] {
    const filters: FilterCondition[] = [];
    const fieldNames = Object.keys(fields);

    for (const pair of searchPairs) {
        if (!pair.value || pair.value.trim() === '') {
            continue;
        }

        const fieldIndex = parseInt(pair.column, 10) - 1; // Column index starts from 1
        if (fieldIndex < 0 || fieldIndex >= fieldNames.length) {
            continue;
        }

        const fieldName = fieldNames[fieldIndex];
        const field = fields[fieldName];
        const fieldType = field.model?.type as string | undefined;

        // Determine operator based on field type
        let operator: FilterCondition['operator'] = 'like';
        let value: any = pair.value;

        if (fieldType === 'number' || (fieldType as any) === 'integer' || (fieldType as any) === 'float') {
            const numValue = parseFloat(pair.value);
            if (!isNaN(numValue)) {
                operator = 'eq';
                value = numValue;
            } else {
                continue; // Skip invalid number
            }
        } else if (fieldType === 'boolean') {
            const lowerValue = pair.value.toLowerCase();
            if (lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes') {
                value = true;
            } else if (lowerValue === 'false' || lowerValue === '0' || lowerValue === 'no') {
                value = false;
            } else {
                continue; // Skip invalid boolean
            }
            operator = 'eq';
        } else if ((fieldType as any) === 'date' || (fieldType as any) === 'datetime') {
            // For dates, use exact match or range
            operator = 'eq';
        }

        filters.push({
            id: `search-${fieldName}-${Date.now()}`,
            field: fieldName,
            operator,
            value
        });
    }

    return filters;
}

/**
 * Set columns configuration for frontend
 */
function setColumns(
    fields: Fields,
    orderColumn: string | undefined,
    direction: 'asc' | 'desc',
    searchPairs: Array<{ column: string; value: string }>,
    req: ReqType
): Record<string, object> {
    const columns: Record<string, object> = {};
    let i = 1;

    for (const key of Object.keys(fields)) {
        const field = fields[key] as Field;

        // Check if this field has search value
        const searchForThisColumn = searchPairs.find(pair => pair.column === String(i));
        const searchValue = searchForThisColumn ? searchForThisColumn.value : "";

        columns[key] = {
            ...field.config as BaseFieldConfig,
            title: req.i18n.__((field.config as BaseFieldConfig).title),
            data: String(i),
            direction: String(i) === orderColumn ? direction : undefined,
            searchColumnValue: searchValue || undefined,
        };

        i++;
    }

    return columns;
}
