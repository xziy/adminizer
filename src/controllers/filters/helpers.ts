import { Adminizer } from "../../lib/Adminizer";
import { resolveModelEntry } from "../../lib/filters/utils/modelResolver";

type PermissionAction = "read" | "create" | "update" | "delete";

// Map permission actions to their access-rights verbs.
const ACTION_VERBS: Record<PermissionAction, string> = {
  read: "read",
  create: "create",
  update: "update",
  delete: "delete"
};

// Build an access-rights token for a model and action.
export const buildModelPermissionToken = (
  adminizer: Adminizer,
  modelName: string,
  action: PermissionAction
): string => {
  const entry = resolveModelEntry(adminizer, modelName);
  const verb = ACTION_VERBS[action];
  return `${verb}-${entry.config.model}-model`.toLowerCase();
};

// Enforce authentication and optional permission checks in controllers.
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
