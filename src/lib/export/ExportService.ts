import path from "node:path";
import { Adminizer } from "../Adminizer";
import { ModernQueryBuilder, QueryParams, QuerySortDirection } from "../query-builder/ModernQueryBuilder";
import { resolveModelContext } from "../filters/utils/modelResolver";
import type { Fields } from "../../helpers/fieldsHelper";
import type { BaseFieldConfig } from "../../interfaces/adminpanelConfig";
import type { FilterAP, FilterCondition } from "../../models/FilterAP";
import type { FilterColumnAP } from "../../models/FilterColumnAP";
import type { UserAP } from "../../models/UserAP";
import { ExportQueue } from "./ExportQueue";
import { JsonExporter } from "./formatters/JsonExporter";
import { CsvExporter } from "./formatters/CsvExporter";
import { ExcelExporter } from "./formatters/ExcelExporter";
import type {
  ExportColumn,
  ExportColumnSearch,
  ExportFormat,
  ExportPayload,
  ExportRequest,
  ExportResult
} from "./types";
import { AbstractExporter } from "./formatters/AbstractExporter";

type ExportContext = {
  modelName: string;
  filter?: Partial<FilterAP>;
  columns: ExportColumn[];
  columnKeys: string[];
  queryBuilder: ModernQueryBuilder;
  queryParams: QueryParams;
  baseFileName: string;
};

const COLUMN_WIDTH_MIN = 80;
const COLUMN_WIDTH_MAX = 600;

export class ExportService {
  private readonly exporters: Map<ExportFormat, AbstractExporter>;

  constructor(
    private readonly adminizer: Adminizer,
    private readonly queue?: ExportQueue
  ) {
    this.exporters = new Map<ExportFormat, AbstractExporter>([
      ["json", new JsonExporter()],
      ["csv", new CsvExporter()],
      ["xlsx", new ExcelExporter()]
    ]);
  }

  getAvailableFormats(): ExportFormat[] {
    return Array.from(this.exporters.keys());
  }

  getContentType(format: ExportFormat): string | undefined {
    return this.exporters.get(format)?.getContentType();
  }

  enqueue(
    request: ExportRequest,
    user: UserAP,
    translate?: (value: string) => string
  ) {
    if (!this.queue) {
      throw new Error("Export queue is not configured");
    }
    return this.queue.enqueue(() => this.export(request, user, translate));
  }

  async export(
    request: ExportRequest,
    user: UserAP,
    translate?: (value: string) => string
  ): Promise<ExportResult> {
    const exporter = this.exporters.get(request.format);
    if (!exporter) {
      return {
        success: false,
        error: `Unsupported export format: ${request.format}`
      };
    }

    const context = await this.resolveContext(request, user, translate);
    const outputDir = this.resolveOutputDir();
    const fileName = this.buildFileName(
      request.fileName ?? context.baseFileName,
      exporter.getFileExtension()
    );
    const filePath = path.join(outputDir, fileName);

    const projectedRows = this.projectRows(
      context.queryBuilder.stream(context.queryParams, {
        chunkSize: request.chunkSize
      }),
      context.columnKeys,
      request.limit
    );

    const payload: ExportPayload = {
      filePath,
      fileName,
      columns: context.columns,
      rows: projectedRows,
      includeHeaders: request.includeHeaders,
      delimiter: request.delimiter,
      encoding: request.encoding,
      sheetName: request.sheetName,
      autoFilter: request.autoFilter,
      freezeHeaders: request.freezeHeaders
    };

    const result = await exporter.export(payload);
    if (!result.success) {
      return result;
    }

    return {
      ...result,
      downloadUrl: `${this.adminizer.config.routePrefix}/export/download/${fileName}`
    };
  }

  private async resolveContext(
    request: ExportRequest,
    user: UserAP,
    translate?: (value: string) => string
  ): Promise<ExportContext> {
    const filterModule = this.adminizer.filters;
    const filterConfig = filterModule.config;
    const translator = translate ?? ((value: string) => value);

    let filter: Partial<FilterAP> | undefined;
    let filterColumns: FilterColumnAP[] = [];

    if (request.filterId || request.filterSlug) {
      filter = request.filterId
        ? await filterModule.repository.findByIdAsAdmin(request.filterId)
        : await filterModule.repository.findBySlugAsAdmin(request.filterSlug ?? "");

      if (!filter) {
        throw new Error(`Filter "${request.filterId ?? request.filterSlug}" not found`);
      }

      filterModule.access.assertCanExecute(filter, user);

      const validation = filterModule.migration.validate(filter);
      if (!validation.valid) {
        throw new Error(`Filter "${filter.id ?? "unknown"}" is invalid`);
      }

      if (filter.id) {
        filterColumns = await filterModule.repository.findColumns(String(filter.id));
      }
    }

    const modelName = request.modelName ?? (filter?.modelName ? String(filter.modelName) : undefined);
    if (!modelName) {
      throw new Error("modelName is required when filterId is not provided");
    }

    const filtersEnabled = filterConfig.isFiltersEnabledForModel(modelName);
    if ((request.filterId || request.filterSlug) && !filtersEnabled) {
      throw new Error(`Filters are disabled for model ${modelName}`);
    }

    const useLegacySearch = request.useLegacySearch
      ?? (!filterConfig.isFiltersEnabled() || filterConfig.shouldUseLegacySearch(modelName));

    const context = resolveModelContext(this.adminizer, modelName, user, "list");

    if (filter) {
      this.assertFilterMatchesModel(filter, context.entry.model.modelname ?? context.entry.name, context);
    }

    const selection = this.buildColumns(
      context.fields,
      filterColumns,
      request.columns,
      translator
    );

    const queryBuilder = new ModernQueryBuilder(
      context.entry.model,
      selection.fields,
      context.dataAccessor
    );

    const queryParams = this.buildQueryParams(
      request,
      filter,
      selection.fields,
      selection.columnKeys,
      useLegacySearch
    );

    return {
      modelName: context.entry.name,
      filter,
      columns: selection.columns,
      columnKeys: selection.columnKeys,
      queryBuilder,
      queryParams,
      baseFileName: this.buildBaseFileName(request, modelName, filter)
    };
  }

  private buildColumns(
    fields: Fields,
    filterColumns: FilterColumnAP[],
    requestedColumns: string[] | undefined,
    translate: (value: string) => string
  ): { fields: Fields; columns: ExportColumn[]; columnKeys: string[] } {
    const filterColumnMap = new Map<string, FilterColumnAP>();
    filterColumns.forEach((column) => {
      const key = String(column.fieldName ?? "").trim();
      if (key) {
        filterColumnMap.set(key, column);
      }
    });

    let orderedKeys: string[] = [];
    if (Array.isArray(requestedColumns) && requestedColumns.length > 0) {
      orderedKeys = requestedColumns.map((value) => String(value));
    } else if (Array.isArray(filterColumns) && filterColumns.length > 0) {
      orderedKeys = [...filterColumns]
        .sort((a, b) => {
          const orderA = Number.isFinite(a.order) ? Number(a.order) : 0;
          const orderB = Number.isFinite(b.order) ? Number(b.order) : 0;
          return orderA - orderB;
        })
        .filter((column) => column.isVisible !== false)
        .map((column) => String(column.fieldName ?? ""));
    } else {
      orderedKeys = Object.keys(fields ?? {});
    }

    const selectedFields: Fields = {};
    const columnKeys: string[] = [];
    const missing: string[] = [];

    orderedKeys.forEach((rawKey) => {
      const key = String(rawKey ?? "").trim();
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
      selectedFields[key] = field;
      columnKeys.push(key);
    });

    if (missing.length > 0) {
      Adminizer.log.warn(`Export columns reference unknown fields: ${missing.join(", ")}`);
    }

    if (columnKeys.length === 0) {
      Object.entries(fields ?? {}).forEach(([key, field]) => {
        const fieldConfig = field.config as BaseFieldConfig;
        if (fieldConfig?.visible === false) {
          return;
        }
        selectedFields[key] = field;
        columnKeys.push(key);
      });
    }

    const columns: ExportColumn[] = columnKeys.map((key) => {
      const field = selectedFields[key];
      const config = field?.config as BaseFieldConfig | undefined;
      const label = config?.title ? translate(config.title) : key;
      const type = config?.type ?? field?.model?.type;
      const width = this.normalizeColumnWidth(filterColumnMap.get(key)?.width);

      return {
        key,
        label,
        type,
        width
      };
    });

    return {
      fields: selectedFields,
      columns,
      columnKeys
    };
  }

  private buildQueryParams(
    request: ExportRequest,
    filter: Partial<FilterAP> | undefined,
    fields: Fields,
    columnKeys: string[],
    useLegacySearch: boolean
  ): QueryParams {
    const baseFilters = Array.isArray(filter?.conditions) ? filter?.conditions : [];
    const columnFilters = useLegacySearch
      ? this.buildLegacyColumnFilters(fields, request.columnSearch ?? [])
      : [];
    const filters: FilterCondition[] = [...baseFilters, ...columnFilters];

    const queryParams: QueryParams = {
      page: 1,
      limit: request.chunkSize ?? 500,
      filters
    };

    let sortField = request.sort ? this.resolveSortField(request.sort, columnKeys, fields) : undefined;
    if (!sortField && filter?.sortField) {
      const candidate = String(filter.sortField);
      sortField = fields?.[candidate] ? candidate : undefined;
    }
    if (sortField) {
      queryParams.sort = sortField;
    }

    const sortDirection =
      request.sortDirection
      ?? this.normalizeSortDirection(filter?.sortDirection);
    if (sortDirection) {
      queryParams.sortDirection = sortDirection;
    }

    if (useLegacySearch && request.globalSearch) {
      queryParams.globalSearch = request.globalSearch;
    }

    return queryParams;
  }

  private buildLegacyColumnFilters(
    fields: Fields,
    searchPairs: ExportColumnSearch[]
  ): FilterCondition[] {
    if (!searchPairs.length) {
      return [];
    }

    const filters: FilterCondition[] = [];
    const fieldKeys = Object.keys(fields ?? {});

    searchPairs.forEach((pair, index) => {
      const rawValue = pair.value?.trim();
      if (!rawValue) {
        return;
      }

      const fieldKey = this.resolveSortField(pair.column, fieldKeys, fields);
      if (!fieldKey) {
        return;
      }

      const field = fields[fieldKey];
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

  private resolveSortField(
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

  private normalizeSortDirection(direction?: string): QuerySortDirection | undefined {
    if (!direction) {
      return undefined;
    }
    return direction.toUpperCase() === "ASC" ? "ASC" : "DESC";
  }

  private normalizeColumnWidth(value: unknown): number | undefined {
    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return undefined;
    }
    const rounded = Math.round(parsed);
    return Math.min(Math.max(rounded, COLUMN_WIDTH_MIN), COLUMN_WIDTH_MAX);
  }

  private buildBaseFileName(
    request: ExportRequest,
    modelName: string,
    filter?: Partial<FilterAP>
  ): string {
    if (request.fileName) {
      return this.sanitizeFileName(request.fileName);
    }

    const rawBase = filter?.slug
      ? `filter-${filter.slug}`
      : filter?.id
        ? `filter-${filter.id}`
        : `model-${modelName}`;

    return `${this.sanitizeFileName(rawBase)}-${Date.now()}`;
  }

  private buildFileName(base: string, extension: string): string {
    const safeBase = this.sanitizeFileName(base);
    return `${safeBase}.${extension}`;
  }

  private sanitizeFileName(value: string): string {
    return String(value ?? "")
      .replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "export";
  }

  private resolveOutputDir(): string {
    return path.join(process.cwd(), "exports");
  }

  private async *projectRows(
    rows: AsyncIterable<Record<string, unknown>>,
    columnKeys: string[],
    limit?: number
  ): AsyncIterable<Record<string, unknown>> {
    let count = 0;

    for await (const row of rows) {
      if (limit !== undefined && count >= limit) {
        break;
      }

      const projected: Record<string, unknown> = {};
      columnKeys.forEach((key) => {
        projected[key] = row[key] ?? null;
      });

      yield projected;
      count += 1;
    }
  }

  private assertFilterMatchesModel(
    filter: Partial<FilterAP>,
    modelName: string,
    context: ReturnType<typeof resolveModelContext>
  ): void {
    const filterModelName = String(filter.modelName ?? "").toLowerCase();
    if (!filterModelName) {
      return;
    }

    const targetNames = new Set<string>();
    if (context?.entity?.name) {
      targetNames.add(String(context.entity.name).toLowerCase());
    }
    if (context?.entity?.config?.model) {
      targetNames.add(String(context.entity.config.model).toLowerCase());
    }
    if (context?.entry?.model?.modelname) {
      targetNames.add(String(context.entry.model.modelname).toLowerCase());
    }
    if (context?.entry?.model?.identity) {
      targetNames.add(String(context.entry.model.identity).toLowerCase());
    }

    if (targetNames.size === 0 || targetNames.has(filterModelName)) {
      return;
    }

    const targetLabel = modelName || "unknown";
    throw new Error(
      `Filter "${filter.name ?? filter.id}" is configured for model "${filter.modelName}", not "${targetLabel}"`
    );
  }
}
