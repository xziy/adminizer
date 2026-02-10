import path from "node:path";
import { Adminizer } from "../Adminizer";
import { ModernQueryBuilder, QueryParams } from "../query-builder/ModernQueryBuilder";
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
  ExportFormat,
  ExportPayload,
  ExportRequest,
  ExportResult
} from "./types";
import { AbstractExporter } from "./formatters/AbstractExporter";

// Capture resolved export data needed by formatters and streaming.
type ExportContext = {
  modelName: string;
  filter?: Partial<FilterAP>;
  columns: ExportColumn[];
  columnKeys: string[];
  queryBuilder: ModernQueryBuilder;
  queryParams: QueryParams;
  baseFileName: string;
};

// Clamp exported column widths to the same bounds as list configuration.
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

  // List all export formats supported by the service.
  getAvailableFormats(): ExportFormat[] {
    return Array.from(this.exporters.keys());
  }

  // Resolve a content type based on the export format.
  getContentType(format: ExportFormat): string | undefined {
    return this.exporters.get(format)?.getContentType();
  }

  // Enqueue a background export job when a queue is configured.
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

  // Execute the export pipeline and write output to disk.
  async export(
    request: ExportRequest,
    user: UserAP,
    translate?: (value: string) => string
  ): Promise<ExportResult> {
    // Resolve the exporter and fail fast on unsupported formats.
    const exporter = this.exporters.get(request.format);
    if (!exporter) {
      return {
        success: false,
        error: `Unsupported export format: ${request.format}`
      };
    }

    // Build the full export context before streaming rows.
    const context = await this.resolveContext(request, user, translate);
    const outputDir = this.resolveOutputDir();
    const fileName = this.buildFileName(
      request.fileName ?? context.baseFileName,
      exporter.getFileExtension()
    );
    const filePath = path.join(outputDir, fileName);

    // Project stream rows to selected columns and apply optional limits.
    const projectedRows = this.projectRows(
      context.queryBuilder.stream(context.queryParams, {
        chunkSize: request.chunkSize
      }),
      context.columnKeys,
      request.limit
    );

    // Compose the exporter payload with formatting options.
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

    // Write the export and return the download metadata.
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
    // Prepare filter-related dependencies for reuse.
    const filterModule = this.adminizer.filters;
    const filterConfig = filterModule.config;
    const filterService = filterModule.service;
    const translator = translate ?? ((value: string) => value);

    // Resolve a saved filter when filterId or filterSlug is provided.
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

    // Determine the model for export and ensure filters are allowed.
    const modelName = request.modelName ?? (filter?.modelName ? String(filter.modelName) : undefined);
    if (!modelName) {
      throw new Error("modelName is required when filterId is not provided");
    }

    const filtersEnabled = filterConfig.isFiltersEnabledForModel(modelName);
    if ((request.filterId || request.filterSlug) && !filtersEnabled) {
      throw new Error(`Filters are disabled for model ${modelName}`);
    }

    // Decide whether legacy search parameters should be honored.
    const useLegacySearch = request.useLegacySearch
      ?? (!filterConfig.isFiltersEnabled() || filterConfig.shouldUseLegacySearch(modelName));

    // Resolve the model context to drive field selection and query execution.
    const context = resolveModelContext(this.adminizer, modelName, user, "list");

    if (filter) {
      const targetNames = filterService.buildTargetNameSet([
        context?.entity?.name,
        context?.entity?.config?.model,
        context?.entry?.model?.modelname,
        context?.entry?.model?.identity
      ]);
      const targetLabel = context.entry.model.modelname ?? context.entry.name;
      filterService.assertFilterMatchesModel(filter, targetNames, targetLabel);
    }

    // Build the column selection and query parameters for export.
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

    // Build query params with filters, sort, and search options.
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
    // Build the selected column list and field map for export.
    // Map filter column overrides for quick lookup.
    const filterColumnMap = new Map<string, FilterColumnAP>();
    filterColumns.forEach((column) => {
      const key = String(column.fieldName ?? "").trim();
      if (key) {
        filterColumnMap.set(key, column);
      }
    });

    // Resolve the requested column order with fallbacks.
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

    // Filter out unknown or hidden fields, while keeping an ordered list.
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

    // Build export column descriptors used by formatters.
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
    // Build query parameters for the export stream.
    // Compose filter conditions from saved filters and legacy column searches.
    const baseFilters = Array.isArray(filter?.conditions) ? filter?.conditions : [];
    const filterService = this.adminizer.filters.service;
    const columnFilters = useLegacySearch
      ? filterService.buildLegacyColumnFilters(fields, request.columnSearch ?? [])
      : [];
    const filters: FilterCondition[] = [...baseFilters, ...columnFilters];

    // Apply pagination and filter parameters for streaming exports.
    const queryParams: QueryParams = {
      page: 1,
      limit: request.chunkSize ?? 500,
      filters
    };

    // Resolve sorting from request or fallback to filter configuration.
    let sortField = request.sort
      ? filterService.resolveSortField(request.sort, columnKeys, fields)
      : undefined;
    if (!sortField && filter?.sortField) {
      const candidate = String(filter.sortField);
      sortField = fields?.[candidate] ? candidate : undefined;
    }
    if (sortField) {
      queryParams.sort = sortField;
    }

    // Normalize sort direction from request or filter defaults.
    const sortDirection =
      request.sortDirection
      ?? filterService.normalizeSortDirection(filter?.sortDirection);
    if (sortDirection) {
      queryParams.sortDirection = sortDirection;
    }

    // Apply global search only when legacy mode is enabled.
    if (useLegacySearch && request.globalSearch) {
      queryParams.globalSearch = request.globalSearch;
    }

    return queryParams;
  }

  // Normalize column width values to the expected export range.
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
    // Prefer explicit file names and fall back to filter/model identifiers.
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

  // Append the file extension to a sanitized base name.
  private buildFileName(base: string, extension: string): string {
    const safeBase = this.sanitizeFileName(base);
    return `${safeBase}.${extension}`;
  }

  // Remove unsafe characters from file names for export output.
  private sanitizeFileName(value: string): string {
    return String(value ?? "")
      .replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "export";
  }

  // Resolve the output directory for exported files.
  private resolveOutputDir(): string {
    return path.join(process.cwd(), "exports");
  }

  // Stream rows and project only the selected keys for the export.
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
}
