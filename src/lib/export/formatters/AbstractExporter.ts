import fs from "node:fs";
import path from "node:path";
import type { ExportPayload, ExportResult } from "../types";

export abstract class AbstractExporter {
  abstract getContentType(): string;
  abstract getFileExtension(): string;
  abstract export(payload: ExportPayload): Promise<ExportResult>;

  protected ensureOutputDir(filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  protected sanitizeFileName(value: string): string {
    return String(value ?? "")
      .replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "export";
  }
}
