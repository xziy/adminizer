import { beforeEach, describe, expect, it } from "vitest";
import { CustomConditionRegistry } from "../src/lib/query-builder/CustomConditionRegistry";
import {
  createGeospatialPolygonMatcher,
  createGeospatialRadiusMatcher,
  registerGeospatialPolygonMatcher,
  registerGeospatialRadiusMatcher
} from "../src/lib/query-builder/GeospatialMatcher";

describe("GeospatialMatcher", () => {
  beforeEach(() => {
    new CustomConditionRegistry().clear();
  });

  it("registers radius and polygon matchers", () => {
    registerGeospatialRadiusMatcher({
      handlerId: "Place.nearby",
      latField: "lat",
      lngField: "lng"
    });
    registerGeospatialPolygonMatcher({
      handlerId: "Place.inArea",
      latField: "lat",
      lngField: "lng"
    });

    const registry = new CustomConditionRegistry();
    expect(registry.get("Place.nearby")).toBeDefined();
    expect(registry.get("Place.inArea")).toBeDefined();
  });

  it("builds radius sql with haversine expression", () => {
    const matcher = createGeospatialRadiusMatcher({
      handlerId: "Place.nearby",
      latField: "lat",
      lngField: "lng"
    });

    const condition = matcher.buildCondition({
      adapterType: "sequelize",
      operator: "eq",
      value: { lat: 40.7128, lng: -74.006, radiusKm: 5 }
    });

    expect(condition.rawSQL).toContain("acos");
    expect(condition.rawSQLParams).toEqual([40.7128, -74.006, 40.7128, 5]);
  });

  it("applies in-memory radius filtering", () => {
    const matcher = createGeospatialRadiusMatcher({
      handlerId: "Place.nearby",
      latField: "lat",
      lngField: "lng"
    });

    const condition = matcher.buildCondition({
      adapterType: "waterline",
      operator: "eq",
      value: { lat: 40.7128, lng: -74.006, radiusKm: 5 }
    });

    expect(condition.rawSQL).toBeUndefined();
    expect(condition.inMemory?.({ lat: 40.713, lng: -74.0 })).toBe(true);
    expect(condition.inMemory?.({ lat: 40.9, lng: -74.0 })).toBe(false);
  });

  it("builds polygon bounding sql and in-memory fallback", () => {
    const matcher = createGeospatialPolygonMatcher({
      handlerId: "Place.inArea",
      latField: "lat",
      lngField: "lng"
    });

    const polygon = {
      points: [
        { lat: 40, lng: -75 },
        { lat: 41, lng: -75 },
        { lat: 41, lng: -73 },
        { lat: 40, lng: -73 }
      ]
    };

    const sqlCondition = matcher.buildCondition({
      adapterType: "sequelize",
      operator: "eq",
      value: polygon
    });
    const memoryCondition = matcher.buildCondition({
      adapterType: "waterline",
      operator: "eq",
      value: polygon
    });

    expect(sqlCondition.rawSQL).toBe("lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?");
    expect(sqlCondition.rawSQLParams).toEqual([40, 41, -75, -73]);
    expect(memoryCondition.inMemory?.({ lat: 40.5, lng: -74 })).toBe(true);
    expect(memoryCondition.inMemory?.({ lat: 42, lng: -74 })).toBe(false);
  });

  it("validates geospatial input payload", () => {
    const radiusMatcher = createGeospatialRadiusMatcher({
      handlerId: "Place.nearby",
      latField: "lat",
      lngField: "lng",
      maxRadiusKm: 100
    });
    const polygonMatcher = createGeospatialPolygonMatcher({
      handlerId: "Place.inArea",
      latField: "lat",
      lngField: "lng"
    });

    const invalidRadius = radiusMatcher.validate?.({
      adapterType: "sequelize",
      operator: "eq",
      value: { lat: 40.7, lng: -74.0, radiusKm: 500 }
    } as never);

    const invalidPolygon = polygonMatcher.validate?.({
      adapterType: "sequelize",
      operator: "eq",
      value: { points: [{ lat: 1, lng: 2 }, { lat: 2, lng: 3 }] }
    } as never);

    expect(invalidRadius?.valid).toBe(false);
    expect(invalidPolygon?.valid).toBe(false);
  });
});
