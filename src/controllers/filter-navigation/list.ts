import { buildModelPermissionToken, ensureAuth } from "../filters/helpers";
import { FilterNavigationService } from "../../lib/filter-navigation/FilterNavigationService";

export default async function listFilterQuickLinks(req: ReqType, res: ResType) {
  // Reuse filter read permission to keep quick links access aligned with filters.
  const token = buildModelPermissionToken(req.adminizer, "FilterAP", "read");
  if (!ensureAuth(req, res, token)) {
    return res;
  }

  try {
    const service = new FilterNavigationService(req.adminizer);
    const sectionId = typeof req.query.sectionId === "string" ? req.query.sectionId : undefined;
    const data = await service.listNavigationFilters(sectionId);

    return res.json({
      success: true,
      data
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ success: false, error: message });
  }
}
