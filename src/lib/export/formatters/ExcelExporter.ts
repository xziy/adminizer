import ExcelJS from "exceljs";
import { AbstractExporter } from "./AbstractExporter";
import type { ExportPayload, ExportResult } from "../types";

const DEFAULT_COLUMN_WIDTH = 20;

export class ExcelExporter extends AbstractExporter {
  getContentType(): string {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }

  getFileExtension(): string {
    return "xlsx";
  }

  async export(payload: ExportPayload): Promise<ExportResult> {
    const { filePath, fileName, rows, columns } = payload;
    const includeHeaders = payload.includeHeaders !== false;
    const sheetName = payload.sheetName ?? "Export";
    const autoFilter = payload.autoFilter !== false;
    const freezeHeaders = payload.freezeHeaders !== false;

    try {
      this.ensureOutputDir(filePath);

      const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
        filename: filePath
      });
      const worksheet = workbook.addWorksheet(sheetName);

      worksheet.columns = columns.map((column) => ({
        header: column.label || column.key,
        key: column.key,
        width: this.normalizeWidth(column.width)
      }));

      if (includeHeaders) {
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E0E0" }
        };
        headerRow.commit();

        if (freezeHeaders) {
          try {
            worksheet.views = [{ state: "frozen", ySplit: 1 }];
          } catch {
            // Streaming worksheets may not allow setting views.
          }
        }
      }

      let rowCount = 0;
      for await (const row of rows) {
        const formatted = this.formatRow(row, columns.map((column) => column.key));
        const excelRow = worksheet.addRow(formatted);
        excelRow.commit();
        rowCount += 1;
      }

      if (autoFilter && includeHeaders && columns.length > 0) {
        worksheet.autoFilter = {
          from: { row: 1, column: 1 },
          to: { row: rowCount + 1, column: columns.length }
        };
      }

      worksheet.commit();
      await workbook.commit();

      return {
        success: true,
        filePath,
        fileName,
        rowCount
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: message
      };
    }
  }

  private normalizeWidth(width?: number): number {
    if (!width || !Number.isFinite(width)) {
      return DEFAULT_COLUMN_WIDTH;
    }
    const normalized = Math.round(width / 10);
    if (normalized < 8) {
      return 8;
    }
    if (normalized > 60) {
      return 60;
    }
    return normalized;
  }

  private formatRow(row: Record<string, unknown>, keys: string[]): Record<string, string | number | boolean | null> {
    const formatted: Record<string, string | number | boolean | null> = {};
    keys.forEach((key) => {
      formatted[key] = this.formatValue(row[key]);
    });
    return formatted;
  }

  private formatValue(value: unknown): string | number | boolean | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return value;
    }
    return String(value);
  }
}
