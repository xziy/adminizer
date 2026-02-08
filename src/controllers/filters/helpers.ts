import { Adminizer } from "../../lib/Adminizer";
import { resolveModelEntry } from "../../lib/filters/utils/modelResolver";

type PermissionAction = "read" | "create" | "update" | "delete";

const ACTION_VERBS: Record<PermissionAction, string> = {
  read: "read",
  create: "create",
  update: "update",
  delete: "delete"
};

export const getQueryStringValue = (value: unknown): string | undefined => {
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
};

export const normalizePositiveInt = (
  value: unknown,
  fallback: number,
  max?: number
): number => {
  if (value === undefined || value === null) {
    return fallback;
  }
  const parsed = typeof value === "number" ? value : parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  const normalized = Math.floor(parsed);
  if (max !== undefined) {
    return Math.min(normalized, max);
  }
  return normalized;
};

export const parseBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === "boolean") {
    return value;
  }
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }
  return undefined;
};

export const buildModelPermissionToken = (
  adminizer: Adminizer,
  modelName: string,
  action: PermissionAction
): string => {
  const entry = resolveModelEntry(adminizer, modelName);
  const verb = ACTION_VERBS[action];
  return `${verb}-${entry.config.model}-model`.toLowerCase();
};

export const ensureAuth = (
  req: ReqType,
  res: ResType,
  permissionToken?: string
): boolean => {
  if (!req.adminizer.config.auth.enable) {
    return true;
  }

  if (!req.user) {
    res.redirect(`${req.adminizer.config.routePrefix}/model/userap/login`);
    return false;
  }

  if (permissionToken && !req.adminizer.accessRightsHelper.hasPermission(permissionToken, req.user)) {
    res.sendStatus(403);
    return false;
  }

  return true;
};
