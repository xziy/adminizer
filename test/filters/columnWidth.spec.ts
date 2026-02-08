import { describe, expect, it } from "vitest";
import {
  buildColumnOverrides,
  mapFilterColumns,
  normalizeColumnWidth
} from "../../src/controllers/list";

describe("Column width helpers", () => {
  it("normalizes widths to valid range", () => {
    expect(normalizeColumnWidth(undefined)).toBeUndefined();
    expect(normalizeColumnWidth(null)).toBeUndefined();
    expect(normalizeColumnWidth("")).toBeUndefined();
    expect(normalizeColumnWidth("invalid")).toBeUndefined();
    expect(normalizeColumnWidth(0)).toBeUndefined();
    expect(normalizeColumnWidth(-12)).toBeUndefined();
    expect(normalizeColumnWidth(10)).toBe(80);
    expect(normalizeColumnWidth(600)).toBe(600);
    expect(normalizeColumnWidth(1200)).toBe(600);
    expect(normalizeColumnWidth(154.6)).toBe(155);
  });

  it("builds overrides only for valid widths", () => {
    const overrides = buildColumnOverrides([
      { fieldName: "name", width: 120 } as any,
      { fieldName: "email", width: 0 } as any,
      { fieldName: "status", width: 700 } as any,
      { fieldName: "", width: 200 } as any
    ]);

    expect(overrides).toEqual({
      name: { width: 120 },
      status: { width: 600 }
    });
  });

  it("maps filter columns with normalized width", () => {
    const mapped = mapFilterColumns([
      { fieldName: "name", order: 1, isVisible: true, isEditable: false, width: 50 } as any,
      { fieldName: "email", order: 2, isVisible: false, isEditable: true, width: 700 } as any,
      { fieldName: "status", order: 3, isVisible: true, isEditable: false } as any
    ]);

    expect(mapped).toEqual([
      { fieldName: "name", order: 1, isVisible: true, isEditable: false, width: 80 },
      { fieldName: "email", order: 2, isVisible: false, isEditable: true, width: 600 },
      { fieldName: "status", order: 3, isVisible: true, isEditable: false, width: undefined }
    ]);
  });
});
