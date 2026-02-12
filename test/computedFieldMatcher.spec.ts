import { beforeEach, describe, expect, it } from "vitest";
import { CustomConditionRegistry } from "../src/lib/query-builder/CustomConditionRegistry";
import {
  createComputedFieldMatcher,
  filterByComputedField,
  registerComputedFieldMatcher
} from "../src/lib/query-builder/ComputedFieldMatcher";

describe("ComputedFieldMatcher", () => {
  beforeEach(() => {
    new CustomConditionRegistry().clear();
  });

  it("registers matcher via registry facade", () => {
    registerComputedFieldMatcher({
      handlerId: "User.computedAge",
      computedField: "computedAge",
      compute: (record) => {
        const birthYear = Number(record.birthYear);
        return Number.isFinite(birthYear) ? 2026 - birthYear : null;
      }
    });

    const registry = new CustomConditionRegistry();
    expect(registry.get("User.computedAge")).toBeDefined();
  });

  it("builds in-memory predicate based on computed value", () => {
    const matcher = createComputedFieldMatcher({
      handlerId: "User.computedAge",
      computedField: "computedAge",
      compute: (record) => {
        const birthYear = Number(record.birthYear);
        return Number.isFinite(birthYear) ? 2026 - birthYear : null;
      }
    });

    const condition = matcher.buildCondition({
      adapterType: "sequelize",
      operator: "eq",
      value: { operator: ">", targetValue: 18 }
    });

    expect(condition.rawSQL).toBeUndefined();
    expect(condition.inMemory?.({ birthYear: 2000 })).toBe(true);
    expect(condition.inMemory?.({ birthYear: 2012 })).toBe(false);
  });

  it("respects allowed comparison operators", () => {
    const matcher = createComputedFieldMatcher({
      handlerId: "User.computedAge",
      computedField: "computedAge",
      compute: (record) => Number(record.birthYear),
      allowedOperators: [">", "<="]
    });

    const blocked = matcher.validate?.({
      adapterType: "waterline",
      operator: "eq",
      value: { operator: "!=", targetValue: 18 }
    } as never);

    expect(blocked?.valid).toBe(false);
  });

  it("validates computed payload", () => {
    const matcher = createComputedFieldMatcher({
      handlerId: "User.computedAge",
      computedField: "computedAge",
      compute: (record) => Number(record.birthYear)
    });

    const invalidMissingTarget = matcher.validate?.({
      adapterType: "sequelize",
      operator: "eq",
      value: { operator: ">" }
    } as never);
    const invalidOperator = matcher.validate?.({
      adapterType: "sequelize",
      operator: "eq",
      value: { operator: "contains", targetValue: 1 }
    } as never);

    expect(invalidMissingTarget?.valid).toBe(false);
    expect(invalidOperator?.valid).toBe(false);
  });

  it("filters record arrays using helper utility", () => {
    const records = [
      { id: 1, birthYear: 1990 },
      { id: 2, birthYear: 2010 },
      { id: 3, birthYear: 2001 }
    ];

    const filtered = filterByComputedField(
      records as Array<Record<string, unknown>>,
      (record) => {
        const birthYear = Number(record.birthYear);
        return 2026 - birthYear;
      },
      ">=",
      18
    );

    expect(filtered.map((record) => record.id)).toEqual([1, 3]);
  });
});
