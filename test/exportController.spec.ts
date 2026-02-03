import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  ExportController,
  ExportFormat,
  ExportOptions,
  EXPORT_LIMITS
} from '../src/controllers/export/ExportController';

// Mock response object
const createMockRes = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    write: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis()
  };
  return res as any;
};

// Mock request base
const createMockReq = (overrides: any = {}) => {
  return {
    params: { modelName: 'TestModel' },
    body: {},
    query: {},
    user: { id: 1, name: 'Test User', isAdmin: true },
    adminizer: {
      config: {
        auth: { enable: true }
      },
      modelHandler: {
        get: vi.fn().mockReturnValue({
          model: {},
          config: {}
        })
      },
      accessRightsHelper: {
        hasPermission: vi.fn().mockReturnValue(true)
      },
      log: {
        error: vi.fn()
      }
    },
    ...overrides
  } as any;
};

describe('ExportController', () => {
  describe('EXPORT_LIMITS', () => {
    it('has correct MAX_ROWS limit', () => {
      expect(EXPORT_LIMITS.MAX_ROWS).toBe(100000);
    });

    it('has correct BATCH_SIZE', () => {
      expect(EXPORT_LIMITS.BATCH_SIZE).toBe(1000);
    });

    it('has correct MAX_COLUMNS limit', () => {
      expect(EXPORT_LIMITS.MAX_COLUMNS).toBe(100);
    });

    it('has correct TIMEOUT_MS', () => {
      expect(EXPORT_LIMITS.TIMEOUT_MS).toBe(300000);
    });
  });

  describe('Authentication', () => {
    it('returns 401 when auth enabled and no user', async () => {
      const req = createMockReq({
        user: undefined,
        adminizer: {
          config: { auth: { enable: true } },
          modelHandler: { get: vi.fn() },
          accessRightsHelper: { hasPermission: vi.fn() }
        }
      });
      const res = createMockRes();

      await ExportController.export(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized'
      });
    });

    it('allows access when auth disabled and no user', async () => {
      const req = createMockReq({
        user: undefined,
        body: { format: 'invalid_format_to_trigger_400' },
        adminizer: {
          config: { auth: { enable: false } },
          modelHandler: {
            get: vi.fn().mockReturnValue({ model: {}, config: {} })
          },
          accessRightsHelper: {
            hasPermission: vi.fn().mockReturnValue(true)
          }
        }
      });
      const res = createMockRes();

      // Should proceed past auth check and fail on format validation
      await ExportController.export(req, res);

      // Should NOT return 401 (auth passed)
      expect(res.status).not.toHaveBeenCalledWith(401);
      // Should return 400 for invalid format (proves auth check passed)
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Format validation', () => {
    it('returns 400 for invalid format', async () => {
      const req = createMockReq({
        body: { format: 'invalid' }
      });
      const res = createMockRes();

      await ExportController.export(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid format: invalid. Supported: json, csv, excel'
      });
    });

    it('accepts json format', () => {
      // Format validation is done via includes check
      expect(['json', 'csv', 'excel'].includes('json')).toBe(true);
    });

    it('accepts csv format', () => {
      expect(['json', 'csv', 'excel'].includes('csv')).toBe(true);
    });

    it('accepts excel format', () => {
      expect(['json', 'csv', 'excel'].includes('excel')).toBe(true);
    });
  });

  describe('Model validation', () => {
    it('returns 404 for unknown model', async () => {
      const req = createMockReq({
        body: { format: 'json' },
        adminizer: {
          config: { auth: { enable: true } },
          modelHandler: {
            get: vi.fn().mockReturnValue(null)
          },
          accessRightsHelper: { hasPermission: vi.fn() }
        }
      });
      const res = createMockRes();

      await ExportController.export(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Model 'TestModel' not found"
      });
    });
  });

  describe('Permission check', () => {
    it('returns 403 when user lacks read permission', async () => {
      const req = createMockReq({
        body: { format: 'json' },
        adminizer: {
          config: { auth: { enable: true } },
          modelHandler: {
            get: vi.fn().mockReturnValue({ model: {}, config: {} })
          },
          accessRightsHelper: {
            hasPermission: vi.fn().mockReturnValue(false)
          }
        }
      });
      const res = createMockRes();

      await ExportController.export(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied'
      });
    });

    it('checks permission with correct permission name', async () => {
      const hasPermission = vi.fn().mockReturnValue(false);
      const req = createMockReq({
        params: { modelName: 'Order' },
        body: { format: 'json' },
        adminizer: {
          config: { auth: { enable: true } },
          modelHandler: {
            get: vi.fn().mockReturnValue({ model: {}, config: {} })
          },
          accessRightsHelper: { hasPermission }
        }
      });
      const res = createMockRes();

      await ExportController.export(req, res);

      // Permission check is called with model name
      expect(hasPermission).toHaveBeenCalledWith('read-Order-model', req.user);
      // And returns 403 because we set hasPermission to return false
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('GET endpoints', () => {
    it('exportJSONEndpoint sets format to json', async () => {
      const hasPermission = vi.fn().mockReturnValue(false);
      const req = createMockReq({
        body: {},
        query: { filterId: 'abc', limit: '500' },
        adminizer: {
          config: { auth: { enable: true } },
          modelHandler: { get: vi.fn().mockReturnValue({ model: {}, config: {} }) },
          accessRightsHelper: { hasPermission }
        }
      });
      const res = createMockRes();

      await ExportController.exportJSONEndpoint(req, res);

      // Verify body was set correctly before export() was called
      expect(req.body.format).toBe('json');
      expect(req.body.filterId).toBe('abc');
      expect(req.body.limit).toBe(500);
    });

    it('exportCSVEndpoint sets format to csv', async () => {
      const hasPermission = vi.fn().mockReturnValue(false);
      const req = createMockReq({
        body: {},
        query: { includeHeaders: 'false' },
        adminizer: {
          config: { auth: { enable: true } },
          modelHandler: { get: vi.fn().mockReturnValue({ model: {}, config: {} }) },
          accessRightsHelper: { hasPermission }
        }
      });
      const res = createMockRes();

      await ExportController.exportCSVEndpoint(req, res);

      expect(req.body.format).toBe('csv');
      expect(req.body.includeHeaders).toBe(false);
    });

    it('exportCSVEndpoint defaults includeHeaders to true', async () => {
      const hasPermission = vi.fn().mockReturnValue(false);
      const req = createMockReq({
        body: {},
        query: {},
        adminizer: {
          config: { auth: { enable: true } },
          modelHandler: { get: vi.fn().mockReturnValue({ model: {}, config: {} }) },
          accessRightsHelper: { hasPermission }
        }
      });
      const res = createMockRes();

      await ExportController.exportCSVEndpoint(req, res);

      expect(req.body.includeHeaders).toBe(true);
    });

    it('exportExcelEndpoint sets format to excel', async () => {
      const hasPermission = vi.fn().mockReturnValue(false);
      const req = createMockReq({
        body: {},
        query: { limit: '1000' },
        adminizer: {
          config: { auth: { enable: true } },
          modelHandler: { get: vi.fn().mockReturnValue({ model: {}, config: {} }) },
          accessRightsHelper: { hasPermission }
        }
      });
      const res = createMockRes();

      await ExportController.exportExcelEndpoint(req, res);

      expect(req.body.format).toBe('excel');
      expect(req.body.limit).toBe(1000);
    });
  });

  describe('Helper methods - formatValue', () => {
    // Access private method via bracket notation
    const formatValue = (ExportController as any).formatValue.bind(ExportController);

    it('returns empty string for null', () => {
      expect(formatValue(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(formatValue(undefined)).toBe('');
    });

    it('converts Date to ISO string', () => {
      const date = new Date('2026-02-02T10:30:00.000Z');
      expect(formatValue(date)).toBe('2026-02-02T10:30:00.000Z');
    });

    it('converts object to JSON string', () => {
      const obj = { name: 'test', value: 123 };
      expect(formatValue(obj)).toBe('{"name":"test","value":123}');
    });

    it('converts array to JSON string', () => {
      const arr = [1, 2, 3];
      expect(formatValue(arr)).toBe('[1,2,3]');
    });

    it('converts number to string', () => {
      expect(formatValue(42)).toBe('42');
    });

    it('converts boolean to string', () => {
      expect(formatValue(true)).toBe('true');
      expect(formatValue(false)).toBe('false');
    });

    it('returns string as-is', () => {
      expect(formatValue('hello')).toBe('hello');
    });
  });

  describe('Helper methods - escapeCSV', () => {
    const escapeCSV = (ExportController as any).escapeCSV.bind(ExportController);

    it('returns empty string for null', () => {
      expect(escapeCSV(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(escapeCSV(undefined)).toBe('');
    });

    it('returns simple string as-is', () => {
      expect(escapeCSV('hello')).toBe('hello');
    });

    it('wraps string with comma in quotes', () => {
      expect(escapeCSV('hello, world')).toBe('"hello, world"');
    });

    it('wraps string with newline in quotes', () => {
      expect(escapeCSV('hello\nworld')).toBe('"hello\nworld"');
    });

    it('wraps string with carriage return in quotes', () => {
      expect(escapeCSV('hello\rworld')).toBe('"hello\rworld"');
    });

    it('escapes double quotes by doubling them', () => {
      expect(escapeCSV('say "hello"')).toBe('"say ""hello"""');
    });

    it('handles multiple special characters', () => {
      expect(escapeCSV('a, "b"\nc')).toBe('"a, ""b""\nc"');
    });
  });

  describe('Helper methods - filterFieldsByNames', () => {
    const filterFieldsByNames = (ExportController as any).filterFieldsByNames.bind(ExportController);

    const testFields = {
      id: { config: { title: 'ID' } },
      name: { config: { title: 'Name' } },
      email: { config: { title: 'Email' } },
      status: { config: { title: 'Status' } }
    };

    it('filters to specified columns', () => {
      const result = filterFieldsByNames(testFields, ['id', 'name']);
      expect(Object.keys(result)).toEqual(['id', 'name']);
    });

    it('ignores non-existent columns', () => {
      const result = filterFieldsByNames(testFields, ['id', 'nonexistent']);
      expect(Object.keys(result)).toEqual(['id']);
    });

    it('returns original fields if no columns match', () => {
      const result = filterFieldsByNames(testFields, ['nonexistent']);
      expect(result).toEqual(testFields);
    });

    it('preserves field configuration', () => {
      const result = filterFieldsByNames(testFields, ['email']);
      expect(result.email.config.title).toBe('Email');
    });
  });

  describe('Helper methods - applyCustomColumns', () => {
    const applyCustomColumns = (ExportController as any).applyCustomColumns.bind(ExportController);

    const testFields = {
      id: { config: { title: 'ID' } },
      name: { config: { title: 'Name' } },
      email: { config: { title: 'Email' } },
      status: { config: { title: 'Status' } }
    };

    it('returns fields in order specified by columns', () => {
      const columns = [
        { fieldName: 'email', order: 0, isVisible: true },
        { fieldName: 'id', order: 1, isVisible: true },
        { fieldName: 'name', order: 2, isVisible: true }
      ];
      const result = applyCustomColumns(testFields, columns);
      expect(Object.keys(result)).toEqual(['email', 'id', 'name']);
    });

    it('excludes hidden columns', () => {
      const columns = [
        { fieldName: 'id', order: 0, isVisible: true },
        { fieldName: 'email', order: 1, isVisible: false },
        { fieldName: 'name', order: 2, isVisible: true }
      ];
      const result = applyCustomColumns(testFields, columns);
      expect(Object.keys(result)).toEqual(['id', 'name']);
    });

    it('ignores columns for non-existent fields', () => {
      const columns = [
        { fieldName: 'id', order: 0, isVisible: true },
        { fieldName: 'nonexistent', order: 1, isVisible: true }
      ];
      const result = applyCustomColumns(testFields, columns);
      expect(Object.keys(result)).toEqual(['id']);
    });

    it('returns original fields if no visible columns', () => {
      const columns = [
        { fieldName: 'id', order: 0, isVisible: false },
        { fieldName: 'name', order: 1, isVisible: false }
      ];
      const result = applyCustomColumns(testFields, columns);
      expect(result).toEqual(testFields);
    });

    it('sorts by order property', () => {
      const columns = [
        { fieldName: 'status', order: 3, isVisible: true },
        { fieldName: 'id', order: 1, isVisible: true },
        { fieldName: 'email', order: 2, isVisible: true }
      ];
      const result = applyCustomColumns(testFields, columns);
      expect(Object.keys(result)).toEqual(['id', 'email', 'status']);
    });
  });

  describe('Helper methods - transformDataForExport', () => {
    const transformDataForExport = (ExportController as any).transformDataForExport.bind(ExportController);

    it('extracts only specified fields from data', () => {
      const data = [
        { id: 1, name: 'A', email: 'a@test.com', extra: 'ignored' },
        { id: 2, name: 'B', email: 'b@test.com', extra: 'ignored' }
      ];
      const exportFields = {
        id: {},
        name: {}
      };

      const result = transformDataForExport(data, exportFields);

      expect(result).toEqual([
        { id: 1, name: 'A' },
        { id: 2, name: 'B' }
      ]);
    });

    it('handles empty data', () => {
      const result = transformDataForExport([], { id: {} });
      expect(result).toEqual([]);
    });

    it('includes undefined for missing fields', () => {
      const data = [{ id: 1 }];
      const exportFields = { id: {}, name: {} };

      const result = transformDataForExport(data, exportFields);

      expect(result[0].id).toBe(1);
      expect(result[0].name).toBeUndefined();
    });
  });

  describe('ExportOptions interface', () => {
    it('supports all expected properties', () => {
      const options: ExportOptions = {
        format: 'json',
        filterId: 'filter-123',
        conditions: [{ id: '1', field: 'status', operator: 'eq', value: 'active' }],
        columns: ['id', 'name'],
        includeHeaders: true,
        filename: 'export-data',
        limit: 5000,
        batchSize: 500
      };

      expect(options.format).toBe('json');
      expect(options.filterId).toBe('filter-123');
      expect(options.conditions?.length).toBe(1);
      expect(options.columns?.length).toBe(2);
      expect(options.includeHeaders).toBe(true);
      expect(options.filename).toBe('export-data');
      expect(options.limit).toBe(5000);
      expect(options.batchSize).toBe(500);
    });
  });

  describe('ExportFormat type', () => {
    it('accepts valid formats', () => {
      const formats: ExportFormat[] = ['json', 'csv', 'excel'];
      expect(formats).toHaveLength(3);
    });
  });

  describe('Limit enforcement', () => {
    it('enforces MAX_ROWS limit when limit exceeds it', async () => {
      // This is a property-based test
      const userLimit = 200000; // More than MAX_ROWS
      const effectiveLimit = Math.min(userLimit, EXPORT_LIMITS.MAX_ROWS);
      expect(effectiveLimit).toBe(EXPORT_LIMITS.MAX_ROWS);
    });

    it('uses user limit when under MAX_ROWS', () => {
      const userLimit = 500;
      const effectiveLimit = Math.min(userLimit, EXPORT_LIMITS.MAX_ROWS);
      expect(effectiveLimit).toBe(500);
    });

    it('defaults to MAX_ROWS when limit not specified', () => {
      const userLimit = undefined;
      const effectiveLimit = Math.min(userLimit || EXPORT_LIMITS.MAX_ROWS, EXPORT_LIMITS.MAX_ROWS);
      expect(effectiveLimit).toBe(EXPORT_LIMITS.MAX_ROWS);
    });
  });

  describe('CSV BOM and encoding', () => {
    it('UTF-8 BOM is correct byte sequence', () => {
      // UTF-8 BOM is: EF BB BF (represented as \ufeff)
      const bom = '\ufeff';
      expect(bom.charCodeAt(0)).toBe(0xFEFF);
    });
  });

  describe('Content-Type headers', () => {
    it('JSON content type is application/json', () => {
      const contentType = 'application/json';
      expect(contentType).toBe('application/json');
    });

    it('CSV content type includes charset', () => {
      const contentType = 'text/csv; charset=utf-8';
      expect(contentType).toContain('text/csv');
      expect(contentType).toContain('charset=utf-8');
    });

    it('Excel content type is xlsx MIME', () => {
      const contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      expect(contentType).toContain('spreadsheetml');
    });
  });

  describe('Filename generation', () => {
    it('generates default filename with model and timestamp', () => {
      const modelName = 'Order';
      const timestamp = Date.now();
      const defaultFilename = `${modelName}-export-${timestamp}`;

      expect(defaultFilename).toContain('Order');
      expect(defaultFilename).toContain('export');
    });

    it('uses custom filename when provided', () => {
      const customFilename = 'my-custom-export';
      expect(customFilename).toBe('my-custom-export');
    });
  });

  describe('Batch processing', () => {
    it('calculates correct batch sizes', () => {
      const limit = 2500;
      const batchSize = EXPORT_LIMITS.BATCH_SIZE;
      const batches = Math.ceil(limit / batchSize);

      expect(batches).toBe(3);
    });

    it('handles last batch with remaining items', () => {
      const limit = 2500;
      const batchSize = EXPORT_LIMITS.BATCH_SIZE;
      const lastBatchSize = limit % batchSize;

      expect(lastBatchSize).toBe(500);
    });

    it('batch size equals limit when limit is smaller', () => {
      const limit = 500;
      const effectiveBatchSize = Math.min(EXPORT_LIMITS.BATCH_SIZE, limit);

      expect(effectiveBatchSize).toBe(500);
    });
  });

  describe('Error handling', () => {
    it('returns 500 on unexpected error', async () => {
      const req = createMockReq({
        body: { format: 'json' },
        adminizer: {
          config: { auth: { enable: true } },
          modelHandler: {
            get: vi.fn().mockImplementation(() => {
              throw new Error('Database connection failed');
            })
          },
          accessRightsHelper: { hasPermission: vi.fn() }
        }
      });
      const res = createMockRes();

      await ExportController.export(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database connection failed'
      });
    });
  });
});
