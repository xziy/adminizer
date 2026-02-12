import { describe, expect, it } from "vitest";
import {
  parseRecentFilters,
  upsertRecentFilters,
  type RecentFilterEntry
} from "../../src/assets/js/lib/recent-filters";

describe("recent filter storage helpers", () => {
  it("parses and normalizes entries from JSON", () => {
    const raw = JSON.stringify([
      { id: "f2", name: "Second", modelName: "UserAP", visitedAt: "2026-02-12T09:00:00.000Z" },
      { id: "f1", name: "First", modelName: "UserAP", visitedAt: "2026-02-12T10:00:00.000Z" },
      { id: "", name: "Invalid", modelName: "UserAP", visitedAt: "2026-02-12T11:00:00.000Z" }
    ]);

    const result = parseRecentFilters(raw);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("f1");
    expect(result[1].id).toBe("f2");
  });

  it("upserts by id and keeps latest entry first", () => {
    const current: RecentFilterEntry[] = [
      { id: "f1", name: "One", modelName: "UserAP", visitedAt: "2026-02-12T08:00:00.000Z" },
      { id: "f2", name: "Two", modelName: "UserAP", visitedAt: "2026-02-12T07:00:00.000Z" }
    ];

    const updated = upsertRecentFilters(current, {
      id: "f2",
      name: "Two updated",
      modelName: "UserAP"
    });

    expect(updated[0].id).toBe("f2");
    expect(updated[0].name).toBe("Two updated");
    expect(updated).toHaveLength(2);
  });
});
