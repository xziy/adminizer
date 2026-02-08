import { FilterCondition } from "../../models/FilterAP";
import { buildModelPermissionToken, ensureAuth } from "./helpers";
import { ForbiddenError } from "../../lib/filters/services/FilterAccessService";

export default async function update(req: ReqType, res: ResType) {
  const token = buildModelPermissionToken(req.adminizer, "FilterAP", "update");
  if (!ensureAuth(req, res, token)) {
    return res;
  }

  const { config, repository, access, validator } = req.adminizer.filters;
  const filterId = String(req.params.id ?? "");

  try {
    const existing = await repository.findByIdAsAdmin(filterId);
    if (!existing) {
      return res.status(404).json({ success: false, error: "Filter not found" });
    }

    access.assertCanEdit(existing, req.user);

    const payload = req.body ?? {};
    const nextModelName =
      typeof payload.modelName === "string" && payload.modelName.trim().length > 0
        ? payload.modelName.trim()
        : String(existing.modelName ?? "");

    if (nextModelName && !config.isFiltersEnabledForModel(nextModelName)) {
      return res.status(403).json({
        success: false,
        error: `Filters are disabled for model ${nextModelName}`,
        filtersEnabled: false
      });
    }

    const conditionsInput = payload.conditions ?? existing.conditions ?? [];
    const validation = validator.validate(conditionsInput as FilterCondition[], nextModelName, req.user);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: "Invalid filter conditions",
        validation
      });
    }

    const updated = await repository.update(
      filterId,
      {
        name: payload.name,
        description: payload.description,
        modelName: nextModelName,
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
        version: payload.version,
        slug: payload.slug
      },
      payload.columns,
      req.user
    );

    if (!updated) {
      return res.status(404).json({ success: false, error: "Filter not found" });
    }

    return res.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return res.status(403).json({ success: false, error: error.message });
    }
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ success: false, error: message });
  }
}
