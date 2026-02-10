import { buildModelPermissionToken, ensureAuth } from "../filters/helpers";
import { FilterNavigationService } from "../../lib/filter-navigation/FilterNavigationService";

export default async function addFilterQuickLink(req: ReqType, res: ResType) {
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

  const payload = req.body ?? {};
  const sectionId = typeof payload.sectionId === "string" ? payload.sectionId : undefined;
  const customName = typeof payload.customName === "string" ? payload.customName : undefined;
  const icon = typeof payload.icon === "string" ? payload.icon : undefined;

  try {
    const service = new FilterNavigationService(req.adminizer);
    const item = await service.addFilterToNavigation({
      filterId,
      sectionId,
      customName,
      icon
    });

    return res.status(201).json({
      success: true,
      data: item
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ success: false, error: message });
  }
}
