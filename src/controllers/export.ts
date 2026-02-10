import fs from "node:fs";
import path from "node:path";
import type { ExportFormat, ExportRequest } from "../lib/export/types";
import { ForbiddenError } from "../lib/filters/services/FilterAccessService";
import type { FilterService } from "../lib/filters/services/FilterService";
import {
  buildModelPermissionToken,
  ensureAuth
} from "./filters/helpers";

export default async function exportData(req: ReqType, res: ResType) {
  // Parse the incoming request into a typed export payload.
  const request = buildExportRequest(req);
  if (!request) {
    return res.status(400).json({ success: false, error: "Export format is required" });
  }

  // Build the permission token for the target model, if specified.
  let permissionToken: string | undefined;
  if (request.modelName) {
    try {
      permissionToken = buildModelPermissionToken(req.adminizer, request.modelName, "read");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return res.status(400).json({ success: false, error: message });
    }
  }

  // Enforce authentication and model-level permissions.
  if (!ensureAuth(req, res, permissionToken)) {
    return res;
  }

  // Block export when the user lacks explicit export permissions.
  if (!hasExportPermission(req, request.format)) {
    return res.status(403).json({ success: false, error: "Export permission denied" });
  }

  try {
    const exportService = req.adminizer.exportModule.service;
    // Use background exports when requested by the client.
    if (request.background) {
      const job = exportService.enqueue(request, req.user);
      return res.status(202).json({ success: true, job });
    }

    // Run the export immediately and return the result.
    const result = await exportService.export(request, req.user);
    if (!result.success) {
      return res.status(500).json(result);
    }
    return res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = resolveErrorStatus(error, message);
    return res.status(status).json({ success: false, error: message });
  }
}

export async function exportFilterById(req: ReqType, res: ResType) {
  // Build an export request based on the filter route params.
  const format = String(req.params.format ?? "").toLowerCase() as ExportFormat;
  const filterId = String(req.params.id ?? "").trim();

  const request = buildExportRequest(req, { format, filterId });
  if (!request) {
    return res.status(400).json({ success: false, error: "Export format is required" });
  }

  // Require authentication before running the export.
  if (!ensureAuth(req, res)) {
    return res;
  }

  // Enforce export-level permission checks.
  if (!hasExportPermission(req, request.format)) {
    return res.status(403).json({ success: false, error: "Export permission denied" });
  }

  try {
    const exportService = req.adminizer.exportModule.service;
    // Run the export immediately for direct filter endpoints.
    const result = await exportService.export(request, req.user);
    if (!result.success) {
      return res.status(500).json(result);
    }
    return res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = resolveErrorStatus(error, message);
    return res.status(status).json({ success: false, error: message });
  }
}

export async function downloadExport(req: ReqType, res: ResType) {
  // Validate the filename to prevent path traversal.
  const filename = String(req.params.filename ?? "");
  if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return res.status(400).json({ success: false, error: "Invalid filename" });
  }

  // Ensure the export file exists before streaming.
  const filePath = path.join(process.cwd(), "exports", filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: "File not found" });
  }

  // Set headers for the download response.
  const ext = path.extname(filename).slice(1).toLowerCase() as ExportFormat;
  const contentType = req.adminizer.exportModule.service.getContentType(ext);
  if (contentType) {
    res.setHeader("Content-Type", contentType);
  }
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  // Stream the file contents to the response.
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
  return res;
}

export async function listExportFormats(req: ReqType, res: ResType) {
  // Require authentication before revealing available formats.
  if (!ensureAuth(req, res)) {
    return res;
  }

  // Return the configured exporter formats.
  const formats = req.adminizer.exportModule.service.getAvailableFormats();
  return res.json({ success: true, formats });
}

const buildExportRequest = (
  req: ReqType,
  overrides: Partial<ExportRequest> = {}
): ExportRequest | null => {
  // Read query/body inputs and normalize them via the filter service.
  const body = (req.body ?? {}) as Record<string, unknown>;
  const query = (req.query ?? {}) as Record<string, unknown>;
  const filterService = req.adminizer.filters.service;

  const rawFormat = overrides.format
    ?? filterService.getQueryStringValue(body.format ?? query.format);
  if (!rawFormat) {
    return null;
  }

  // Normalize base identifiers used by export and filters.
  const format = String(rawFormat).toLowerCase() as ExportFormat;

  const modelName = overrides.modelName
    ?? filterService.getQueryStringValue(body.modelName ?? query.modelName);

  const filterId = overrides.filterId
    ?? filterService.getQueryStringValue(body.filterId ?? query.filterId);

  const filterSlug = overrides.filterSlug
    ?? filterService.getQueryStringValue(body.filterSlug ?? query.filterSlug ?? query.filter);

  // Normalize optional column selection overrides.
  const columns = normalizeColumns(body.columns);

  // Parse sort inputs and translate to query-builder direction.
  const orderColumn = filterService.getQueryStringValue(query.column);
  const directionParam = filterService.getQueryStringValue(query.direction)?.toLowerCase();
  const sortDirection = filterService.normalizeSortDirection(directionParam);

  // Capture legacy search inputs for the export query.
  const globalSearch = filterService.getQueryStringValue(query.globalSearch);

  // Build column search pairs for legacy filter logic.
  const columnSearch = buildColumnSearchPairs(
    filterService,
    query.searchColumn,
    query.searchColumnValue
  );

  // Parse optional boolean flags for exporters.
  const includeHeaders = filterService.parseBoolean(body.includeHeaders);
  const autoFilter = filterService.parseBoolean(body.autoFilter);
  const freezeHeaders = filterService.parseBoolean(body.freezeHeaders);
  const background = filterService.parseBoolean(body.background);

  // Parse pagination parameters for streamed exports.
  const limit = parseOptionalPositiveInt(filterService, body.limit);
  const chunkSize = parseOptionalPositiveInt(filterService, body.chunkSize);

  return {
    format,
    modelName,
    filterId,
    filterSlug,
    columns,
    sort: orderColumn,
    sortDirection,
    globalSearch,
    columnSearch,
    includeHeaders: includeHeaders === undefined ? undefined : includeHeaders,
    delimiter: filterService.getQueryStringValue(body.delimiter),
    encoding: filterService.getQueryStringValue(body.encoding) as BufferEncoding | undefined,
    sheetName: filterService.getQueryStringValue(body.sheetName),
    autoFilter: autoFilter === undefined ? undefined : autoFilter,
    freezeHeaders: freezeHeaders === undefined ? undefined : freezeHeaders,
    limit,
    chunkSize,
    background: background === undefined ? undefined : background
  };
};

const buildColumnSearchPairs = (
  filterService: FilterService,
  columns: unknown,
  values: unknown
): { column: string; value: string }[] => {
  // Normalize search inputs into aligned arrays.
  const keys = Array.isArray(columns) ? columns.map(String) : columns ? [String(columns)] : [];
  const vals = Array.isArray(values) ? values.map(String) : values ? [String(values)] : [];

  // Reuse the filter service to apply last-write-wins semantics.
  return filterService
    .buildSearchPairs(keys, vals)
    .filter(({ column, value }) => column && value);
};

const normalizeColumns = (value: unknown): string[] | undefined => {
  // Convert column overrides to a normalized string array.
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return undefined;
};

const parseOptionalPositiveInt = (
  filterService: FilterService,
  value: unknown
): number | undefined => {
  // Convert optional pagination inputs into positive integers.
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const parsed = filterService.normalizePositiveInt(value, 0);
  return parsed > 0 ? parsed : undefined;
};

const resolveErrorStatus = (error: unknown, message: string): number => {
  // Map known failure modes to HTTP status codes.
  if (error instanceof ForbiddenError) {
    return 403;
  }
  if (/not found/i.test(message)) {
    return 404;
  }
  if (/disabled/i.test(message) || /required/i.test(message)) {
    return 400;
  }
  if (/access denied/i.test(message)) {
    return 403;
  }
  return 500;
};

const hasExportPermission = (req: ReqType, format: ExportFormat): boolean => {
  // Allow exports when auth is disabled or no export token is required.
  if (!req.adminizer.config.auth.enable) {
    return true;
  }

  const token = resolveExportToken(format);
  if (!token) {
    return true;
  }

  return req.adminizer.accessRightsHelper.hasPermission(token, req.user);
};

const resolveExportToken = (format: ExportFormat): string | undefined => {
  // Map export formats to permission tokens.
  switch (format) {
    case "json":
    case "csv":
      return "export-json";
    case "xlsx":
      return "export-excel";
    default:
      return undefined;
  }
};
