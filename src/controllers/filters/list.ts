import { resolveModelContext } from "../../lib/filters/utils/modelResolver";
import { buildModelPermissionToken, ensureAuth, getQueryStringValue, normalizePositiveInt, parseBoolean } from "./helpers";

export default async function list(req: ReqType, res: ResType) {
  const token = buildModelPermissionToken(req.adminizer, "FilterAP", "read");
  if (!ensureAuth(req, res, token)) {
    return res;
  }

  const { repository, config } = req.adminizer.filters;

  const modelNameParam = getQueryStringValue(req.query.modelName);
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
      resolveModelContext(req.adminizer, modelNameParam, req.user, "list");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return res.status(403).json({
        success: false,
        error: message
      });
    }
  }

  const page = normalizePositiveInt(req.query.page, 1);
  const limit = normalizePositiveInt(req.query.limit, 50, 100);
  const onlyPinned = parseBoolean(req.query.pinned) === true;
  const includeSystem = parseBoolean(req.query.includeSystem) === true;

  try {
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
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ success: false, error: message });
  }
}
