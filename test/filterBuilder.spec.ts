import { describe, expect, it } from "vitest";
import { CriteriaBuilder } from "../src/lib/filter-builder/CriteriaBuilder";
import { FilterBuilder } from "../src/lib/filter-builder/FilterBuilder";

// Verify fluent criteria API generates expected operators and logic links.
describe("CriteriaBuilder", () => {
  it("builds conditions with proper operators and logic", () => {
    const conditions = new CriteriaBuilder()
      .where("status", "active")
      .whereGt("total", 100)
      .orWhere("priority", "eq", "high")
      .notWhere("archived", "eq", true)
      .build();

    expect(conditions).toHaveLength(4);
    expect(conditions[0]).toMatchObject({ field: "status", operator: "eq", logic: "AND" });
    expect(conditions[1]).toMatchObject({ field: "total", operator: "gt", logic: "AND" });
    expect(conditions[2]).toMatchObject({ field: "priority", operator: "eq", logic: "OR" });
    expect(conditions[3]).toMatchObject({ field: "archived", operator: "eq", logic: "NOT" });
    expect(conditions.every((item) => item.id.length > 0)).toBe(true);
  });

  it("supports range and null operators", () => {
    const conditions = new CriteriaBuilder()
      .whereBetween("createdAt", "2026-01-01", "2026-12-31")
      .whereNull("deletedAt")
      .whereNotNull("updatedAt")
      .build();

    expect(conditions[0]).toMatchObject({ operator: "between", value: ["2026-01-01", "2026-12-31"] });
    expect(conditions[1]).toMatchObject({ operator: "isNull", value: null });
    expect(conditions[2]).toMatchObject({ operator: "isNotNull", value: null });
  });
});

// Verify filter draft builder composes metadata and criteria payload.
describe("FilterBuilder", () => {
  it("creates a filter draft from fluent chain", () => {
    const criteria = new CriteriaBuilder().where("status", "active").whereIn("country", ["US", "DE"]);

    const draft = FilterBuilder.create("Active customers", "Customer")
      .withDescription("Only active customers in key regions")
      .withCriteria(criteria)
      .withSort("createdAt", "DESC")
      .withVisibility("public")
      .selectFields(["id", "name", " email "])
      .withAppearance("groups", "#0EA5E9")
      .withPinned()
      .withSystemFlag(false)
      .build();

    expect(draft).toMatchObject({
      name: "Active customers",
      modelName: "Customer",
      description: "Only active customers in key regions",
      sortField: "createdAt",
      sortDirection: "DESC",
      visibility: "public",
      icon: "groups",
      color: "#0EA5E9",
      isPinned: true,
      isSystemFilter: false,
      selectedFields: ["id", "name", "email"]
    });
    expect(draft.conditions).toHaveLength(2);
  });
});
