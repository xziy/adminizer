import {ControllerHelper} from "../helpers/controllerHelper";
import {DataAccessor} from "../lib/DataAccessor";
import {Adminizer} from "../lib/Adminizer";
import {inertiaListHelper} from "../helpers/inertiaListHelper";
import {Field, Fields} from "../helpers/fieldsHelper";
import {BaseFieldConfig} from "../interfaces/adminpanelConfig";
import {ModernQueryBuilder, QueryResult, QuerySortDirection} from "../lib/query-builder/ModernQueryBuilder";
import {FilterCondition} from "../models/FilterAP";
import type { FilterColumnAP } from "../models/FilterColumnAP";
import { AbstractModel } from "../lib/model/AbstractModel";

export default async function list(req: ReqType, res: ResType) {
    // Resolve the model entry and fail fast when it is missing.
    let entity = ControllerHelper.findEntityObject(req);
    if (!entity.model) {
        return res.status(404).send({error: 'Not Found'});
    }

    // Enforce authentication and model-level read permissions.
    if (req.adminizer.config.auth.enable) {
        if (!req.user) {
            return res.redirect(`${req.adminizer.config.routePrefix}/model/userap/login`);
        } else if (!req.adminizer.accessRightsHelper.hasPermission(`read-${entity.name}-model`, req.user)) {
            return res.sendStatus(403);
        }
    }

    // Build the base list context and configuration dependencies.
    let dataAccessor = new DataAccessor(req.adminizer, req.user, entity, "list");
    const baseFields = dataAccessor.getFieldsConfig();
    const header = inertiaListHelper(entity, req, baseFields)
    const filterModule = req.adminizer.filters;
    const filterConfig = filterModule.config;
    const filterService = filterModule.service;
    const filtersEnabled = filterConfig.isFiltersEnabledForModel(entity.name);
    const useLegacySearch = !filterConfig.isFiltersEnabled() || filterConfig.shouldUseLegacySearch(entity.name);
    const page = filterService.normalizePositiveInt(req.query.page, 1);
    const count = filterService.normalizePositiveInt(req.query.count, 5);

    // Normalize sort values for both UI and query-builder usage.
    const orderColumn = filterService.getQueryStringValue(req.query.column);
    const directionParam = filterService.getQueryStringValue(req.query.direction)?.toLowerCase();
    const direction = directionParam === "asc" ? "asc" : "desc";
    const sortDirection: QuerySortDirection | undefined =
        filterService.normalizeSortDirection(directionParam);

    // Read legacy search inputs to build column filters when required.
    const globalSearch = useLegacySearch && req.query.globalSearch ? req.query.globalSearch.toString() : "";

    const searchColumns = useLegacySearch && req.query.searchColumn
        ? Array.isArray(req.query.searchColumn)
            ? req.query.searchColumn.map(String)
            : [req.query.searchColumn.toString()]
        : [];

    const searchColumnValues = useLegacySearch && req.query.searchColumnValue
        ? Array.isArray(req.query.searchColumnValue)
            ? req.query.searchColumnValue.map(String)
            : [req.query.searchColumnValue.toString()]
        : [];

    // Build unique column/value pairs used by legacy filtering.
    const searchPairs = filterService.buildSearchPairs(searchColumns, searchColumnValues);

    // Create the base list context from the current UI parameters.
    const baseContext = buildListContext(
        baseFields,
        orderColumn,
        direction,
        searchPairs,
        req,
        entity,
        dataAccessor,
        useLegacySearch
    );
    let activeContext = baseContext;
    // Prepare UI options for column selection.
    const filterColumnFields = buildColumnFieldOptions(baseFields, req);
    let filterColumnsForUi: ColumnConfigPayload[] = [];
    let filterSelectedFields: string[] = [];
    const filterSlug = filterService.getQueryStringValue(req.query.filterSlug ?? req.query.filter);
    const filterId = filterService.getQueryStringValue(req.query.filterId);

    // Initialize the response payload to predictable defaults.
    let data: { data: Record<string, unknown>[]; recordsTotal: number; recordsFiltered: number } = {
        data: [],
        recordsTotal: 0,
        recordsFiltered: 0
    };
    let appliedFilter: string | undefined;
    let appliedFilterId: string | undefined;
    let appliedFilterName: string | undefined;
    let appliedFilterPinned = false;
    // Resolve the identifier field for list rendering.
    const identifierField =
        entity.config?.identifierField
        ?? req.adminizer.config.identifierField
        ?? entity.model.primaryKey
        ?? "id";
    try {
        let result: QueryResult<Record<string, unknown>> | undefined;

        // Warn and ignore filter requests when filters are disabled.
        if ((filterSlug || filterId) && !filtersEnabled) {
            const ignored = filterId ?? filterSlug ?? "";
            Adminizer.log.warn(`Filters disabled for model ${entity.name}, ignoring filter '${ignored}'`);
        }

        // Resolve, validate, and execute a saved filter when requested.
        if ((filterSlug || filterId) && filtersEnabled) {
            try {
                const filter = filterId
                    ? await filterModule.repository.findByIdAsAdmin(filterId)
                    : await filterModule.repository.findBySlugAsAdmin(filterSlug ?? "");

                if (!filter) {
                    throw new Error(`Filter "${filterId ?? filterSlug}" was not found`);
                }

                appliedFilterId = filter.id ? String(filter.id) : undefined;
                appliedFilterName = typeof filter.name === "string" ? filter.name : undefined;
                appliedFilterPinned = filter.isPinned === true;

                const targetNames = filterService.buildTargetNameSet([
                    dataAccessor?.entity?.name,
                    dataAccessor?.entity?.config?.model,
                    entity.model?.modelname,
                    entity.model?.identity
                ]);
                const targetLabel = resolveTargetLabel(dataAccessor, entity.model);
                filterService.assertFilterMatchesModel(filter, targetNames, targetLabel);
                filterModule.access.assertCanExecute(filter, req.user);
                const validation = filterModule.migration.validate(filter);
                if (!validation.valid) {
                    Adminizer.log.warn(
                        `Filter "${filterId ?? filterSlug}" failed validation: ${validation.errors.join("; ")}`
                    );
                    throw new Error(`Filter "${filterId ?? filterSlug}" is invalid`);
                }

    const filterColumns = filter.id
        ? await filterModule.repository.findColumns(String(filter.id))
        : [];
    const selectedFields = normalizeSelectedFields(filter.selectedFields);
    filterSelectedFields = selectedFields;
    const selectedFieldsForQuery = mergeSelectedFields(selectedFields, [
        identifierField,
        entity.model.primaryKey
    ]);
    const selectedFieldSelection = applySelectedFields(baseFields, selectedFields);
    const fieldsForColumns = selectedFieldSelection.applied
        ? selectedFieldSelection.fields
        : baseFields;
    const columnOverrides = buildColumnOverrides(filterColumns);
    const columnSelection = applyColumnSelection(fieldsForColumns, filterColumns);
    filterColumnsForUi = mapFilterColumns(filterColumns);
    const filterContext = columnSelection.applied
        ? buildListContext(
            columnSelection.fields,
            orderColumn,
            direction,
            searchPairs,
            req,
            entity,
            dataAccessor,
            useLegacySearch,
            columnOverrides
        )
        : buildListContext(
            fieldsForColumns,
            orderColumn,
            direction,
            searchPairs,
            req,
            entity,
            dataAccessor,
            useLegacySearch,
            columnOverrides
        );

    result = await filterModule.execution.executeFilter(
        filter,
        req.user,
        {
            page,
            limit: count,
            sort: filterContext.sortField,
            sortDirection,
            globalSearch: useLegacySearch ? globalSearch : undefined,
            extraFilters: filterContext.columnFilters,
            selectFields: selectedFieldsForQuery.length > 0 ? selectedFieldsForQuery : undefined
        }
    );
    appliedFilter = filterId ?? filterSlug;
    activeContext = filterContext;
            } catch (error) {
                Adminizer.log.error(error);
            }
        }

        // Fallback to base list execution when no filter was applied.
        if (!result) {
            result = await activeContext.queryBuilder.execute({
                page,
                limit: count,
                sort: activeContext.sortField,
                sortDirection,
                globalSearch: useLegacySearch ? globalSearch : undefined,
                filters: activeContext.columnFilters
            });
        }

        data = {
            data: result.data,
            recordsTotal: result.total,
            recordsFiltered: result.filtered
        };
    } catch (error) {
        Adminizer.log.error(error);
    }

    // Return the list view payload with filter metadata for the UI.
    return req.Inertia.render({
        component: 'list',
        props: {
            header: header,
            columns: activeContext.columns,
            data: data,
            identifierField: String(identifierField),
            filtersEnabled,
            useLegacySearch,
            appliedFilter,
            appliedFilterId,
            filterColumnFields,
            filterColumns: filterColumnsForUi,
            filterSelectedFields,
            appliedFilterName,
            appliedFilterPinned
        }
    });
}

// Build the column metadata map used by the list UI and legacy searches.
function setColumns(
    fields: Fields,
    orderColumn: string | undefined,
    direction: string,
    searchPairs: Array<{ column: string; value: string }>,
    req: ReqType,
    columnOverrides?: ColumnOverrides
) {
    // Translate field configs into UI-friendly column definitions.
    const columns: Record<string, object> = {};
    let i = 1;

    // Populate columns in field order while applying overrides.
    for (const key of Object.keys(fields)) {
        const field = fields[key] as Field;
        const fieldConfig = (field.config ?? {}) as BaseFieldConfig & { width?: unknown };
        const { width: rawWidth, inlineEditable: rawInlineEditable, ...restConfig } = fieldConfig;
        const overrideWidth = columnOverrides?.[key]?.width;
        const width = overrideWidth ?? normalizeColumnWidth(rawWidth);
        const inlineEditable =
            Boolean(rawInlineEditable) && (columnOverrides?.[key]?.isEditable ?? true);

        // Resolve legacy search values by column index.
        const searchForThisColumn = searchPairs.find(pair => pair.column === String(i));
        const searchValue = searchForThisColumn ? searchForThisColumn.value : "";
        columns[key] = {
            ...restConfig,
            title: req.i18n.__(fieldConfig.title),
            data: String(i),
            direction: String(i) === orderColumn ? direction : undefined,
            searchColumnValue: searchValue || undefined, // undefined, если поиска нет
            inlineEditable,
            ...(width !== undefined ? { width } : {})
        };
        
        
        
        i++;
    }

    return columns;
}

// Build a label used in error messages when a filter targets a different model.
function resolveTargetLabel(
    dataAccessor: DataAccessor,
    model: AbstractModel<any>
): string {
    return dataAccessor?.entity?.name
        ?? dataAccessor?.entity?.config?.model
        ?? model?.modelname
        ?? model?.identity
        ?? "unknown";
}
// Describe the resolved context used to execute list queries.
type ListContext = {
    fields: Fields;
    columns: Record<string, object>;
    sortField?: string;
    columnFilters: FilterCondition[];
    queryBuilder: ModernQueryBuilder;
};

// Describe columns that can be selected in the UI.
type ColumnFieldOption = {
    name: string;
    label: string;
    type?: string;
    inlineEditable?: boolean;
};

// Describe the column configuration payload stored with filters.
type ColumnConfigPayload = {
    fieldName: string;
    order: number;
    isVisible: boolean;
    isEditable: boolean;
    width?: number;
};

// Describe width/editability overrides by field name.
type ColumnOverrides = Record<string, { width?: number; isEditable?: boolean }>;

// Assemble query context for list rendering and execution.
function buildListContext(
    fields: Fields,
    orderColumn: string | undefined,
    direction: string,
    searchPairs: Array<{ column: string; value: string }>,
    req: ReqType,
    entity: ReturnType<typeof ControllerHelper.findEntityObject>,
    dataAccessor: DataAccessor,
    useLegacySearch: boolean,
    columnOverrides?: ColumnOverrides
): ListContext {
    // Compute column metadata and legacy column filters for the list response.
    const columns = setColumns(fields, orderColumn, direction, searchPairs, req, columnOverrides);
    const filterService = req.adminizer.filters.service;
    const sortField = filterService.resolveSortField(orderColumn, Object.keys(fields ?? {}), fields);
    const columnFilters = useLegacySearch
        ? filterService.buildLegacyColumnFilters(fields, searchPairs)
        : [];
    const queryBuilder = new ModernQueryBuilder(entity.model, fields, dataAccessor);

    return {
        fields,
        columns,
        sortField,
        columnFilters,
        queryBuilder
    };
}

// Apply saved column configuration from a filter to the current fields.
function applyColumnSelection(
    fields: Fields,
    columns: FilterColumnAP[]
): { fields: Fields; applied: boolean } {
    if (!Array.isArray(columns) || columns.length === 0) {
        return { fields, applied: false };
    }

    const ordered = [...columns].sort((a, b) => {
        const orderA = Number.isFinite(a.order) ? Number(a.order) : 0;
        const orderB = Number.isFinite(b.order) ? Number(b.order) : 0;
        return orderA - orderB;
    });

    // Keep only visible columns and preserve order.
    const visible = ordered.filter((column) => column.isVisible !== false);
    if (visible.length === 0) {
        return { fields, applied: false };
    }

    const nextFields: Fields = {};
    const missing: string[] = [];

    visible.forEach((column) => {
        const key = String(column.fieldName ?? "").trim();
        if (!key) {
            return;
        }
        const field = fields?.[key];
        if (!field) {
            missing.push(key);
            return;
        }
        const fieldConfig = field.config as BaseFieldConfig;
        if (fieldConfig?.visible === false) {
            missing.push(key);
            return;
        }
        nextFields[key] = field;
    });

    if (missing.length > 0) {
        Adminizer.log.warn(`Filter columns reference unknown fields: ${missing.join(", ")}`);
    }

    if (Object.keys(nextFields).length === 0) {
        return { fields, applied: false };
    }

    return { fields: nextFields, applied: true };
}

// Normalize selected field lists from filter payloads.
function normalizeSelectedFields(selectedFields: unknown): string[] {
    if (!Array.isArray(selectedFields)) {
        return [];
    }

    return selectedFields
        .map((field) => String(field).trim())
        .filter((field) => field.length > 0);
}

// Merge explicit field selections with required field names.
function mergeSelectedFields(selectedFields: string[], requiredFields: Array<string | undefined>): string[] {
    const merged = new Set<string>();

    requiredFields.forEach((field) => {
        const normalized = String(field ?? "").trim();
        if (normalized) {
            merged.add(normalized);
        }
    });

    selectedFields.forEach((field) => {
        const normalized = String(field ?? "").trim();
        if (normalized) {
            merged.add(normalized);
        }
    });

    return Array.from(merged);
}

// Apply selected field constraints to list fields when configured.
function applySelectedFields(
    fields: Fields,
    selectedFields: string[]
): { fields: Fields; applied: boolean } {
    if (!Array.isArray(selectedFields) || selectedFields.length === 0) {
        return { fields, applied: false };
    }

    const nextFields: Fields = {};
    const missing: string[] = [];

    selectedFields.forEach((fieldName) => {
        const key = String(fieldName ?? "").trim();
        if (!key) {
            return;
        }
        const field = fields?.[key];
        if (!field) {
            missing.push(key);
            return;
        }
        const fieldConfig = field.config as BaseFieldConfig;
        if (fieldConfig?.visible === false) {
            missing.push(key);
            return;
        }
        nextFields[key] = field;
    });

    if (missing.length > 0) {
        Adminizer.log.warn(`Filter selectedFields reference unknown fields: ${missing.join(", ")}`);
    }

    if (Object.keys(nextFields).length === 0) {
        return { fields, applied: false };
    }

    return { fields: nextFields, applied: true };
}

function buildColumnFieldOptions(
    fields: Fields,
    req: ReqType
): ColumnFieldOption[] {
    // Expose only visible fields as selectable columns for the UI.
    if (!fields) {
        return [];
    }

    return Object.entries(fields)
        .filter(([, field]) => {
            const config = field?.config as BaseFieldConfig;
            return config?.visible !== false;
        })
        .map(([key, field]) => {
            const config = field?.config as BaseFieldConfig;
            const title = config?.title ? req.i18n.__(config.title) : key;
            return {
                name: key,
                label: title,
                type: config?.type ?? field?.model?.type,
                inlineEditable: Boolean((config as { inlineEditable?: boolean })?.inlineEditable)
            };
        });
}

// Define the clamping bounds for user-configured column widths.
const COLUMN_WIDTH_MIN = 80;
const COLUMN_WIDTH_MAX = 600;

// Normalize column widths to the allowed list UI range.
export function normalizeColumnWidth(value: unknown): number | undefined {
    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return undefined;
    }
    const rounded = Math.round(parsed);
    return Math.min(Math.max(rounded, COLUMN_WIDTH_MIN), COLUMN_WIDTH_MAX);
}

// Convert stored filter columns to UI-ready overrides.
export function buildColumnOverrides(columns: FilterColumnAP[]): ColumnOverrides {
    if (!Array.isArray(columns)) {
        return {};
    }
    const overrides: ColumnOverrides = {};
    columns.forEach((column) => {
        const key = String(column.fieldName ?? "").trim();
        if (!key) {
            return;
        }
        const width = normalizeColumnWidth(column.width);
        const isEditable = typeof column.isEditable === "boolean" ? column.isEditable : undefined;
        if (width !== undefined || isEditable !== undefined) {
            overrides[key] = { width, isEditable };
        }
    });
    return overrides;
}

// Map filter column entities into the API payload for the list UI.
export function mapFilterColumns(columns: FilterColumnAP[]): ColumnConfigPayload[] {
    if (!Array.isArray(columns)) {
        return [];
    }

    return columns.map((column, index) => ({
        fieldName: String(column.fieldName ?? ""),
        order: Number.isFinite(column.order) ? Number(column.order) : index,
        isVisible: column.isVisible !== false,
        isEditable: column.isEditable === true,
        width: normalizeColumnWidth(column.width)
    }));
}
