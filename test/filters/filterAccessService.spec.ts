import { describe, it, expect } from "vitest";
import { FilterAccessService, ForbiddenError } from "../../src/lib/filters/services/FilterAccessService";
import { FilterAP } from "../../src/models/FilterAP";
import { UserAP } from "../../src/models/UserAP";
import { performance } from "node:perf_hooks";

const buildUser = (overrides: Partial<UserAP> = {}): UserAP => ({
  id: 1,
  login: "user",
  fullName: "User",
  isAdministrator: false,
  groups: [{ id: 10, name: "group", description: "", tokens: [] }] as any,
  ...overrides
});

describe("FilterAccessService", () => {
  const adminizer = {} as any;
  const service = new FilterAccessService(adminizer);

  it("allows admins to view and edit", () => {
    const admin = buildUser({ id: 2, isAdministrator: true, login: "admin" });
    const filter = { id: "f1", visibility: "private", owner: 999 } as Partial<FilterAP>;

    expect(service.canView(filter, admin)).toBe(true);
    expect(service.canEdit(filter, admin)).toBe(true);
  });

  it("allows owners and public filters", () => {
    const user = buildUser({ id: 5 });
    const owned = { id: "f2", visibility: "private", owner: 5 } as Partial<FilterAP>;
    const publicFilter = { id: "f3", visibility: "public", owner: 123 } as Partial<FilterAP>;

    expect(service.canView(owned, user)).toBe(true);
    expect(service.canEdit(owned, user)).toBe(true);
    expect(service.canView(publicFilter, user)).toBe(true);
  });

  it("respects group visibility", () => {
    const user = buildUser({ id: 7, groups: [{ id: 42 } as any] });
    const filter = {
      id: "f4",
      visibility: "groups",
      groupIds: [41, 42]
    } as Partial<FilterAP>;

    expect(service.canView(filter, user)).toBe(true);
  });

  it("denies access when user has no rights", () => {
    const user = buildUser({ id: 9, groups: [] });
    const filter = { id: "f5", visibility: "private", owner: 11 } as Partial<FilterAP>;

    expect(service.canView(filter, user)).toBe(false);
    expect(() => service.assertCanView(filter, user)).toThrow(ForbiddenError);
  });

  it("allows raw SQL only for administrators", () => {
    const user = buildUser({ id: 3, isAdministrator: false });
    const admin = buildUser({ id: 4, isAdministrator: true });

    expect(service.canUseRawSQL(user)).toBe(false);
    expect(service.canUseRawSQL(admin)).toBe(true);
  });

  it("performs a single permission check in under 10ms", () => {
    const user = buildUser({ id: 5 });
    const filter = { id: "perf-single", visibility: "private", owner: 5 } as Partial<FilterAP>;

    const start = performance.now();
    const allowed = service.canView(filter, user);
    const durationMs = performance.now() - start;

    expect(allowed).toBe(true);
    expect(durationMs).toBeLessThan(10);
  });

  it("performs bulk permission checks in under 100ms", () => {
    const user = buildUser({ id: 10, groups: [{ id: 100 } as any] });
    const filter = {
      id: "perf-bulk",
      visibility: "groups",
      groupIds: [100]
    } as Partial<FilterAP>;

    const checks = 5000;
    const start = performance.now();
    let allowedCount = 0;
    for (let index = 0; index < checks; index += 1) {
      if (service.canView(filter, user)) {
        allowedCount += 1;
      }
    }
    const durationMs = performance.now() - start;

    expect(allowedCount).toBe(checks);
    expect(durationMs).toBeLessThan(100);
  });

  it("keeps cached permission checks under 1ms", () => {
    const user = buildUser({ id: 11, groups: [{ id: 200 } as any] });
    const filter = {
      id: "perf-cache",
      visibility: "groups",
      groupIds: [200]
    } as Partial<FilterAP>;

    expect(service.canView(filter, user)).toBe(true);

    const start = performance.now();
    const cachedResult = service.canView(filter, user);
    const durationMs = performance.now() - start;

    expect(cachedResult).toBe(true);
    expect(durationMs).toBeLessThan(1);
  });
});
