import { buildModelPermissionToken, ensureAuth } from "../filters/helpers";
import { FilterNavigationService } from "../../lib/filter-navigation/FilterNavigationService";

export default async function removeFilterQuickLink(req: ReqType, res: ResType) {
  // Reuse filter read permission to keep quick links access aligned with filters.
  const token = buildModelPermissionToken(req.adminizer, "FilterAP", "read");
  if (!ensureAuth(req, res, token)) {
    return res;
  }

  const filterId = String(req.params.id ?? "").trim();
  if (!filterId) {
    return res.status(400).json({
      success: false,
      error: "filter id is required"
    });
  }

  const sectionId = typeof req.query.sectionId === "string" ? req.query.sectionId : undefined;

  try {
    const service = new FilterNavigationService(req.adminizer);
    await service.removeFilterFromNavigation(filterId, sectionId);

    return res.json({
      success: true
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ success: false, error: message });
  }
}
