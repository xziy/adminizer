import { buildModelPermissionToken, ensureAuth } from "./helpers";
import { ForbiddenError } from "../../lib/filters/services/FilterAccessService";

export default async function remove(req: ReqType, res: ResType) {
  const token = buildModelPermissionToken(req.adminizer, "FilterAP", "delete");
  if (!ensureAuth(req, res, token)) {
    return res;
  }

  const { repository, access } = req.adminizer.filters;
  const filterId = String(req.params.id ?? "");

  try {
    const existing = await repository.findByIdAsAdmin(filterId);
    if (!existing) {
      return res.status(404).json({ success: false, error: "Filter not found" });
    }

    access.assertCanEdit(existing, req.user);

    await repository.delete(filterId, req.user);

    return res.json({ success: true });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return res.status(403).json({ success: false, error: error.message });
    }
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ success: false, error: message });
  }
}
