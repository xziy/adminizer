import { buildModelPermissionToken, ensureAuth } from "../filters/helpers";
import { FilterNavigationService } from "../../lib/filter-navigation/FilterNavigationService";

export default async function reorderFilterQuickLinks(req: ReqType, res: ResType) {
  // Reuse filter read permission to keep quick links access aligned with filters.
  const token = buildModelPermissionToken(req.adminizer, "FilterAP", "read");
  if (!ensureAuth(req, res, token)) {
    return res;
  }

  const payload = req.body ?? {};
  const orderedIds = Array.isArray(payload.orderedIds) ? payload.orderedIds : [];
  const sectionId = typeof payload.sectionId === "string" ? payload.sectionId : undefined;

  if (orderedIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: "orderedIds is required"
    });
  }

  try {
    const service = new FilterNavigationService(req.adminizer);
    await service.reorder(sectionId, orderedIds.map((id: unknown) => String(id)));

    return res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ success: false, error: message });
  }
}
