import fs from "node:fs";
import path from "node:path";
import type { ExportFormat, ExportRequest } from "../lib/export/types";
import { ForbiddenError } from "../lib/filters/services/FilterAccessService";
import {
  buildModelPermissionToken,
  ensureAuth,
  getQueryStringValue,
  normalizePositiveInt,
  parseBoolean
} from "./filters/helpers";

export default async function exportData(req: ReqType, res: ResType) {
  const request = buildExportRequest(req);
  if (!request) {
    return res.status(400).json({ success: false, error: "Export format is required" });
  }

  let permissionToken: string | undefined;
  if (request.modelName) {
    try {
      permissionToken = buildModelPermissionToken(req.adminizer, request.modelName, "read");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return res.status(400).json({ success: false, error: message });
    }
  }

  if (!ensureAuth(req, res, permissionToken)) {
    return res;
  }

  if (!hasExportPermission(req, request.format)) {
    return res.status(403).json({ success: false, error: "Export permission denied" });
  }

  try {
    const exportService = req.adminizer.exportModule.service;
    if (request.background) {
      const job = exportService.enqueue(request, req.user);
      return res.status(202).json({ success: true, job });
    }

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
  const format = String(req.params.format ?? "").toLowerCase() as ExportFormat;
  const filterId = String(req.params.id ?? "").trim();

  const request = buildExportRequest(req, { format, filterId });
  if (!request) {
    return res.status(400).json({ success: false, error: "Export format is required" });
  }

  if (!ensureAuth(req, res)) {
    return res;
  }

  if (!hasExportPermission(req, request.format)) {
    return res.status(403).json({ success: false, error: "Export permission denied" });
  }

  try {
    const exportService = req.adminizer.exportModule.service;
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
  const filename = String(req.params.filename ?? "");
  if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return res.status(400).json({ success: false, error: "Invalid filename" });
  }

  const filePath = path.join(process.cwd(), "exports", filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: "File not found" });
  }

  const ext = path.extname(filename).slice(1).toLowerCase() as ExportFormat;
  const contentType = req.adminizer.exportModule.service.getContentType(ext);
  if (contentType) {
    res.setHeader("Content-Type", contentType);
  }
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
  return res;
}

export async function listExportFormats(req: ReqType, res: ResType) {
  if (!ensureAuth(req, res)) {
    return res;
  }

  const formats = req.adminizer.exportModule.service.getAvailableFormats();
  return res.json({ success: true, formats });
}

const buildExportRequest = (
  req: ReqType,
  overrides: Partial<ExportRequest> = {}
): ExportRequest | null => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const query = (req.query ?? {}) as Record<string, unknown>;

  const rawFormat = overrides.format
    ?? getQueryStringValue(body.format ?? query.format);
  if (!rawFormat) {
    return null;
  }

  const format = String(rawFormat).toLowerCase() as ExportFormat;

  const modelName = overrides.modelName
    ?? getQueryStringValue(body.modelName ?? query.modelName);

  const filterId = overrides.filterId
    ?? getQueryStringValue(body.filterId ?? query.filterId);

  const filterSlug = overrides.filterSlug
    ?? getQueryStringValue(body.filterSlug ?? query.filterSlug ?? query.filter);

  const columns = normalizeColumns(body.columns);

  const orderColumn = getQueryStringValue(query.column);
  const directionParam = getQueryStringValue(query.direction)?.toLowerCase();
  const sortDirection =
    directionParam === "asc" ? "ASC" : directionParam === "desc" ? "DESC" : undefined;

  const globalSearch = getQueryStringValue(query.globalSearch);

  const columnSearch = buildColumnSearchPairs(query.searchColumn, query.searchColumnValue);

  const includeHeaders = parseBoolean(body.includeHeaders);
  const autoFilter = parseBoolean(body.autoFilter);
  const freezeHeaders = parseBoolean(body.freezeHeaders);
  const background = parseBoolean(body.background);

  const limit = parseOptionalPositiveInt(body.limit);
  const chunkSize = parseOptionalPositiveInt(body.chunkSize);

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
    delimiter: getQueryStringValue(body.delimiter),
    encoding: getQueryStringValue(body.encoding) as BufferEncoding | undefined,
    sheetName: getQueryStringValue(body.sheetName),
    autoFilter: autoFilter === undefined ? undefined : autoFilter,
    freezeHeaders: freezeHeaders === undefined ? undefined : freezeHeaders,
    limit,
    chunkSize,
    background: background === undefined ? undefined : background
  };
};

const buildColumnSearchPairs = (
  columns: unknown,
  values: unknown
): { column: string; value: string }[] => {
  const keys = Array.isArray(columns) ? columns.map(String) : columns ? [String(columns)] : [];
  const vals = Array.isArray(values) ? values.map(String) : values ? [String(values)] : [];

  const searchMap = new Map<string, string>();
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    const value = vals[i] ?? "";
    searchMap.set(key, value);
  }

  return Array.from(searchMap.entries())
    .filter(([column, value]) => column && value)
    .map(([column, value]) => ({ column, value }));
};

const normalizeColumns = (value: unknown): string[] | undefined => {
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

const parseOptionalPositiveInt = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const parsed = normalizePositiveInt(value, 0);
  return parsed > 0 ? parsed : undefined;
};

const resolveErrorStatus = (error: unknown, message: string): number => {
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
