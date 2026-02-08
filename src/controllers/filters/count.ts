import { buildModelPermissionToken, ensureAuth } from "./helpers";
import { ForbiddenError } from "../../lib/filters/services/FilterAccessService";

export default async function count(req: ReqType, res: ResType) {
  const token = buildModelPermissionToken(req.adminizer, "FilterAP", "read");
  if (!ensureAuth(req, res, token)) {
    return res;
  }

  const { repository, execution, access, migration } = req.adminizer.filters;
  const filterId = String(req.params.id ?? "");

  try {
    const filter = await repository.findByIdAsAdmin(filterId);
    if (!filter) {
      return res.status(404).json({ success: false, error: "Filter not found" });
    }

    access.assertCanExecute(filter, req.user);

    const validation = migration.validate(filter);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: "Filter validation failed",
        validation
      });
    }

    const result = await execution.count(filter, req.user);

    return res.json({ success: true, count: result });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return res.status(403).json({ success: false, error: error.message });
    }
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ success: false, error: message });
  }
}
