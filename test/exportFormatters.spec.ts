import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { JsonExporter } from "../src/lib/export/formatters/JsonExporter";
import { CsvExporter } from "../src/lib/export/formatters/CsvExporter";
import { ExcelExporter } from "../src/lib/export/formatters/ExcelExporter";
import type { ExportColumn } from "../src/lib/export/types";

const outputDir = path.join(process.cwd(), ".tmp", "export-tests");

const columns: ExportColumn[] = [
  { key: "id", label: "ID" },
  { key: "name", label: "Name" }
];

const makeRows = async function* () {
  yield { id: 1, name: "Alice" };
  yield { id: 2, name: "Bob" };
};

describe("Export formatters", () => {
  it("writes JSON exports", async () => {
    const exporter = new JsonExporter();
    const fileName = "test-export.json";
    const filePath = path.join(outputDir, fileName);

    const result = await exporter.export({
      filePath,
      fileName,
      columns,
      rows: makeRows()
    });

    expect(result.success).toBe(true);
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw) as Array<Record<string, unknown>>;
    expect(data.length).toBe(2);
    expect(data[0].name).toBe("Alice");

    fs.unlinkSync(filePath);
  });

  it("writes CSV exports", async () => {
    const exporter = new CsvExporter();
    const fileName = "test-export.csv";
    const filePath = path.join(outputDir, fileName);

    const result = await exporter.export({
      filePath,
      fileName,
      columns,
      rows: makeRows(),
      includeHeaders: true,
      delimiter: ";"
    });

    expect(result.success).toBe(true);
    const raw = fs.readFileSync(filePath, "utf-8");
    expect(raw).toContain("ID;Name");
    expect(raw).toContain("1;Alice");

    fs.unlinkSync(filePath);
  });

  it("writes Excel exports", async () => {
    const exporter = new ExcelExporter();
    const fileName = "test-export.xlsx";
    const filePath = path.join(outputDir, fileName);

    const result = await exporter.export({
      filePath,
      fileName,
      columns,
      rows: makeRows(),
      includeHeaders: true,
      sheetName: "Export"
    });

    expect(result.success).toBe(true);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet("Export");
    expect(worksheet).toBeDefined();
    expect(worksheet?.getRow(1).getCell(1).value).toBe("ID");
    expect(worksheet?.getRow(2).getCell(2).value).toBe("Alice");

    fs.unlinkSync(filePath);
  });
});
