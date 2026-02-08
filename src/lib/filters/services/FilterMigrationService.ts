import { FilterAP, FilterCondition, FilterOperator } from "../../../models/FilterAP";
import { UserAP } from "../../../models/UserAP";
import { Adminizer } from "../../Adminizer";
import { ConditionValidator } from "../validators/ConditionValidator";

type LegacyFilterCondition = Omit<FilterCondition, "operator" | "children"> & {
  operator?: string;
  children?: LegacyFilterCondition[];
};

export type FilterValidationSummary = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  needsMigration: boolean;
  version: number;
  sanitizedConditions?: FilterCondition[];
};

export const FILTER_FORMAT_VERSION = 1;

const DEPRECATED_OPERATOR_MAP: Record<string, FilterOperator> = {
  old_like: "like",
  legacy_in: "in"
};

const mapDeprecatedOperator = (operator?: string): string | undefined => {
  if (!operator) {
    return operator;
  }
  return DEPRECATED_OPERATOR_MAP[operator] ?? operator;
};

const migrateConditionOperators = (
  conditions: LegacyFilterCondition[]
): FilterCondition[] => {
  return conditions.map((condition) => {
    if (Array.isArray(condition.children)) {
      return {
        ...condition,
        children: migrateConditionOperators(condition.children)
      } as FilterCondition;
    }

    return {
      ...condition,
      operator: mapDeprecatedOperator(condition.operator) as FilterOperator
    } as FilterCondition;
  });
};

export const FILTER_VERSION_MIGRATIONS: Record<
  number,
  (filter: Partial<FilterAP>) => Partial<FilterAP>
> = {
  0: (filter) => ({
    ...filter,
    conditions: migrateConditionOperators(
      Array.isArray(filter.conditions)
        ? (filter.conditions as LegacyFilterCondition[])
        : []
    )
  })
};

export class FilterMigrationService {
  constructor(
    private readonly adminizer: Adminizer,
    private readonly validator: ConditionValidator
  ) {}

  public validate(filter: Partial<FilterAP>): FilterValidationSummary {
    const errors: string[] = [];
    const warnings: string[] = [];

    const version = this.normalizeVersion(filter.version);
    const deprecatedOperators = this.findDeprecatedOperators(filter.conditions);

    if (version < FILTER_FORMAT_VERSION) {
      warnings.push(
        `Outdated filter format version ${version} (current: ${FILTER_FORMAT_VERSION})`
      );
    } else if (version > FILTER_FORMAT_VERSION) {
      warnings.push(
        `Filter format version ${version} is newer than supported ${FILTER_FORMAT_VERSION}`
      );
    }

    if (deprecatedOperators.length > 0) {
      warnings.push(`Deprecated operators: ${deprecatedOperators.join(", ")}`);
    }

    if (!filter.modelName) {
      errors.push("modelName is required");
      return {
        valid: false,
        errors,
        warnings,
        needsMigration: version < FILTER_FORMAT_VERSION || deprecatedOperators.length > 0,
        version
      };
    }

    if (filter.conditions && !Array.isArray(filter.conditions)) {
      errors.push("conditions must be an array");
    }

    const normalizedConditions =
      deprecatedOperators.length > 0
        ? migrateConditionOperators(
            Array.isArray(filter.conditions)
              ? (filter.conditions as LegacyFilterCondition[])
              : []
          )
        : (Array.isArray(filter.conditions)
            ? (filter.conditions as FilterCondition[])
            : []);

    const validation = this.validator.validate(
      normalizedConditions,
      String(filter.modelName),
      this.createSystemUser()
    );

    if (!validation.valid) {
      validation.errors.forEach((error) => {
        const message = error.path ? `${error.path}: ${error.message}` : error.message;
        errors.push(message);
      });
    }

    if (validation.warnings.length > 0) {
      warnings.push(...validation.warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      needsMigration: version < FILTER_FORMAT_VERSION || deprecatedOperators.length > 0,
      version,
      sanitizedConditions: validation.sanitizedConditions
    };
  }

  public migrate(filter: Partial<FilterAP>): Partial<FilterAP> {
    const version = this.normalizeVersion(filter.version);

    let migrated: Partial<FilterAP> = {
      ...filter,
      conditions: Array.isArray(filter.conditions) ? filter.conditions : []
    };

    for (let current = version; current < FILTER_FORMAT_VERSION; current += 1) {
      const migration = FILTER_VERSION_MIGRATIONS[current];
      if (migration) {
        migrated = migration(migrated);
      }
    }

    migrated = {
      ...migrated,
      conditions: migrateConditionOperators(
        Array.isArray(migrated.conditions)
          ? (migrated.conditions as LegacyFilterCondition[])
          : []
      ),
      version: FILTER_FORMAT_VERSION
    };

    return migrated;
  }

  private findDeprecatedOperators(conditions: unknown): string[] {
    const deprecated = new Set<string>();

    const walk = (conditionList: LegacyFilterCondition[]) => {
      conditionList.forEach((condition) => {
        if (Array.isArray(condition.children)) {
          walk(condition.children);
          return;
        }
        if (condition.operator && DEPRECATED_OPERATOR_MAP[condition.operator]) {
          deprecated.add(condition.operator);
        }
      });
    };

    if (Array.isArray(conditions)) {
      walk(conditions as LegacyFilterCondition[]);
    }

    return Array.from(deprecated);
  }

  private normalizeVersion(version?: number): number {
    if (!Number.isFinite(version)) {
      return 0;
    }
    return Math.max(0, Math.floor(version ?? 0));
  }

  private createSystemUser(): UserAP {
    return {
      id: 0,
      login: "system",
      fullName: "System",
      isAdministrator: true,
      groups: []
    };
  }
}
