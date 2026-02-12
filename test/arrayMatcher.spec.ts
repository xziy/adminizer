import { beforeEach, describe, expect, it } from "vitest";
import { CustomConditionRegistry } from "../src/lib/query-builder/CustomConditionRegistry";
import {
  createArrayMatcher,
  registerArrayContainsAllMatcher,
  registerArrayContainsMatcher,
  registerArrayOverlapsMatcher
} from "../src/lib/query-builder/ArrayMatcher";

describe("ArrayMatcher", () => {
  beforeEach(() => {
    new CustomConditionRegistry().clear();
  });

  it("registers contains/overlaps/contains-all matchers", () => {
    registerArrayContainsMatcher({ handlerId: "Post.tagsContains", fieldName: "tags" });
    registerArrayOverlapsMatcher({ handlerId: "Post.tagsOverlap", fieldName: "tags" });
    registerArrayContainsAllMatcher({ handlerId: "Post.tagsAll", fieldName: "tags" });

    const registry = new CustomConditionRegistry();
    expect(registry.get("Post.tagsContains")).toBeDefined();
    expect(registry.get("Post.tagsOverlap")).toBeDefined();
    expect(registry.get("Post.tagsAll")).toBeDefined();
  });

  it("builds waterline criteria for contains mode", () => {
    const matcher = createArrayMatcher({
      handlerId: "Post.tagsContains",
      fieldName: "tags",
      mode: "contains"
    });

    const condition = matcher.buildCondition({
      adapterType: "waterline",
      operator: "eq",
      value: { value: "news" }
    });

    expect(condition.criteria).toEqual({ tags: { contains: "news" } });
    expect(condition.inMemory?.({ tags: ["news", "tech"] })).toBe(true);
    expect(condition.inMemory?.({ tags: ["tech"] })).toBe(false);
  });

  it("builds overlap and contains-all predicates for waterline", () => {
    const overlapMatcher = createArrayMatcher({
      handlerId: "Post.tagsOverlap",
      fieldName: "tags",
      mode: "overlaps"
    });
    const containsAllMatcher = createArrayMatcher({
      handlerId: "Post.tagsAll",
      fieldName: "tags",
      mode: "containsAll"
    });

    const overlapCondition = overlapMatcher.buildCondition({
      adapterType: "waterline",
      operator: "eq",
      value: { values: ["news", "ops"] }
    });
    const containsAllCondition = containsAllMatcher.buildCondition({
      adapterType: "waterline",
      operator: "eq",
      value: { values: ["news", "tech"] }
    });

    expect(overlapCondition.criteria).toEqual({
      or: [{ tags: { contains: "news" } }, { tags: { contains: "ops" } }]
    });
    expect(containsAllCondition.criteria).toEqual({
      and: [{ tags: { contains: "news" } }, { tags: { contains: "tech" } }]
    });
    expect(overlapCondition.inMemory?.({ tags: ["ops"] })).toBe(true);
    expect(containsAllCondition.inMemory?.({ tags: ["news", "tech", "dev"] })).toBe(true);
    expect(containsAllCondition.inMemory?.({ tags: ["news"] })).toBe(false);
  });

  it("falls back to in-memory mode for non-waterline adapters", () => {
    const matcher = createArrayMatcher({
      handlerId: "Post.tagsContains",
      fieldName: "tags",
      mode: "contains"
    });

    const condition = matcher.buildCondition({
      adapterType: "sequelize",
      operator: "eq",
      value: { value: "news" }
    });

    expect(condition.criteria).toBeUndefined();
    expect(condition.inMemory?.({ tags: ["news"] })).toBe(true);
    expect(condition.inMemory?.({ tags: ["ops"] })).toBe(false);
  });

  it("validates payload shape and limits", () => {
    const matcher = createArrayMatcher({
      handlerId: "Post.tagsAll",
      fieldName: "tags",
      mode: "containsAll",
      maxValues: 2
    });

    const missingValues = matcher.validate?.({
      adapterType: "waterline",
      operator: "eq",
      value: {}
    } as never);
    const tooManyValues = matcher.validate?.({
      adapterType: "waterline",
      operator: "eq",
      value: { values: ["a", "b", "c"] }
    } as never);

    expect(missingValues?.valid).toBe(false);
    expect(tooManyValues?.valid).toBe(false);
  });
});
