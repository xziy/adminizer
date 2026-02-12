import { ProgrammaticFilterDraft } from "./FilterBuilder";

export type FilterDraftMigration = (draft: ProgrammaticFilterDraft) => ProgrammaticFilterDraft;

/**
 * Handles version-to-version migration for programmatic filter drafts.
 * Migrations are registered as incremental steps (fromVersion -> next).
 */
export class FilterMigration {
  private readonly migrations = new Map<number, FilterDraftMigration>();

  /**
   * Registers migration step from current version to next version.
   * Example: register(1, migrateToV2).
   */
  public register(fromVersion: number, migration: FilterDraftMigration): this {
    const normalizedVersion = this.normalizeVersion(fromVersion);

    if (this.migrations.has(normalizedVersion)) {
      throw new Error(`Migration from version ${normalizedVersion} is already registered`);
    }

    this.migrations.set(normalizedVersion, migration);
    return this;
  }

  /**
   * Migrates draft from one version to target version.
   * Applies each intermediate migration sequentially.
   */
  public migrate(
    draft: ProgrammaticFilterDraft,
    fromVersion: number,
    toVersion: number
  ): ProgrammaticFilterDraft {
    let current = this.normalizeVersion(fromVersion);
    const target = this.normalizeVersion(toVersion);

    if (target < current) {
      throw new Error("Target version must be greater than or equal to source version");
    }

    let migrated = this.cloneDraft(draft);

    while (current < target) {
      const migration = this.migrations.get(current);
      if (!migration) {
        throw new Error(`Migration step ${current} -> ${current + 1} is not registered`);
      }
      migrated = this.cloneDraft(migration(migrated));
      current += 1;
    }

    return migrated;
  }

  /**
   * Returns the highest registered target version.
   * If no migrations exist, returns 1.
   */
  public latestVersion(): number {
    if (this.migrations.size === 0) {
      return 1;
    }
    return Math.max(...Array.from(this.migrations.keys())) + 1;
  }

  /**
   * Validates incoming version to avoid invalid map keys.
   * Versions must be positive integers.
   */
  private normalizeVersion(version: number): number {
    if (!Number.isInteger(version) || version < 1) {
      throw new Error("Version must be a positive integer");
    }
    return version;
  }

  /**
   * Clones draft arrays so migration steps stay immutable.
   * Primitive fields are copied with spread syntax.
   */
  private cloneDraft(draft: ProgrammaticFilterDraft): ProgrammaticFilterDraft {
    return {
      ...draft,
      conditions: draft.conditions?.map((condition) => ({ ...condition })),
      selectedFields: draft.selectedFields ? [...draft.selectedFields] : undefined
    };
  }
}
