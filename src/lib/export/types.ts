import type { QuerySortDirection } from "../query-builder/ModernQueryBuilder";

export type ExportFormat = "json" | "csv" | "xlsx";

export type ExportColumn = {
  key: string;
  label: string;
  width?: number;
  type?: string;
};

export type ExportColumnSearch = {
  column: string;
  value: string;
};

export type ExportRequest = {
  format: ExportFormat;
  modelName?: string;
  filterId?: string;
  filterSlug?: string;
  columns?: string[];
  sort?: string;
  sortDirection?: QuerySortDirection;
  globalSearch?: string;
  columnSearch?: ExportColumnSearch[];
  useLegacySearch?: boolean;
  limit?: number;
  chunkSize?: number;
  fileName?: string;
  background?: boolean;
  includeHeaders?: boolean;
  delimiter?: string;
  encoding?: BufferEncoding;
  sheetName?: string;
  autoFilter?: boolean;
  freezeHeaders?: boolean;
};

export type ExportPayload = {
  filePath: string;
  fileName: string;
  columns: ExportColumn[];
  rows: AsyncIterable<Record<string, unknown>>;
  includeHeaders?: boolean;
  delimiter?: string;
  encoding?: BufferEncoding;
  sheetName?: string;
  autoFilter?: boolean;
  freezeHeaders?: boolean;
};

export type ExportResult = {
  success: boolean;
  filePath?: string;
  fileName?: string;
  downloadUrl?: string;
  rowCount?: number;
  error?: string;
};
