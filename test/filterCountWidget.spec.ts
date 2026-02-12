import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { FilterCountWidget } from "../src/lib/widgets/FilterCountWidget";

describe("FilterCountWidget", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns count and caches value for refresh interval", async () => {
    const findByIdAsAdmin = vi.fn().mockResolvedValue({ id: "f-1", modelName: "test" });
    const count = vi.fn().mockResolvedValue(42);
    const assertCanExecute = vi.fn();

    const adminizer = {
      config: { routePrefix: "/adminizer" },
      filters: {
        repository: { findByIdAsAdmin },
        execution: { count },
        access: { assertCanExecute }
      }
    } as any;

    const widget = new FilterCountWidget(adminizer, {
      id: "filter_count",
      filterId: "f-1",
      refreshIntervalSec: 60
    });

    const req = { user: { id: 7, login: "admin", isAdministrator: true, groups: [] } } as any;

    expect(await widget.getInfo(req)).toBe("42");
    expect(await widget.getInfo(req)).toBe("42");

    expect(findByIdAsAdmin).toHaveBeenCalledTimes(1);
    expect(count).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(61_000);
    expect(await widget.getInfo(req)).toBe("42");
    expect(count).toHaveBeenCalledTimes(2);
  });

  it("returns fallback value when user cannot execute filter", async () => {
    const adminizer = {
      config: { routePrefix: "/adminizer" },
      filters: {
        repository: { findByIdAsAdmin: vi.fn().mockResolvedValue({ id: "f-1", modelName: "test" }) },
        execution: { count: vi.fn().mockResolvedValue(11) },
        access: {
          assertCanExecute: vi.fn(() => {
            throw new Error("forbidden");
          })
        }
      }
    } as any;

    const widget = new FilterCountWidget(adminizer, {
      id: "filter_count",
      filterId: "f-1",
      errorValue: "-"
    });

    const req = { user: { id: 2, login: "bob", isAdministrator: false, groups: [] } } as any;
    expect(await widget.getInfo(req)).toBe("-");
  });

  it("builds direct filter link from route prefix", () => {
    const adminizer = {
      config: { routePrefix: "/adminizer/" },
      filters: {}
    } as any;

    const widget = new FilterCountWidget(adminizer, {
      id: "filter_count",
      filterId: "filter-123"
    });

    expect(widget.link).toBe("/adminizer/filter/filter-123");
    expect(widget.linkType).toBe("self");
  });
});

