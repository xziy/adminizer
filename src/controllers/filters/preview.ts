import { buildModelPermissionToken, ensureAuth, normalizePositiveInt } from "./helpers";
import { ForbiddenError } from "../../lib/filters/services/FilterAccessService";

export default async function preview(req: ReqType, res: ResType) {
  const token = buildModelPermissionToken(req.adminizer, "FilterAP", "read");
  if (!ensureAuth(req, res, token)) {
    return res;
  }

  const { config, execution, validator } = req.adminizer.filters;

  const modelName = typeof req.body?.modelName === "string" ? req.body.modelName : "";
  const conditions = req.body?.conditions;
  const page = normalizePositiveInt(req.body?.page, 1);
  const limit = normalizePositiveInt(req.body?.limit, 25, 100);
  const sort = typeof req.body?.sort === "string" ? req.body.sort : undefined;
  const sortDirection = typeof req.body?.sortDirection === "string" ? req.body.sortDirection : undefined;
  const globalSearch = typeof req.body?.globalSearch === "string" ? req.body.globalSearch : undefined;

  if (!modelName) {
    return res.status(400).json({
      success: false,
      error: "modelName is required"
    });
  }

  if (!config.isFiltersEnabledForModel(modelName)) {
    return res.status(403).json({
      success: false,
      error: `Filters are disabled for model ${modelName}`,
      filtersEnabled: false,
      useLegacySearch: true
    });
  }

  try {
    const validation = validator.validate(
      conditions ?? [],
      modelName,
      req.user
    );

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: "Invalid filter conditions",
        validation
      });
    }

    const result = await execution.executeTemporary(
      modelName,
      validation.sanitizedConditions ?? [],
      req.user,
      { page, limit, sort, sortDirection, globalSearch }
    );

    return res.json({
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        filtered: result.filtered,
        page: result.page,
        pages: result.pages,
        limit: result.limit
      }
    });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return res.status(403).json({ success: false, error: error.message });
    }
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ success: false, error: message });
  }
}
