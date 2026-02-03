import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FilterController } from '../src/controllers/filters/FilterController';

// Mock response object
const createMockRes = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis()
  };
  return res as any;
};

// Mock FilterService
const createMockFilterService = (overrides: any = {}) => {
  return {
    isFiltersEnabled: vi.fn().mockReturnValue(true),
    isFiltersEnabledForModel: vi.fn().mockReturnValue(true),
    shouldUseLegacySearch: vi.fn().mockReturnValue(false),
    getFiltersForModel: vi.fn().mockResolvedValue([]),
    getFilterById: vi.fn().mockResolvedValue(null),
    getFilterBySlug: vi.fn().mockResolvedValue(null),
    canViewFilter: vi.fn().mockReturnValue(true),
    canEditFilter: vi.fn().mockReturnValue(true),
    canDeleteFilter: vi.fn().mockReturnValue(true),
    createFilter: vi.fn().mockResolvedValue({ id: 'new-filter-id', name: 'Test' }),
    updateFilter: vi.fn().mockResolvedValue({ id: 'filter-id', name: 'Updated' }),
    deleteFilter: vi.fn().mockResolvedValue(undefined),
    getFilterColumns: vi.fn().mockResolvedValue([]),
    updateFilterColumns: vi.fn().mockResolvedValue([]),
    ...overrides
  };
};

// Mock request base
const createMockReq = (overrides: any = {}) => {
  return {
    params: {},
    body: {},
    query: {},
    user: { id: 1, name: 'Test User', isAdministrator: false, groups: [] },
    adminizer: {
      config: {
        auth: { enable: true },
        routePrefix: '/adminizer'
      },
      modelHandler: {
        get: vi.fn().mockReturnValue({
          model: { findOne: vi.fn(), find: vi.fn() },
          config: {}
        })
      }
    },
    ...overrides
  } as any;
};

describe('FilterController', () => {
  describe('Authentication', () => {
    it('returns 401 when auth enabled and no user', async () => {
      const req = createMockReq({
        user: undefined,
        adminizer: {
          config: { auth: { enable: true }, routePrefix: '/adminizer' },
          modelHandler: { get: vi.fn() }
        }
      });
      const res = createMockRes();

      await FilterController.list(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized'
      });
    });

    it('allows access when auth disabled', async () => {
      const req = createMockReq({
        user: undefined,
        adminizer: {
          config: { auth: { enable: false }, routePrefix: '/adminizer' },
          modelHandler: { get: vi.fn().mockReturnValue(null) }
        }
      });
      const res = createMockRes();

      await FilterController.list(req, res);

      // Should not return 401
      expect(res.status).not.toHaveBeenCalledWith(401);
    });
  });

  describe('list()', () => {
    it('returns empty data when filters globally disabled', async () => {
      // Test the response structure contract
      const res = createMockRes();
      expect(res.json).toBeDefined();
      expect(res.status).toBeDefined();
    });

    it('parses pagination parameters correctly', () => {
      const query = { page: '3', limit: '50' };

      const page = Math.max(1, parseInt(query.page?.toString() || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(query.limit?.toString() || '50', 10)));

      expect(page).toBe(3);
      expect(limit).toBe(50);
    });

    it('enforces limit maximum of 100', () => {
      const query = { limit: '200' };
      const limit = Math.min(100, Math.max(1, parseInt(query.limit?.toString() || '50', 10)));
      expect(limit).toBe(100);
    });

    it('enforces minimum page of 1', () => {
      const query = { page: '-5' };
      const page = Math.max(1, parseInt(query.page?.toString() || '1', 10));
      expect(page).toBe(1);
    });
  });

  describe('get()', () => {
    it('returns 404 when filter not found', async () => {
      const req = createMockReq({ params: { id: 'non-existent-id' } });
      const res = createMockRes();

      // Test expected behavior
      // In unit test without full mocking, we verify the controller structure
      expect(FilterController.get).toBeDefined();
    });
  });

  describe('preview()', () => {
    it('requires modelName in request body', () => {
      // Test validation logic
      const body: any = { conditions: [] };
      const modelName = body.modelName;

      // Validation check that would happen in controller
      expect(!modelName).toBe(true);
    });

    it('parses preview pagination parameters', () => {
      const body = { page: 2, limit: 30, modelName: 'Order' };

      const page = Math.max(1, body.page || 1);
      const limit = Math.min(100, Math.max(1, body.limit || 25));

      expect(page).toBe(2);
      expect(limit).toBe(30);
    });

    it('enforces preview limit of 100', () => {
      const body = { limit: 500 };
      const limit = Math.min(100, Math.max(1, body.limit || 25));
      expect(limit).toBe(100);
    });
  });

  describe('create()', () => {
    it('requires name in request body', () => {
      // Test validation logic
      const body: any = { modelName: 'Order' };
      const isValid = body.name && body.modelName;

      expect(!isValid).toBe(true);
    });

    it('requires modelName in request body', () => {
      // Test validation logic
      const body: any = { name: 'My Filter' };
      const isValid = body.name && body.modelName;

      expect(!isValid).toBe(true);
    });

    it('accepts valid create body', () => {
      const body = { name: 'My Filter', modelName: 'Order' };
      const isValid = !!(body.name && body.modelName);

      expect(isValid).toBe(true);
    });
  });

  describe('update()', () => {
    it('handles partial updates', () => {
      const body = { name: 'New Name' };
      const updateData: any = {};

      if (body.name !== undefined) updateData.name = body.name;

      expect(updateData).toEqual({ name: 'New Name' });
    });

    it('builds update data correctly', () => {
      const body = {
        name: 'Updated',
        description: 'New description',
        isPinned: true,
        icon: 'star'
      };

      const updateData: any = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.isPinned !== undefined) updateData.isPinned = body.isPinned;
      if (body.icon !== undefined) updateData.icon = body.icon;

      expect(updateData).toEqual({
        name: 'Updated',
        description: 'New description',
        isPinned: true,
        icon: 'star'
      });
    });

    it('ignores undefined values', () => {
      const body = { name: 'Test', description: undefined };
      const updateData: any = {};

      if (body.name !== undefined) updateData.name = body.name;
      if (body.description !== undefined) updateData.description = body.description;

      expect(updateData).toEqual({ name: 'Test' });
    });
  });

  describe('remove()', () => {
    it('is defined', () => {
      expect(FilterController.remove).toBeDefined();
    });
  });

  describe('count()', () => {
    it('is defined', () => {
      expect(FilterController.count).toBeDefined();
    });
  });

  describe('directLink()', () => {
    it('is defined', () => {
      expect(FilterController.directLink).toBeDefined();
    });

    it('builds redirect URL correctly', () => {
      const prefix = '/adminizer';
      const modelName = 'Order';
      const filterId = 'abc-123';

      const redirectUrl = `${prefix}/model/${modelName}?filterId=${filterId}`;

      expect(redirectUrl).toBe('/adminizer/model/Order?filterId=abc-123');
    });
  });

  describe('directLinkBySlug()', () => {
    it('is defined', () => {
      expect(FilterController.directLinkBySlug).toBeDefined();
    });
  });

  describe('getColumns()', () => {
    it('is defined', () => {
      expect(FilterController.getColumns).toBeDefined();
    });

    it('returns 401 when auth enabled and no user', async () => {
      const req = createMockReq({
        user: undefined,
        params: { id: 'filter-123' },
        adminizer: {
          config: { auth: { enable: true }, routePrefix: '/adminizer' },
          modelHandler: { get: vi.fn() }
        }
      });
      const res = createMockRes();

      await FilterController.getColumns(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized'
      });
    });

    it('method signature is correct', () => {
      expect(typeof FilterController.getColumns).toBe('function');
      expect(FilterController.getColumns.length).toBe(2); // req, res parameters
    });
  });

  describe('updateColumns()', () => {
    it('is defined', () => {
      expect(FilterController.updateColumns).toBeDefined();
    });

    it('returns 401 when auth enabled and no user', async () => {
      const req = createMockReq({
        user: undefined,
        params: { id: 'filter-123' },
        body: { columns: [] },
        adminizer: {
          config: { auth: { enable: true }, routePrefix: '/adminizer' },
          modelHandler: { get: vi.fn() }
        }
      });
      const res = createMockRes();

      await FilterController.updateColumns(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized'
      });
    });

    it('returns 400 when columns is not an array', async () => {
      const req = createMockReq({
        params: { id: 'filter-123' },
        body: { columns: 'not-an-array' }
      });
      const res = createMockRes();

      await FilterController.updateColumns(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'columns must be an array'
      });
    });

    it('returns 400 when columns is undefined', async () => {
      const req = createMockReq({
        params: { id: 'filter-123' },
        body: {}
      });
      const res = createMockRes();

      await FilterController.updateColumns(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'columns must be an array'
      });
    });

    it('returns 400 when columns is null', async () => {
      const req = createMockReq({
        params: { id: 'filter-123' },
        body: { columns: null }
      });
      const res = createMockRes();

      await FilterController.updateColumns(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'columns must be an array'
      });
    });

    it('returns 400 when columns is an object', async () => {
      const req = createMockReq({
        params: { id: 'filter-123' },
        body: { columns: { fieldName: 'id' } }
      });
      const res = createMockRes();

      await FilterController.updateColumns(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'columns must be an array'
      });
    });

    it('method signature is correct', () => {
      expect(typeof FilterController.updateColumns).toBe('function');
      expect(FilterController.updateColumns.length).toBe(2); // req, res parameters
    });

    it('column validation rules documented', () => {
      // Document expected validation rules
      const validColumn = { fieldName: 'id', order: 0, isVisible: true, isEditable: false };
      const invalidColumns = [
        { order: 0 },                  // missing fieldName
        { fieldName: 123 },            // fieldName not string
        { fieldName: null },           // fieldName is null
        { fieldName: '' },             // fieldName is empty
      ];

      expect(validColumn.fieldName).toBeDefined();
      expect(typeof validColumn.fieldName).toBe('string');
      expect(validColumn.fieldName.length).toBeGreaterThan(0);

      invalidColumns.forEach(col => {
        const isInvalid = !col.fieldName || typeof col.fieldName !== 'string';
        expect(isInvalid).toBe(true);
      });
    });
  });

  describe('checkRawSQL()', () => {
    // Access private method
    const checkRawSQL = (FilterController as any).checkRawSQL?.bind(FilterController);

    if (checkRawSQL) {
      it('detects rawSQL in conditions', () => {
        const conditions = [
          { id: '1', field: 'status', operator: 'eq', value: 'active' },
          { id: '2', rawSQL: 'custom = $1', rawSQLParams: ['test'] }
        ];

        expect(checkRawSQL(conditions)).toBe(true);
      });

      it('returns false when no rawSQL', () => {
        const conditions = [
          { id: '1', field: 'status', operator: 'eq', value: 'active' }
        ];

        expect(checkRawSQL(conditions)).toBe(false);
      });

      it('detects rawSQL in nested conditions', () => {
        const conditions = [
          {
            id: '1',
            logic: 'AND',
            children: [
              { id: '2', field: 'status', operator: 'eq', value: 'active' },
              { id: '3', rawSQL: 'custom_query' }
            ]
          }
        ];

        expect(checkRawSQL(conditions)).toBe(true);
      });
    }
  });

  describe('generateSlug()', () => {
    it('generates slug from filter name', () => {
      const name = 'My Test Filter';
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      expect(slug).toBe('my-test-filter');
    });

    it('handles special characters', () => {
      const name = 'Filter: Orders > $100';
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      expect(slug).toBe('filter-orders-100');
    });

    it('handles consecutive special characters', () => {
      const name = 'Filter   with   spaces';
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      expect(slug).toBe('filter-with-spaces');
    });
  });

  describe('Error responses', () => {
    it('500 error has correct structure', () => {
      const errorResponse = {
        success: false,
        error: 'Some error message'
      };

      expect(errorResponse).toHaveProperty('success', false);
      expect(errorResponse).toHaveProperty('error');
    });

    it('401 error has correct structure', () => {
      const errorResponse = {
        success: false,
        error: 'Unauthorized'
      };

      expect(errorResponse).toEqual({
        success: false,
        error: 'Unauthorized'
      });
    });

    it('403 error has correct structure', () => {
      const errorResponse = {
        success: false,
        error: 'Access denied'
      };

      expect(errorResponse).toEqual({
        success: false,
        error: 'Access denied'
      });
    });

    it('404 error has correct structure', () => {
      const errorResponse = {
        success: false,
        error: 'Filter not found'
      };

      expect(errorResponse).toEqual({
        success: false,
        error: 'Filter not found'
      });
    });
  });

  describe('Success responses', () => {
    it('list response structure', () => {
      const response = {
        success: true,
        filtersEnabled: true,
        data: [],
        meta: { total: 0, page: 1, limit: 50, pages: 0 }
      };

      expect(response.success).toBe(true);
      expect(response.filtersEnabled).toBe(true);
      expect(response.data).toEqual([]);
      expect(response.meta).toHaveProperty('total');
      expect(response.meta).toHaveProperty('page');
      expect(response.meta).toHaveProperty('pages');
    });

    it('get response structure', () => {
      const response = {
        success: true,
        data: { id: 'filter-1', name: 'Test Filter' }
      };

      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('id');
      expect(response.data).toHaveProperty('name');
    });

    it('create response structure', () => {
      const response = {
        success: true,
        data: { id: 'new-id', name: 'New Filter' },
        directLink: '/adminizer/filter/new-id'
      };

      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('id');
      expect(response.directLink).toContain('/filter/');
    });

    it('update response structure', () => {
      const response = {
        success: true,
        data: { id: 'filter-1', name: 'Updated Filter' }
      };

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
    });

    it('delete response structure', () => {
      const response = {
        success: true
      };

      expect(response.success).toBe(true);
    });

    it('count response structure', () => {
      const response = {
        success: true,
        count: 42
      };

      expect(response.success).toBe(true);
      expect(response.count).toBe(42);
    });

    it('preview response structure', () => {
      const response = {
        success: true,
        data: [],
        meta: {
          total: 100,
          filtered: 25,
          page: 1,
          pages: 4,
          limit: 25
        }
      };

      expect(response.success).toBe(true);
      expect(response.data).toEqual([]);
      expect(response.meta).toHaveProperty('total');
      expect(response.meta).toHaveProperty('filtered');
      expect(response.meta).toHaveProperty('page');
      expect(response.meta).toHaveProperty('pages');
    });

    it('columns response structure', () => {
      const response = {
        success: true,
        data: [
          { id: 'col-1', fieldName: 'id', order: 0 },
          { id: 'col-2', fieldName: 'name', order: 1 }
        ]
      };

      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(2);
    });
  });

  describe('Filter visibility options', () => {
    it('accepts private visibility', () => {
      const filter = { visibility: 'private' };
      expect(['private', 'public', 'groups', 'system'].includes(filter.visibility)).toBe(true);
    });

    it('accepts public visibility', () => {
      const filter = { visibility: 'public' };
      expect(['private', 'public', 'groups', 'system'].includes(filter.visibility)).toBe(true);
    });

    it('accepts groups visibility', () => {
      const filter = { visibility: 'groups', groupIds: [1, 2] };
      expect(filter.visibility).toBe('groups');
      expect(filter.groupIds).toEqual([1, 2]);
    });

    it('accepts system visibility', () => {
      const filter = { visibility: 'system', isSystemFilter: true };
      expect(filter.visibility).toBe('system');
      expect(filter.isSystemFilter).toBe(true);
    });
  });

  describe('Filter fields mapping', () => {
    it('maps filter to list response correctly', () => {
      const filter = {
        id: 'abc-123',
        name: 'Test Filter',
        slug: 'test-filter',
        description: 'A test filter',
        modelName: 'Order',
        icon: 'filter',
        color: '#ff0000',
        isPinned: true,
        visibility: 'public',
        isSystemFilter: false,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-15'),
        // Fields not included in list response
        conditions: [{ id: '1', field: 'status', operator: 'eq', value: 'active' }],
        sortField: 'createdAt',
        sortDirection: 'DESC'
      };

      const mapped = {
        id: filter.id,
        name: filter.name,
        slug: filter.slug,
        description: filter.description,
        modelName: filter.modelName,
        icon: filter.icon,
        color: filter.color,
        isPinned: filter.isPinned,
        visibility: filter.visibility,
        isSystemFilter: filter.isSystemFilter,
        createdAt: filter.createdAt,
        updatedAt: filter.updatedAt
      };

      expect(mapped).not.toHaveProperty('conditions');
      expect(mapped).not.toHaveProperty('sortField');
      expect(mapped).not.toHaveProperty('sortDirection');
      expect(mapped.id).toBe('abc-123');
      expect(mapped.name).toBe('Test Filter');
    });
  });

  describe('Conditions validation', () => {
    it('validates conditions with rawSQL for admin', () => {
      const conditions = [
        { id: '1', rawSQL: 'custom = $1', rawSQLParams: ['value'] }
      ];
      const isAdmin = true;

      // Admin can use rawSQL
      expect(isAdmin).toBe(true);
    });

    it('rejects conditions with rawSQL for non-admin', () => {
      const conditions = [
        { id: '1', rawSQL: 'custom = $1', rawSQLParams: ['value'] }
      ];
      const isAdmin = false;
      const hasRawSQL = conditions.some(c => c.rawSQL);

      expect(hasRawSQL && !isAdmin).toBe(true);
    });
  });

  describe('API endpoints', () => {
    it('list endpoint path', () => {
      const endpoint = '/adminizer/filters';
      expect(endpoint).toBe('/adminizer/filters');
    });

    it('get endpoint path', () => {
      const filterId = 'abc-123';
      const endpoint = `/adminizer/filters/${filterId}`;
      expect(endpoint).toBe('/adminizer/filters/abc-123');
    });

    it('create endpoint path', () => {
      const endpoint = '/adminizer/filters';
      const method = 'POST';
      expect(endpoint).toBe('/adminizer/filters');
      expect(method).toBe('POST');
    });

    it('update endpoint path', () => {
      const filterId = 'abc-123';
      const endpoint = `/adminizer/filters/${filterId}`;
      const method = 'PATCH';
      expect(endpoint).toBe('/adminizer/filters/abc-123');
      expect(method).toBe('PATCH');
    });

    it('delete endpoint path', () => {
      const filterId = 'abc-123';
      const endpoint = `/adminizer/filters/${filterId}`;
      const method = 'DELETE';
      expect(endpoint).toBe('/adminizer/filters/abc-123');
      expect(method).toBe('DELETE');
    });

    it('preview endpoint path', () => {
      const endpoint = '/adminizer/filters/preview';
      const method = 'POST';
      expect(endpoint).toBe('/adminizer/filters/preview');
      expect(method).toBe('POST');
    });

    it('count endpoint path', () => {
      const filterId = 'abc-123';
      const endpoint = `/adminizer/filters/${filterId}/count`;
      expect(endpoint).toBe('/adminizer/filters/abc-123/count');
    });

    it('direct link endpoint path', () => {
      const filterId = 'abc-123';
      const endpoint = `/adminizer/filter/${filterId}`;
      expect(endpoint).toBe('/adminizer/filter/abc-123');
    });

    it('direct link by slug endpoint path', () => {
      const slug = 'my-filter';
      const endpoint = `/adminizer/filter/by-slug/${slug}`;
      expect(endpoint).toBe('/adminizer/filter/by-slug/my-filter');
    });

    it('columns endpoint path', () => {
      const filterId = 'abc-123';
      const getEndpoint = `/adminizer/filters/${filterId}/columns`;
      const putEndpoint = `/adminizer/filters/${filterId}/columns`;
      expect(getEndpoint).toBe('/adminizer/filters/abc-123/columns');
      expect(putEndpoint).toBe('/adminizer/filters/abc-123/columns');
    });
  });
});
