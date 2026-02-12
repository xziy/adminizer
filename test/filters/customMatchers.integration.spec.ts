import { beforeEach, describe, expect, it, vi } from "vitest";
import { ModernQueryBuilder } from "../../src/lib/query-builder/ModernQueryBuilder";
import type { Fields } from "../../src/helpers/fieldsHelper";
import type { DataAccessor } from "../../src/lib/DataAccessor";
import type { AbstractModel } from "../../src/lib/model/AbstractModel";
import { CustomFieldHandler } from "../../src/lib/query-builder/CustomFieldHandler";
import { registerJsonPathMatcher } from "../../src/lib/query-builder/JsonPathMatcher";
import { registerFullTextMatcher } from "../../src/lib/query-builder/FullTextMatcher";
import { registerGeospatialRadiusMatcher } from "../../src/lib/query-builder/GeospatialMatcher";
import { registerArrayOverlapsMatcher } from "../../src/lib/query-builder/ArrayMatcher";
import { registerComputedFieldMatcher } from "../../src/lib/query-builder/ComputedFieldMatcher";

const records = [
  {
    id: "1",
    title: "React hooks guide",
    content: "Practical hooks and forms",
    metadata: { location: { city: "Berlin" } },
    lat: 40.7128,
    lng: -74.006,
    tags: ["react", "frontend"],
    birthYear: 1990
  },
  {
    id: "2",
    title: "Node security basics",
    content: "Defense in depth and auth",
    metadata: { location: { city: "Prague" } },
    lat: 40.755,
    lng: -74.0,
    tags: ["security", "backend"],
    birthYear: 2010
  },
  {
    id: "3",
    title: "Rust systems",
    content: "Ownership and performance",
    metadata: { location: { city: "Vienna" } },
    lat: 41.4,
    lng: -74.2,
    tags: ["systems", "ops"],
    birthYear: 1985
  }
];

const buildFields = (): Fields => ({
  title: { config: { title: "Title", type: "string" }, model: { type: "string" }, populated: undefined, modelConfig: {} as never },
  content: { config: { title: "Content", type: "string" }, model: { type: "string" }, populated: undefined, modelConfig: {} as never },
  metadata: { config: { title: "Metadata", type: "json" }, model: { type: "json" }, populated: undefined, modelConfig: {} as never },
  lat: { config: { title: "Latitude", type: "number" }, model: { type: "number" }, populated: undefined, modelConfig: {} as never },
  lng: { config: { title: "Longitude", type: "number" }, model: { type: "number" }, populated: undefined, modelConfig: {} as never },
  tags: { config: { title: "Tags", type: "json" }, model: { type: "json" }, populated: undefined, modelConfig: {} as never },
  birthYear: { config: { title: "Birth Year", type: "number" }, model: { type: "number" }, populated: undefined, modelConfig: {} as never }
});

const buildDataAccessor = (adapter = "waterline"): DataAccessor =>
  ({
    entity: { config: { adapter } },
    adminizer: { config: { system: { defaultORM: adapter } }, ormAdapters: [] }
  }) as unknown as DataAccessor;

const buildModel = (): AbstractModel<Record<string, unknown>> =>
  ({
    primaryKey: "id",
    find: vi.fn().mockResolvedValue(records),
    count: vi.fn().mockResolvedValue(records.length)
  }) as unknown as AbstractModel<Record<string, unknown>>;

describe("Custom matchers integration", () => {
  beforeEach(() => {
    CustomFieldHandler.clear();
  });

  it("filters by JSON path matcher", async () => {
    registerJsonPathMatcher({
      handlerId: "Post.metaCity",
      jsonColumn: "metadata",
      jsonPath: ["location", "city"]
    });

    const result = await new ModernQueryBuilder(buildModel(), buildFields(), buildDataAccessor("waterline")).execute({
      page: 1,
      limit: 20,
      filters: [{ id: "1", field: "metadata", operator: "eq", value: "Berlin", customHandler: "Post.metaCity" }]
    });

    expect(result.filtered).toBe(1);
    expect(result.data[0].id).toBe("1");
  });

  it("filters by full-text matcher", async () => {
    registerFullTextMatcher({
      handlerId: "Post.searchText",
      fields: ["title", "content"]
    });

    const result = await new ModernQueryBuilder(buildModel(), buildFields(), buildDataAccessor("memory")).execute({
      page: 1,
      limit: 20,
      filters: [{ id: "1", field: "title", operator: "eq", value: "hooks", customHandler: "Post.searchText" }]
    });

    expect(result.filtered).toBe(1);
    expect(result.data[0].id).toBe("1");
  });

  it("filters by geospatial radius matcher", async () => {
    registerGeospatialRadiusMatcher({
      handlerId: "Post.nearPoint",
      latField: "lat",
      lngField: "lng"
    });

    const result = await new ModernQueryBuilder(buildModel(), buildFields(), buildDataAccessor("memory")).execute({
      page: 1,
      limit: 20,
      filters: [
        {
          id: "1",
          field: "lat",
          operator: "eq",
          value: { lat: 40.7128, lng: -74.006, radiusKm: 10 },
          customHandler: "Post.nearPoint"
        }
      ]
    });

    expect(result.filtered).toBe(2);
    expect(result.data.map((row) => row.id)).toEqual(["1", "2"]);
  });

  it("filters by array overlaps matcher", async () => {
    registerArrayOverlapsMatcher({
      handlerId: "Post.tagsOverlap",
      fieldName: "tags"
    });

    const result = await new ModernQueryBuilder(buildModel(), buildFields(), buildDataAccessor("memory")).execute({
      page: 1,
      limit: 20,
      filters: [
        {
          id: "1",
          field: "tags",
          operator: "eq",
          value: { values: ["security", "ops"] },
          customHandler: "Post.tagsOverlap"
        }
      ]
    });

    expect(result.filtered).toBe(2);
    expect(result.data.map((row) => row.id)).toEqual(["2", "3"]);
  });

  it("filters by computed field matcher", async () => {
    registerComputedFieldMatcher({
      handlerId: "User.computedAge",
      computedField: "computedAge",
      compute: (record) => 2026 - Number(record.birthYear)
    });

    const result = await new ModernQueryBuilder(buildModel(), buildFields(), buildDataAccessor()).execute({
      page: 1,
      limit: 20,
      filters: [
        {
          id: "1",
          field: "birthYear",
          operator: "eq",
          value: { operator: ">=", targetValue: 30 },
          customHandler: "User.computedAge"
        }
      ]
    });

    expect(result.filtered).toBe(2);
    expect(result.data.map((row) => row.id)).toEqual(["1", "3"]);
  });
});
