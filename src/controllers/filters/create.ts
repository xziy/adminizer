Продолжай по плану
Продолжай по плану
Продолжай по плану
Продолжай по плану
Продолжай по плану
Продолжай по плану
Продолжай по плану
Продолжай по плану
import { FilterCondition } from "../../models/FilterAP";
import { buildModelPermissionToken, ensureAuth } from "./helpers";

export default async function create(req: ReqType, res: ResType) {
  const token = buildModelPermissionToken(req.adminizer, "FilterAP", "create");
  if (!ensureAuth(req, res, token)) {
    return res;
  }

  const { config, repository, validator } = req.adminizer.filters;
  const payload = req.body ?? {};

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const modelName = typeof payload.modelName === "string" ? payload.modelName.trim() : "";

  if (!name || !modelName) {
    return res.status(400).json({
      success: false,
      error: "name and modelName are required"
    });
  }

  if (!config.isFiltersEnabledForModel(modelName)) {
    return res.status(403).json({
      success: false,
      error: `Filters are disabled for model ${modelName}`,
      filtersEnabled: false
    });
  }

  const conditionsInput = payload.conditions ?? [];
  const validation = validator.validate(conditionsInput as FilterCondition[], modelName, req.user);

  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: "Invalid filter conditions",
      validation
    });
  }

  try {
    const filter = await repository.create(
      {
        name,
        description: payload.description,
        modelName,
        conditions: validation.sanitizedConditions ?? [],
        sortField: payload.sortField,
        sortDirection: payload.sortDirection,
        visibility: payload.visibility,
        groupIds: payload.groupIds,
        apiEnabled: payload.apiEnabled,
        apiKey: payload.apiKey,
        icon: payload.icon,
        color: payload.color,
        isPinned: payload.isPinned,
        isSystemFilter: payload.isSystemFilter,
        schemaVersion: payload.schemaVersion,
        slug: payload.slug
      },
      payload.columns,
      req.user
    );

    return res.status(201).json({
      success: true,
      data: filter
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ success: false, error: message });
  }
}
