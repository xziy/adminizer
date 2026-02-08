import {ControllerHelper} from "../helpers/controllerHelper";
import {DataAccessor} from "../lib/DataAccessor";
import {Adminizer} from "../lib/Adminizer";
import {inertiaListHelper} from "../helpers/inertiaListHelper";
import {Field, Fields} from "../helpers/fieldsHelper";
import {BaseFieldConfig} from "../interfaces/adminpanelConfig";
import {ModernQueryBuilder, QueryResult, QuerySortDirection} from "../lib/query-builder/ModernQueryBuilder";
import {FilterAP, FilterCondition} from "../models/FilterAP";
import type { FilterColumnAP } from "../models/FilterColumnAP";
import { AbstractModel } from "../lib/model/AbstractModel";

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
    const baseFields = dataAccessor.getFieldsConfig();
    const header = inertiaListHelper(entity, req, baseFields)
    const filterModule = req.adminizer.filters;
    const filterConfig = filterModule.config;
    const filtersEnabled = filterConfig.isFiltersEnabledForModel(entity.name);
    const useLegacySearch = !filterConfig.isFiltersEnabled() || filterConfig.shouldUseLegacySearch(entity.name);
    const page = normalizePositiveInt(req.query.page?.toString(), 1);
    const count = normalizePositiveInt(req.query.count?.toString(), 5);

    const orderColumn = getQueryStringValue(req.query.column);
    const directionParam = getQueryStringValue(req.query.direction)?.toLowerCase();
    const direction = directionParam === "asc" ? "asc" : "desc";
    const sortDirection: QuerySortDirection | undefined = directionParam
        ? directionParam === "asc"
            ? "ASC"
            : "DESC"
        : undefined;

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

    // Collect {column, value} pairs, removing duplicate columns (leaving the latter)
    const searchMap = new Map<string, string>();

    for (let i = 0; i < searchColumns.length; i++) {
        const column = searchColumns[i];
        const value = searchColumnValues[i] || ""; 
        searchMap.set(column, value); 
    }

    const searchPairs = Array.from(searchMap.entries()).map(([column, value]) => ({
        column,
        value,
    }))

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
    const filterColumnFields = buildColumnFieldOptions(baseFields, req);
    let filterColumnsForUi: ColumnConfigPayload[] = [];
    const filterSlug = getQueryStringValue(req.query.filterSlug ?? req.query.filter);
    const filterId = getQueryStringValue(req.query.filterId);

    let data: { data: Record<string, unknown>[]; recordsTotal: number; recordsFiltered: number } = {
        data: [],
        recordsTotal: 0,
        recordsFiltered: 0
    };
    let appliedFilter: string | undefined;
    let appliedFilterId: string | undefined;
    const identifierField =
        entity.config?.identifierField
        ?? req.adminizer.config.identifierField
        ?? entity.model.primaryKey
        ?? "id";
    try {
        let result: QueryResult<Record<string, unknown>> | undefined;

        if ((filterSlug || filterId) && !filtersEnabled) {
            const ignored = filterId ?? filterSlug ?? "";
            Adminizer.log.warn(`Filters disabled for model ${entity.name}, ignoring filter '${ignored}'`);
        }

        if ((filterSlug || filterId) && filtersEnabled) {
            try {
                const filter = filterId
                    ? await filterModule.repository.findByIdAsAdmin(filterId)
                    : await filterModule.repository.findBySlugAsAdmin(filterSlug ?? "");

                if (!filter) {
                    throw new Error(`Filter "${filterId ?? filterSlug}" was not found`);
                }

                appliedFilterId = filter.id ? String(filter.id) : undefined;

                assertFilterMatchesModel(filter, dataAccessor, entity.model);
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
                const columnOverrides = buildColumnOverrides(filterColumns);
                const columnSelection = applyColumnSelection(baseFields, filterColumns);
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
                    : baseContext;

                result = await filterModule.execution.executeFilter(
                    filter,
                    req.user,
                    {
                        page,
                        limit: count,
                        sort: filterContext.sortField,
                        sortDirection,
                        globalSearch: useLegacySearch ? globalSearch : undefined,
                        extraFilters: filterContext.columnFilters
                    }
                );
                appliedFilter = filterId ?? filterSlug;
                activeContext = filterContext;
            } catch (error) {
                Adminizer.log.error(error);
            }
        }

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
            filterColumns: filterColumnsForUi
        }
    });
}

function setColumns(
    fields: Fields,
    orderColumn: string | undefined,
    direction: string,
    searchPairs: Array<{ column: string; value: string }>,
    req: ReqType,
    columnOverrides?: ColumnOverrides
) {
    const columns: Record<string, object> = {};
    let i = 1;

    for (const key of Object.keys(fields)) {
        const field = fields[key] as Field;
        const fieldConfig = (field.config ?? {}) as BaseFieldConfig & { width?: unknown };
        const { width: rawWidth, inlineEditable: rawInlineEditable, ...restConfig } = fieldConfig;
        const overrideWidth = columnOverrides?.[key]?.width;
        const width = overrideWidth ?? normalizeColumnWidth(rawWidth);
        const inlineEditable =
            Boolean(rawInlineEditable) && (columnOverrides?.[key]?.isEditable ?? true);

        // Check if this field is searchable
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

function getQueryStringValue(value: unknown): string | undefined {
    if (Array.isArray(value)) {
        const found = value.map(String).find((item) => item.trim().length > 0);
        return found ? found.trim() : undefined;
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    }
    if (value === undefined || value === null) {
        return undefined;
    }
    const stringValue = String(value).trim();
    return stringValue.length > 0 ? stringValue : undefined;
}

function normalizePositiveInt(value: string | undefined, fallback: number): number {
    if (!value) {
        return fallback;
    }
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
        return fallback;
    }
    return parsed;
}

function resolveSortField(
    orderColumn: string | undefined,
    fieldKeys: string[],
    fields: Fields
): string | undefined {
    if (!orderColumn) {
        return undefined;
    }
    if (fields?.[orderColumn]) {
        return orderColumn;
    }
    const parsed = parseInt(orderColumn, 10);
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= fieldKeys.length) {
        return fieldKeys[parsed - 1];
    }
    return undefined;
}

function buildColumnFilters(
    fields: Fields,
    searchPairs: Array<{ column: string; value: string }>
): FilterCondition[] {
    const filters: FilterCondition[] = [];
    const fieldKeys = Object.keys(fields ?? {});

    searchPairs.forEach((pair, index) => {
        const rawValue = pair.value?.trim();
        if (!rawValue) {
            return;
        }

        const fieldKey = resolveSortField(pair.column, fieldKeys, fields);
        if (!fieldKey) {
            return;
        }

        const field = fields[fieldKey] as Field;
        if (!field || !field.model?.type) {
            return;
        }

        const fieldType = field.model.type;
        let operator: FilterCondition["operator"] | null = null;
        let value: unknown = rawValue;

        if (fieldType === "boolean") {
            const lower = rawValue.toLowerCase();
            if (lower !== "true" && lower !== "false") {
                return;
            }
            operator = "eq";
            value = lower === "true";
        } else if (fieldType === "number") {
            if (rawValue.startsWith(">") || rawValue.startsWith("<")) {
                const parsed = parseFloat(rawValue.slice(1));
                if (Number.isNaN(parsed)) {
                    return;
                }
                operator = rawValue.startsWith(">") ? "gte" : "lte";
                value = parsed;
            } else {
                const parsed = parseFloat(rawValue);
                if (Number.isNaN(parsed)) {
                    return;
                }
                operator = "eq";
                value = parsed;
            }
        } else if (fieldType === "string") {
            operator = "like";
            value = rawValue;
        } else {
            return;
        }

        filters.push({
            id: `column-${fieldKey}-${index}`,
            field: fieldKey,
            operator,
            value
        });
    });

    return filters;
}

function assertFilterMatchesModel(
    filter: Partial<FilterAP>,
    dataAccessor: DataAccessor,
    model: AbstractModel<any>
): void {
    const filterModelName = String(filter.modelName ?? "").toLowerCase();
    if (!filterModelName) {
        return;
    }

    const targetNames = new Set<string>();
    if (dataAccessor?.entity?.name) {
        targetNames.add(String(dataAccessor.entity.name).toLowerCase());
    }
    if (dataAccessor?.entity?.config?.model) {
        targetNames.add(String(dataAccessor.entity.config.model).toLowerCase());
    }
    if (model?.modelname) {
        targetNames.add(String(model.modelname).toLowerCase());
    }
    if (model?.identity) {
        targetNames.add(String(model.identity).toLowerCase());
    }

    if (targetNames.size === 0 || targetNames.has(filterModelName)) {
        return;
    }

    const targetLabel = dataAccessor?.entity?.name
        ?? dataAccessor?.entity?.config?.model
        ?? model?.modelname
        ?? model?.identity
        ?? "unknown";

    throw new Error(
        `Filter \"${filter.name ?? filter.id}\" is configured for model \"${filter.modelName}\", not \"${targetLabel}\"`
    );
}

type ListContext = {
    fields: Fields;
    columns: Record<string, object>;
    sortField?: string;
    columnFilters: FilterCondition[];
    queryBuilder: ModernQueryBuilder;
};

type ColumnFieldOption = {
    name: string;
    label: string;
    type?: string;
    inlineEditable?: boolean;
};

type ColumnConfigPayload = {
    fieldName: string;
    order: number;
    isVisible: boolean;
    isEditable: boolean;
    width?: number;
};

type ColumnOverrides = Record<string, { width?: number; isEditable?: boolean }>;

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
    const columns = setColumns(fields, orderColumn, direction, searchPairs, req, columnOverrides);
    const sortField = resolveSortField(orderColumn, Object.keys(fields ?? {}), fields);
    const columnFilters = useLegacySearch ? buildColumnFilters(fields, searchPairs) : [];
    const queryBuilder = new ModernQueryBuilder(entity.model, fields, dataAccessor);

    return {
        fields,
        columns,
        sortField,
        columnFilters,
        queryBuilder
    };
}

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

function buildColumnFieldOptions(
    fields: Fields,
    req: ReqType
): ColumnFieldOption[] {
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

const COLUMN_WIDTH_MIN = 80;
const COLUMN_WIDTH_MAX = 600;

export function normalizeColumnWidth(value: unknown): number | undefined {
    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return undefined;
    }
    const rounded = Math.round(parsed);
    return Math.min(Math.max(rounded, COLUMN_WIDTH_MIN), COLUMN_WIDTH_MAX);
}

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
