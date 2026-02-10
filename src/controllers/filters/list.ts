import { resolveModelContext } from "../../lib/filters/utils/modelResolver";
import { buildModelPermissionToken, ensureAuth } from "./helpers";

export default async function list(req: ReqType, res: ResType) {
  // Enforce authentication and read permissions for filter listing.
  const token = buildModelPermissionToken(req.adminizer, "FilterAP", "read");
  if (!ensureAuth(req, res, token)) {
    return res;
  }

  // Resolve filter dependencies for validation and paging.
  const { repository, config, service } = req.adminizer.filters;

  // Normalize incoming query parameters.
  const modelNameParam = service.getQueryStringValue(req.query.modelName);
  if (!config.isFiltersEnabled()) {
    return res.status(403).json({
      success: false,
      error: "Filters are disabled",
      filtersEnabled: false
    });
  }

  if (modelNameParam && !config.isFiltersEnabledForModel(modelNameParam)) {
    return res.status(403).json({
      success: false,
      error: `Filters are disabled for model ${modelNameParam}`,
      filtersEnabled: false,
      useLegacySearch: true
    });
  }

  if (modelNameParam) {
    try {
      // Ensure the requested model exists and can be resolved.
      resolveModelContext(req.adminizer, modelNameParam, req.user, "list");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return res.status(403).json({
        success: false,
        error: message
      });
    }
  }

  // Apply pagination and filter flags.
  const page = service.normalizePositiveInt(req.query.page, 1);
  const limit = service.normalizePositiveInt(req.query.limit, 50, 100);
  const onlyPinned = service.parseBoolean(req.query.pinned) === true;
  const includeSystem = service.parseBoolean(req.query.includeSystem) === true;

  try {
    // Fetch filter list with applied constraints.
    const result = await repository.findMany(req.user, {
      modelName: modelNameParam,
      onlyPinned,
      includeSystem,
      page,
      limit
    });

    return res.json({
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        pages: result.pages
      }
    });
  } catch (error) {
    // Translate repository errors into HTTP responses.
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ success: false, error: message });
  }
}
