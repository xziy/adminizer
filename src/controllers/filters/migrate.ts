import { buildModelPermissionToken, ensureAuth } from "./helpers";
import { ForbiddenError } from "../../lib/filters/services/FilterAccessService";

export default async function migrate(req: ReqType, res: ResType) {
  const token = buildModelPermissionToken(req.adminizer, "FilterAP", "update");
  if (!ensureAuth(req, res, token)) {
    return res;
  }

  const { repository, access, migration } = req.adminizer.filters;
  const filterId = String(req.params.id ?? "");

  try {
    const filter = await repository.findByIdAsAdmin(filterId);
    if (!filter) {
      return res.status(404).json({ success: false, error: "Filter not found" });
    }

    access.assertCanEdit(filter, req.user);

    const validation = migration.validate(filter);
    if (!validation.needsMigration) {
      return res.json({
        success: true,
        data: filter,
        validation,
        migrated: false
      });
    }

    const migrated = migration.migrate(filter);
    const migratedValidation = migration.validate(migrated);

    if (!migratedValidation.valid) {
      return res.status(400).json({
        success: false,
        error: "Filter cannot be migrated automatically",
        validation: migratedValidation
      });
    }

    const updated = await repository.update(
      filterId,
      {
        conditions: migratedValidation.sanitizedConditions ?? migrated.conditions,
        version: migrated.version
      },
      undefined,
      req.user
    );

    return res.json({
      success: true,
      data: updated ?? migrated,
      validation: migratedValidation,
      migrated: true
    });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return res.status(403).json({ success: false, error: error.message });
    }
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ success: false, error: message });
  }
}
