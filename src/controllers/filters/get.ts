import { buildModelPermissionToken, ensureAuth } from "./helpers";
import { ForbiddenError } from "../../lib/filters/services/FilterAccessService";

export default async function getFilter(req: ReqType, res: ResType) {
  const token = buildModelPermissionToken(req.adminizer, "FilterAP", "read");
  if (!ensureAuth(req, res, token)) {
    return res;
  }

  const { repository, access } = req.adminizer.filters;
  const filterId = String(req.params.id ?? "");

  try {
    const filter = await repository.findByIdAsAdmin(filterId);

    if (!filter) {
      return res.status(404).json({ success: false, error: "Filter not found" });
    }

    access.assertCanView(filter, req.user);

    return res.json({ success: true, data: filter });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return res.status(403).json({ success: false, error: error.message });
    }
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ success: false, error: message });
  }
}
