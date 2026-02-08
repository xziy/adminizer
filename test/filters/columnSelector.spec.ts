import { describe, expect, it } from "vitest";
import {
  addColumnToSelection,
  normalizeColumnOrder,
  removeColumnFromSelection,
  reorderColumns,
  toggleColumnEditable,
  toggleColumnVisibility,
  type ColumnConfig
} from "../../src/assets/js/components/column-selector";

describe("Column selector helpers", () => {
  const baseColumns: ColumnConfig[] = [
    { fieldName: "name", order: 2, isVisible: true, isEditable: false },
    { fieldName: "email", order: 0, isVisible: true, isEditable: true },
    { fieldName: "status", order: 5, isVisible: false, isEditable: false }
  ];

  it("normalizes column order", () => {
    const normalized = normalizeColumnOrder(baseColumns);
    expect(normalized.map((column) => column.order)).toEqual([0, 1, 2]);
  });

  it("adds a column with editable flag from field info", () => {
    const added = addColumnToSelection([], {
      name: "createdAt",
      inlineEditable: true
    });
    expect(added).toEqual([
      {
        fieldName: "createdAt",
        order: 0,
        isVisible: true,
        isEditable: true,
        width: undefined
      }
    ]);
  });

  it("removes a column and normalizes order", () => {
    const removed = removeColumnFromSelection(baseColumns, "email");
    expect(removed.map((column) => column.fieldName)).toEqual(["name", "status"]);
    expect(removed.map((column) => column.order)).toEqual([0, 1]);
  });

  it("toggles visibility and editable flags", () => {
    const visibilityToggled = toggleColumnVisibility(baseColumns, "status");
    expect(
      visibilityToggled.find((column) => column.fieldName === "status")?.isVisible
    ).toBe(true);

    const editableToggled = toggleColumnEditable(baseColumns, "name");
    expect(
      editableToggled.find((column) => column.fieldName === "name")?.isEditable
    ).toBe(true);
  });

  it("reorders columns based on drag-and-drop ids", () => {
    const reordered = reorderColumns(
      normalizeColumnOrder(baseColumns),
      "status",
      "name"
    );
    expect(reordered.map((column) => column.fieldName)).toEqual([
      "status",
      "name",
      "email"
    ]);
    expect(reordered.map((column) => column.order)).toEqual([0, 1, 2]);
  });

  it("ignores reordering when ids are missing", () => {
    const normalized = normalizeColumnOrder(baseColumns);
    const result = reorderColumns(normalized, "missing", "name");
    expect(result).toBe(normalized);
  });
});
