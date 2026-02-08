import fs from "node:fs";
import { finished } from "node:stream/promises";
import { stringify } from "csv-stringify";
import { AbstractExporter } from "./AbstractExporter";
import type { ExportPayload, ExportResult } from "../types";

export class CsvExporter extends AbstractExporter {
  getContentType(): string {
    return "text/csv";
  }

  getFileExtension(): string {
    return "csv";
  }

  async export(payload: ExportPayload): Promise<ExportResult> {
    const { filePath, fileName, rows, columns } = payload;
    const delimiter = payload.delimiter ?? ",";
    const includeHeaders = payload.includeHeaders !== false;
    const encoding = payload.encoding ?? "utf-8";

    try {
      this.ensureOutputDir(filePath);
      const columnMap = columns.reduce<Record<string, string>>((acc, column) => {
        acc[column.key] = column.label || column.key;
        return acc;
      }, {});
      const columnKeys = columns.map((column) => column.key);

      const stringifier = stringify({
        delimiter,
        header: includeHeaders,
        columns: columnMap
      });

      const stream = fs.createWriteStream(filePath, { encoding });
      stringifier.pipe(stream);

      let rowCount = 0;
      for await (const row of rows) {
        const formatted = this.formatRow(row, columnKeys);
        stringifier.write(formatted);
        rowCount += 1;
      }

      stringifier.end();
      await finished(stream);

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

  private formatRow(
    row: Record<string, unknown>,
    columnKeys: string[]
  ): Record<string, string> {
    const formatted: Record<string, string> = {};
    columnKeys.forEach((key) => {
      formatted[key] = this.formatValue(row[key]);
    });
    return formatted;
  }

  private formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return "";
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return String(value);
  }
}
