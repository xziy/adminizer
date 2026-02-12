import { describe, expect, it } from "vitest";
import { CriteriaBuilder } from "../src/lib/filter-builder/CriteriaBuilder";
import { FilterBuilder } from "../src/lib/filter-builder/FilterBuilder";
import { FilterRegistry } from "../src/lib/filter-builder/FilterRegistry";
import { FilterPresets } from "../src/lib/filter-builder/FilterPresets";
import { FilterMigration } from "../src/lib/filter-builder/FilterMigration";

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

// Verify registry can store and create immutable draft presets by key.
describe("FilterRegistry", () => {
  it("registers factories and creates drafts", () => {
    const registry = new FilterRegistry();
    registry.register("active-users", () =>
      FilterBuilder.create("Active users", "User")
        .withConditions([
          {
            id: "status-active",
            field: "status",
            operator: "eq",
            value: "active",
            logic: "AND"
          }
        ])
        .build()
    );

    const draft = registry.create("active-users");

    expect(registry.has("active-users")).toBe(true);
    expect(registry.keys()).toEqual(["active-users"]);
    expect(draft).toMatchObject({
      name: "Active users",
      modelName: "User"
    });
    expect(draft.conditions).toHaveLength(1);
  });

  it("rejects duplicate keys without overwrite and allows overwrite when enabled", () => {
    const registry = new FilterRegistry();

    registry.register("preset", () => FilterBuilder.create("First", "User").build());
    expect(() =>
      registry.register("preset", () => FilterBuilder.create("Second", "User").build())
    ).toThrowError("already registered");

    registry.register("preset", () => FilterBuilder.create("Second", "User").build(), {
      overwrite: true
    });

    const draft = registry.create("preset");
    expect(draft.name).toBe("Second");
  });
});

// Verify built-in and custom presets can be resolved into filter drafts.
describe("FilterPresets", () => {
  it("provides default preset and allows custom preset registration", () => {
    const presets = new FilterPresets();

    expect(presets.has("active-records")).toBe(true);
    expect(presets.names()).toContain("active-records");

    presets.register("recent-orders", () =>
      FilterBuilder.create("Recent orders", "Order")
        .withSort("createdAt", "DESC")
        .build()
    );

    const draft = presets.apply("recent-orders");
    expect(draft).toMatchObject({
      name: "Recent orders",
      modelName: "Order",
      sortField: "createdAt",
      sortDirection: "DESC"
    });
  });
});

// Verify migration pipeline applies incremental steps for draft evolution.
describe("FilterMigration", () => {
  it("migrates draft through sequential version steps", () => {
    const migration = new FilterMigration();

    migration.register(1, (draft) => ({
      ...draft,
      description: draft.description ?? "Migrated to v2"
    }));
    migration.register(2, (draft) => ({
      ...draft,
      selectedFields: draft.selectedFields ?? ["id", "name"]
    }));

    const source = FilterBuilder.create("Customers", "Customer").build();
    const result = migration.migrate(source, 1, 3);

    expect(result.description).toBe("Migrated to v2");
    expect(result.selectedFields).toEqual(["id", "name"]);
    expect(migration.latestVersion()).toBe(3);
  });

  it("throws when migration step is missing", () => {
    const migration = new FilterMigration();
    const source = FilterBuilder.create("Customers", "Customer").build();

    expect(() => migration.migrate(source, 1, 2)).toThrowError("not registered");
  });
});
