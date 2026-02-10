import { buildModelPermissionToken, ensureAuth } from "./helpers";
import { ForbiddenError } from "../../lib/filters/services/FilterAccessService";

export default async function preview(req: ReqType, res: ResType) {
  // Enforce authentication and read permissions for previewing filters.
  const token = buildModelPermissionToken(req.adminizer, "FilterAP", "read");
  if (!ensureAuth(req, res, token)) {
    return res;
  }

  // Resolve filter dependencies for validation and execution.
  const { config, execution, validator, service } = req.adminizer.filters;

  // Normalize incoming preview request parameters.
  const modelName = typeof req.body?.modelName === "string" ? req.body.modelName : "";
  const conditions = req.body?.conditions;
  const page = service.normalizePositiveInt(req.body?.page, 1);
  const limit = service.normalizePositiveInt(req.body?.limit, 25, 100);
  const sort = typeof req.body?.sort === "string" ? req.body.sort : undefined;
  const sortDirection = typeof req.body?.sortDirection === "string" ? req.body.sortDirection : undefined;
  const globalSearch = typeof req.body?.globalSearch === "string" ? req.body.globalSearch : undefined;

  // Ensure required fields are provided.
  if (!modelName) {
    return res.status(400).json({
      success: false,
      error: "modelName is required"
    });
  }

  // Block previews for disabled models.
  if (!config.isFiltersEnabledForModel(modelName)) {
    return res.status(403).json({
      success: false,
      error: `Filters are disabled for model ${modelName}`,
      filtersEnabled: false,
      useLegacySearch: true
    });
  }

  try {
    // Validate the filter conditions before execution.
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

    // Execute the preview query and return data with pagination metadata.
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
    // Convert access and server errors into HTTP responses.
    if (error instanceof ForbiddenError) {
      return res.status(403).json({ success: false, error: error.message });
    }
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ success: false, error: message });
  }
}
