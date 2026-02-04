import { Adminizer } from '../../lib/Adminizer';
import { FilterService } from '../../lib/filters/FilterService';
import { FilterCondition } from '../../models/FilterAP';
import { ModernQueryBuilder, QueryParams } from '../../lib/query-builder/ModernQueryBuilder';
import { DataAccessor } from '../../lib/DataAccessor';
import { Fields } from '../../helpers/fieldsHelper';
import { FilterAP } from '../../models/FilterAP';
import { FilterColumnAP } from '../../models/FilterColumnAP';
import { BaseFieldConfig } from '../../interfaces/adminpanelConfig';
import { Readable, Transform } from 'stream';
import { Entity } from '../../interfaces/types';

/**
 * Export format types
 */
export type ExportFormat = 'json' | 'csv' | 'excel';

/**
 * Export options
 */
export interface ExportOptions {
    format: ExportFormat;
    filterId?: string;
    conditions?: FilterCondition[];
    columns?: string[];
    includeHeaders?: boolean;
    filename?: string;
    limit?: number;
    batchSize?: number;
}

/**
 * Export limits for security
 */
export const EXPORT_LIMITS = {
    MAX_ROWS: 100000,       // Maximum rows per export
    BATCH_SIZE: 1000,       // Rows per batch for streaming
    MAX_COLUMNS: 100,       // Maximum columns
    TIMEOUT_MS: 300000      // 5 minutes timeout
};

/**
 * ExportController - handles data export in various formats
 *
 * Endpoints:
 * - POST /adminizer/export/:modelName - export data
 * - GET /adminizer/export/:modelName/json - JSON export
 * - GET /adminizer/export/:modelName/csv - CSV export
 * - GET /adminizer/export/:modelName/excel - Excel export
 */
export class ExportController {
    /**
     * Check auth and return user or send error
     */
    private static checkAuth(req: ReqType, res: ResType): boolean {
        if (req.adminizer.config.auth.enable && !req.user) {
            res.status(401).json({
                success: false,
                error: 'Unauthorized'
            });
            return false;
        }
        return true;
    }

    /**
     * POST /adminizer/export/:modelName
     * Main export endpoint - supports all formats
     */
    static async export(req: ReqType, res: ResType) {
        if (!ExportController.checkAuth(req, res)) return;

        try {
            const modelName = req.params.modelName;
            const {
                format = 'json',
                filterId,
                conditions,
                columns,
                includeHeaders = true,
                filename,
                limit
            } = req.body as ExportOptions;

            // Validate format
            if (!['json', 'csv', 'excel'].includes(format)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid format: ${format}. Supported: json, csv, excel`
                });
            }

            // Get entity config and model
            const config = req.adminizer.config.models[modelName];
            if (!config) {
                return res.status(404).json({
                    success: false,
                    error: `Model '${modelName}' not found in config`
                });
            }

            const model = req.adminizer.modelHandler.model.get(config.model);
            if (!model) {
                return res.status(404).json({
                    success: false,
                    error: `Model '${modelName}' not found`
                });
            }

            // Create entity object
            const entity: Entity = {
                name: modelName,
                uri: `${req.adminizer.config.routePrefix}/model/${modelName}`,
                type: 'model',
                model,
                config
            };

            // Check permissions
            if (!req.adminizer.accessRightsHelper.hasPermission(`read-${modelName}-model`, req.user)) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied'
                });
            }

            // Setup data accessor and fields
            const dataAccessor = new DataAccessor(req.adminizer, req.user, entity, 'list');
            let fields = dataAccessor.getFieldsConfig();

            // Load filter if specified
            let savedFilter: FilterAP | null = null;
            let savedColumns: FilterColumnAP[] = [];

            if (filterId) {
                const filterService = new FilterService(req.adminizer);
                const result = await filterService.getFilterWithColumns(filterId, req.user);
                savedFilter = result.filter;
                savedColumns = result.columns;

                if (!savedFilter) {
                    return res.status(404).json({
                        success: false,
                        error: 'Filter not found or access denied'
                    });
                }
            }

            // Apply column customization
            let exportFields = fields;
            if (columns && columns.length > 0) {
                exportFields = ExportController.filterFieldsByNames(fields, columns);
            } else if (savedColumns.length > 0) {
                exportFields = ExportController.applyCustomColumns(fields, savedColumns);
            }

            // Build query conditions
            let filterConditions: FilterCondition[] = [];
            if (savedFilter?.conditions) {
                filterConditions = [...savedFilter.conditions];
            }
            if (conditions && conditions.length > 0) {
                filterConditions = [...filterConditions, ...conditions];
            }

            // Execute export based on format
            const exportLimit = Math.min(limit || EXPORT_LIMITS.MAX_ROWS, EXPORT_LIMITS.MAX_ROWS);
            const defaultFilename = `${modelName}-export-${Date.now()}`;

            switch (format) {
                case 'json':
                    return ExportController.exportJSON(
                        req, res, entity.model, fields, exportFields, dataAccessor,
                        filterConditions, savedFilter, exportLimit, filename || defaultFilename
                    );

                case 'csv':
                    return ExportController.exportCSV(
                        req, res, entity.model, fields, exportFields, dataAccessor,
                        filterConditions, savedFilter, exportLimit, filename || defaultFilename, includeHeaders
                    );

                case 'excel':
                    return ExportController.exportExcel(
                        req, res, entity.model, fields, exportFields, dataAccessor,
                        filterConditions, savedFilter, exportLimit, filename || defaultFilename
                    );
            }
        } catch (error) {
            Adminizer.log.error('ExportController.export error:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * GET /adminizer/export/:modelName/json
     * JSON export endpoint
     */
    static async exportJSONEndpoint(req: ReqType, res: ResType) {
        req.body = {
            ...req.body,
            format: 'json',
            filterId: req.query.filterId?.toString(),
            limit: req.query.limit ? parseInt(req.query.limit.toString(), 10) : undefined
        };
        return ExportController.export(req, res);
    }

    /**
     * GET /adminizer/export/:modelName/csv
     * CSV export endpoint
     */
    static async exportCSVEndpoint(req: ReqType, res: ResType) {
        req.body = {
            ...req.body,
            format: 'csv',
            filterId: req.query.filterId?.toString(),
            includeHeaders: req.query.includeHeaders !== 'false',
            limit: req.query.limit ? parseInt(req.query.limit.toString(), 10) : undefined
        };
        return ExportController.export(req, res);
    }

    /**
     * GET /adminizer/export/:modelName/excel
     * Excel export endpoint
     */
    static async exportExcelEndpoint(req: ReqType, res: ResType) {
        req.body = {
            ...req.body,
            format: 'excel',
            filterId: req.query.filterId?.toString(),
            limit: req.query.limit ? parseInt(req.query.limit.toString(), 10) : undefined
        };
        return ExportController.export(req, res);
    }

    /**
     * Export to JSON format
     */
    private static async exportJSON(
        req: ReqType,
        res: ResType,
        model: any,
        allFields: Fields,
        exportFields: Fields,
        dataAccessor: DataAccessor,
        conditions: FilterCondition[],
        filter: FilterAP | null,
        limit: number,
        filename: string
    ) {
        // Set headers
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);

        // For small datasets, fetch all at once
        if (limit <= EXPORT_LIMITS.BATCH_SIZE) {
            const queryParams: QueryParams = {
                page: 1,
                limit,
                sort: filter?.sortField || 'createdAt',
                sortDirection: filter?.sortDirection || 'DESC',
                filters: conditions
            };

            const queryBuilder = new ModernQueryBuilder(model, allFields, dataAccessor);
            const result = await queryBuilder.execute(queryParams);

            const exportData = ExportController.transformDataForExport(result.data, exportFields);

            return res.json({
                success: true,
                meta: {
                    total: result.filtered,
                    exported: exportData.length,
                    exportedAt: new Date().toISOString(),
                    filter: filter ? { id: filter.id, name: filter.name } : null
                },
                data: exportData
            });
        }

        // For large datasets, use streaming
        return ExportController.streamJSON(
            res, model, allFields, exportFields, dataAccessor,
            conditions, filter, limit
        );
    }

    /**
     * Stream JSON for large datasets
     */
    private static async streamJSON(
        res: ResType,
        model: any,
        allFields: Fields,
        exportFields: Fields,
        dataAccessor: DataAccessor,
        conditions: FilterCondition[],
        filter: FilterAP | null,
        limit: number
    ) {
        res.write('{"success":true,"data":[');

        let totalExported = 0;
        let page = 1;
        let isFirst = true;

        while (totalExported < limit) {
            const batchSize = Math.min(EXPORT_LIMITS.BATCH_SIZE, limit - totalExported);

            const queryParams: QueryParams = {
                page,
                limit: batchSize,
                sort: filter?.sortField || 'createdAt',
                sortDirection: filter?.sortDirection || 'DESC',
                filters: conditions
            };

            const queryBuilder = new ModernQueryBuilder(model, allFields, dataAccessor);
            const result = await queryBuilder.execute(queryParams);

            if (result.data.length === 0) {
                break;
            }

            const exportData = ExportController.transformDataForExport(result.data, exportFields);

            for (const row of exportData) {
                if (!isFirst) {
                    res.write(',');
                }
                res.write(JSON.stringify(row));
                isFirst = false;
            }

            totalExported += result.data.length;
            page++;

            // Check if we've reached the end
            if (totalExported >= result.filtered) {
                break;
            }
        }

        res.write(`],"meta":{"exported":${totalExported},"exportedAt":"${new Date().toISOString()}"}}`);
        res.end();
    }

    /**
     * Export to CSV format
     */
    private static async exportCSV(
        req: ReqType,
        res: ResType,
        model: any,
        allFields: Fields,
        exportFields: Fields,
        dataAccessor: DataAccessor,
        conditions: FilterCondition[],
        filter: FilterAP | null,
        limit: number,
        filename: string,
        includeHeaders: boolean
    ) {
        // Set headers
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);

        // Write BOM for Excel compatibility
        res.write('\ufeff');

        // Write headers
        const fieldNames = Object.keys(exportFields);
        if (includeHeaders) {
            const headers = fieldNames.map(name => {
                const config = exportFields[name].config as BaseFieldConfig;
                return ExportController.escapeCSV(config.title || name);
            });
            res.write(headers.join(',') + '\n');
        }

        // Stream data
        let totalExported = 0;
        let page = 1;

        while (totalExported < limit) {
            const batchSize = Math.min(EXPORT_LIMITS.BATCH_SIZE, limit - totalExported);

            const queryParams: QueryParams = {
                page,
                limit: batchSize,
                sort: filter?.sortField || 'createdAt',
                sortDirection: filter?.sortDirection || 'DESC',
                filters: conditions
            };

            const queryBuilder = new ModernQueryBuilder(model, allFields, dataAccessor);
            const result = await queryBuilder.execute(queryParams);

            if (result.data.length === 0) {
                break;
            }

            // Write rows
            for (const row of result.data) {
                const values = fieldNames.map(name => {
                    const value = row[name];
                    return ExportController.escapeCSV(ExportController.formatValue(value));
                });
                res.write(values.join(',') + '\n');
            }

            totalExported += result.data.length;
            page++;

            if (totalExported >= result.filtered) {
                break;
            }
        }

        res.end();
    }

    /**
     * Export to Excel format
     * Note: Requires exceljs package (optional dependency)
     */
    private static async exportExcel(
        req: ReqType,
        res: ResType,
        model: any,
        allFields: Fields,
        exportFields: Fields,
        dataAccessor: DataAccessor,
        conditions: FilterCondition[],
        filter: FilterAP | null,
        limit: number,
        filename: string
    ): Promise<void> {
        // Try to load exceljs
        let ExcelJS: any;
        try {
            // @ts-ignore - exceljs is optional dependency
            ExcelJS = await import('exceljs');
        } catch (e) {
            res.status(501).json({
                success: false,
                error: 'Excel export requires the "exceljs" package. Install it with: npm install exceljs'
            });
            return;
        }

        // Create workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Adminizer';
        workbook.created = new Date();

        const worksheet = workbook.addWorksheet('Export');

        // Set columns
        const fieldNames = Object.keys(exportFields);
        worksheet.columns = fieldNames.map(name => {
            const config = exportFields[name].config as BaseFieldConfig;
            return {
                header: config.title || name,
                key: name,
                width: 20
            };
        });

        // Style header row
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Fetch and add data
        let totalExported = 0;
        let page = 1;

        while (totalExported < limit) {
            const batchSize = Math.min(EXPORT_LIMITS.BATCH_SIZE, limit - totalExported);

            const queryParams: QueryParams = {
                page,
                limit: batchSize,
                sort: filter?.sortField || 'createdAt',
                sortDirection: filter?.sortDirection || 'DESC',
                filters: conditions
            };

            const queryBuilder = new ModernQueryBuilder(model, allFields, dataAccessor);
            const result = await queryBuilder.execute(queryParams);

            if (result.data.length === 0) {
                break;
            }

            // Add rows
            for (const row of result.data) {
                const rowData: Record<string, any> = {};
                for (const name of fieldNames) {
                    rowData[name] = ExportController.formatValue(row[name]);
                }
                worksheet.addRow(rowData);
            }

            totalExported += result.data.length;
            page++;

            if (totalExported >= result.filtered) {
                break;
            }
        }

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);

        // Write to response
        await workbook.xlsx.write(res);
        res.end();
    }

    /**
     * Filter fields by column names
     */
    private static filterFieldsByNames(fields: Fields, columnNames: string[]): Fields {
        const result: Fields = {};

        for (const name of columnNames) {
            if (fields[name]) {
                result[name] = fields[name];
            }
        }

        return Object.keys(result).length > 0 ? result : fields;
    }

    /**
     * Apply custom column configuration from filter
     */
    private static applyCustomColumns(fields: Fields, columns: FilterColumnAP[]): Fields {
        const sortedColumns = [...columns].sort((a, b) => (a.order || 0) - (b.order || 0));
        const visibleColumns = sortedColumns.filter(col => col.isVisible && fields[col.fieldName]);

        if (visibleColumns.length === 0) {
            return fields;
        }

        const result: Fields = {};
        for (const col of visibleColumns) {
            if (fields[col.fieldName]) {
                result[col.fieldName] = fields[col.fieldName];
            }
        }

        return result;
    }

    /**
     * Transform data for export (select only export fields)
     */
    private static transformDataForExport(data: any[], exportFields: Fields): any[] {
        const fieldNames = Object.keys(exportFields);

        return data.map(row => {
            const exportRow: Record<string, any> = {};
            for (const name of fieldNames) {
                exportRow[name] = row[name];
            }
            return exportRow;
        });
    }

    /**
     * Format value for export
     */
    private static formatValue(value: any): string {
        if (value === null || value === undefined) {
            return '';
        }

        if (value instanceof Date) {
            return value.toISOString();
        }

        if (typeof value === 'object') {
            return JSON.stringify(value);
        }

        return String(value);
    }

    /**
     * Escape value for CSV
     */
    private static escapeCSV(value: string): string {
        if (value === null || value === undefined) {
            return '';
        }

        const str = String(value);

        // If contains comma, newline, or quotes - wrap in quotes and escape
        if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
        }

        return str;
    }
}

export default ExportController;
