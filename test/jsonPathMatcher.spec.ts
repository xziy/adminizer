import { beforeEach, describe, expect, it } from "vitest";
import { CustomConditionRegistry } from "../src/lib/query-builder/CustomConditionRegistry";
import { createJsonPathMatcher, registerJsonPathMatcher } from "../src/lib/query-builder/JsonPathMatcher";

describe("JsonPathMatcher", () => {
  beforeEach(() => {
    new CustomConditionRegistry().clear();
  });

  it("registers json-path matcher through registry facade", () => {
    registerJsonPathMatcher({
      handlerId: "Order.phoneNumber",
      jsonColumn: "phone",
      jsonPath: "number"
    });

    const registry = new CustomConditionRegistry();
    const handler = registry.get("Order.phoneNumber");

    expect(handler).toBeDefined();
    expect(handler?.operators).toContain("eq");
    expect(handler?.operators).toContain("ilike");
  });

  it("builds postgres sql condition with parameters", () => {
    const handler = createJsonPathMatcher({
      handlerId: "Order.metaCity",
      jsonColumn: "metadata",
      jsonPath: ["location", "city"]
    });

    const condition = handler.buildCondition({
      adapterType: "sequelize",
      operator: "eq",
      value: "Berlin"
    });

    expect(condition.rawSQL).toBe("metadata#>>'{location,city}' = ?");
    expect(condition.rawSQLParams).toEqual(["Berlin"]);
  });

  it("builds mysql sql condition for case-insensitive search", () => {
    const handler = createJsonPathMatcher({
      handlerId: "Order.metaCity",
      jsonColumn: "metadata",
      jsonPath: ["location", "city"]
    });

    const condition = handler.buildCondition({
      adapterType: "mysql",
      operator: "ilike",
      value: "ber"
    });

    expect(condition.rawSQL).toBe("LOWER(JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.location.city'))) LIKE LOWER(?)");
    expect(condition.rawSQLParams).toEqual(["%ber%"]);
  });

  it("falls back to in-memory predicate for non-sql adapters", () => {
    const handler = createJsonPathMatcher({
      handlerId: "Order.metaCity",
      jsonColumn: "metadata",
      jsonPath: ["location", "city"]
    });

    const condition = handler.buildCondition({
      adapterType: "waterline",
      operator: "eq",
      value: "Berlin"
    });

    expect(condition.rawSQL).toBeUndefined();
    expect(condition.inMemory?.({ metadata: { location: { city: "Berlin" } } })).toBe(true);
    expect(condition.inMemory?.({ metadata: { location: { city: "Prague" } } })).toBe(false);
  });

  it("validates operator and value type", () => {
    const handler = createJsonPathMatcher({
      handlerId: "Order.metaCity",
      jsonColumn: "metadata",
      jsonPath: ["location", "city"]
    });

    const invalidOperator = handler.validate?.({
      adapterType: "sequelize",
      operator: "gt",
      value: 1
    } as never);

    const invalidValue = handler.validate?.({
      adapterType: "sequelize",
      operator: "eq",
      value: { city: "Berlin" }
    } as never);

    expect(invalidOperator?.valid).toBe(false);
    expect(invalidValue?.valid).toBe(false);
  });
});
