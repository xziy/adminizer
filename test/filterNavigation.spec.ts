import { describe, expect, it } from "vitest";
import { FilterLinkGenerator } from "../src/lib/filter-navigation/FilterLinkGenerator";
import { FilterNavigationService } from "../src/lib/filter-navigation/FilterNavigationService";

describe("FilterLinkGenerator", () => {
  it("generates url with filter slug and normalized prefix", () => {
    const url = FilterLinkGenerator.generateUrl({
      routePrefix: "adminizer/",
      modelName: "users",
      filterId: "ignored-id",
      filterSlug: "active-users"
    });

    expect(url).toBe("/adminizer/model/users?filterSlug=active-users");
  });

  it("uses filter id when slug is absent", () => {
    const url = FilterLinkGenerator.generateUrl({
      routePrefix: "/panel",
      modelName: "posts",
      filterId: "123"
    });

    expect(url).toBe("/panel/model/posts?filterId=123");
  });

  it("throws when model name is missing", () => {
    expect(() =>
      FilterLinkGenerator.generateUrl({
        routePrefix: "/adminizer",
        filterId: "123"
      })
    ).toThrow("modelName is required");
  });
});

describe("FilterNavigationService helpers", () => {
  const service = new FilterNavigationService({} as never);

  it("returns default icon when value is empty", () => {
    expect(service.resolveIcon(undefined)).toBe("filter_alt");
    expect(service.resolveIcon("   ")).toBe("filter_alt");
    expect(service.resolveIcon("bookmark")).toBe("bookmark");
  });

  it("normalizes badge count for invalid and negative values", () => {
    expect(service.calculateBadgeCount(undefined)).toBe(0);
    expect(service.calculateBadgeCount(null)).toBe(0);
    expect(service.calculateBadgeCount(Number.NaN)).toBe(0);
    expect(service.calculateBadgeCount(-10)).toBe(0);
    expect(service.calculateBadgeCount(15.9)).toBe(15);
  });
});
