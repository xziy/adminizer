import { beforeEach, describe, expect, it } from "vitest";
import { CustomConditionRegistry } from "../src/lib/query-builder/CustomConditionRegistry";
import { createFullTextMatcher, registerFullTextMatcher } from "../src/lib/query-builder/FullTextMatcher";

describe("FullTextMatcher", () => {
  beforeEach(() => {
    new CustomConditionRegistry().clear();
  });

  it("registers matcher through custom condition registry", () => {
    registerFullTextMatcher({
      handlerId: "Post.searchText",
      fields: ["title", "content"]
    });

    const registry = new CustomConditionRegistry();
    const handler = registry.get("Post.searchText");

    expect(handler).toBeDefined();
    expect(handler?.operators).toEqual(["eq", "like", "ilike"]);
  });

  it("builds postgres full-text sql for eq operator", () => {
    const handler = createFullTextMatcher({
      handlerId: "Post.searchText",
      fields: ["title", "content"]
    });

    const condition = handler.buildCondition({
      adapterType: "sequelize",
      operator: "eq",
      value: "react hooks"
    });

    expect(condition.rawSQL).toBe(
      "to_tsvector('simple', COALESCE(title, '') || ' ' || COALESCE(content, '')) @@ plainto_tsquery('simple', ?)"
    );
    expect(condition.rawSQLParams).toEqual(["react hooks"]);
  });

  it("builds mysql match-against sql for eq operator", () => {
    const handler = createFullTextMatcher({
      handlerId: "Post.searchText",
      fields: ["title", "content"],
      mysqlBooleanMode: true
    });

    const condition = handler.buildCondition({
      adapterType: "mysql",
      operator: "eq",
      value: "react hooks"
    });

    expect(condition.rawSQL).toBe("MATCH (title, content) AGAINST (? IN BOOLEAN MODE)");
    expect(condition.rawSQLParams).toEqual(["react hooks"]);
  });

  it("falls back to in-memory matching for non-sql adapters", () => {
    const handler = createFullTextMatcher({
      handlerId: "Post.searchText",
      fields: ["title", "content"]
    });

    const condition = handler.buildCondition({
      adapterType: "waterline",
      operator: "ilike",
      value: "react"
    });

    expect(condition.rawSQL).toBeUndefined();
    expect(condition.inMemory?.({ title: "React", content: "Hooks guide" })).toBe(true);
    expect(condition.inMemory?.({ title: "Vue", content: "Signals guide" })).toBe(false);
  });

  it("validates operator and query string", () => {
    const handler = createFullTextMatcher({
      handlerId: "Post.searchText",
      fields: ["title", "content"]
    });

    const invalidOperator = handler.validate?.({
      adapterType: "sequelize",
      operator: "gt",
      value: "search"
    } as never);

    const invalidValue = handler.validate?.({
      adapterType: "sequelize",
      operator: "eq",
      value: 123
    } as never);

    expect(invalidOperator?.valid).toBe(false);
    expect(invalidValue?.valid).toBe(false);
  });
});
