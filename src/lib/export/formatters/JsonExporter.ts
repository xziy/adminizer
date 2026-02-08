import fs from "node:fs";
import { finished } from "node:stream/promises";
import { AbstractExporter } from "./AbstractExporter";
import type { ExportPayload, ExportResult } from "../types";

export class JsonExporter extends AbstractExporter {
  getContentType(): string {
    return "application/json";
  }

  getFileExtension(): string {
    return "json";
  }

  async export(payload: ExportPayload): Promise<ExportResult> {
    const { filePath, fileName, rows } = payload;

    try {
      this.ensureOutputDir(filePath);
      const stream = fs.createWriteStream(filePath, { encoding: "utf-8" });
      let isFirst = true;
      let rowCount = 0;

      stream.write("[");
      for await (const row of rows) {
        if (!isFirst) {
          stream.write(",\n");
        }
        stream.write(JSON.stringify(row));
        isFirst = false;
        rowCount += 1;
      }
      stream.write("]");
      stream.end();

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
}
