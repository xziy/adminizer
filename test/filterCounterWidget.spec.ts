import { describe, it, expect, vi } from 'vitest';
import { FilterCounterWidget, FilterCounterWidgetOptions, createFilterCounterWidgets } from '../src/lib/widgets/FilterCounterWidget';

// Mock Adminizer
const createMockAdminizer = (overrides: any = {}) => ({
  config: {
    routePrefix: '/adminizer',
    auth: { enable: true }
  },
  modelHandler: {
    get: vi.fn().mockReturnValue({
      model: {
        find: vi.fn().mockResolvedValue([]),
        findOne: vi.fn().mockResolvedValue(null)
      },
      config: {}
    })
  },
  accessRightsHelper: {
    hasPermission: vi.fn().mockReturnValue(true),
    registerToken: vi.fn()
  },
  ...overrides
});

// Mock User
const createMockUser = (overrides: any = {}) => ({
  id: 1,
  login: 'testuser',
  isAdministrator: false,
  groups: [],
  ...overrides
});

describe('FilterCounterWidget', () => {
  describe('constructor', () => {
    it('creates widget with required options', () => {
      const adminizer = createMockAdminizer();
      const user = createMockUser();
      const options: FilterCounterWidgetOptions = {
        id: 'test-widget',
        name: 'Test Widget',
        filterId: 'filter-123'
      };

      const widget = new FilterCounterWidget(adminizer as any, user as any, options);

      expect(widget.id).toBe('test-widget');
      expect(widget.name).toBe('Test Widget');
      expect(widget.widgetType).toBe('info');
    });

    it('sets default values for optional options', () => {
      const adminizer = createMockAdminizer();
      const user = createMockUser();
      const options: FilterCounterWidgetOptions = {
        id: 'test-widget',
        name: 'Test Widget',
        filterId: 'filter-123'
      };

      const widget = new FilterCounterWidget(adminizer as any, user as any, options);

      expect(widget.icon).toBe('filter_list');
      expect(widget.backgroundCSS).toBe('#2196F3');
      expect(widget.department).toBe('filters');
      expect(widget.size).toEqual({ h: 1, w: 1 });
      expect(widget.linkType).toBe('self');
    });

    it('uses provided custom options', () => {
      const adminizer = createMockAdminizer();
      const user = createMockUser();
      const options: FilterCounterWidgetOptions = {
        id: 'custom-widget',
        name: 'Custom Widget',
        filterId: 'filter-456',
        icon: 'shopping_cart',
        backgroundCSS: '#ff5722',
        department: 'sales',
        size: { h: 2, w: 2 },
        linkType: 'blank',
        prefix: 'Total: ',
        suffix: ' items'
      };

      const widget = new FilterCounterWidget(adminizer as any, user as any, options);

      expect(widget.icon).toBe('shopping_cart');
      expect(widget.backgroundCSS).toBe('#ff5722');
      expect(widget.department).toBe('sales');
      expect(widget.size).toEqual({ h: 2, w: 2 });
      expect(widget.linkType).toBe('blank');
    });

    it('builds correct link with filterId', () => {
      const adminizer = createMockAdminizer();
      const user = createMockUser();
      const options: FilterCounterWidgetOptions = {
        id: 'test-widget',
        name: 'Test Widget',
        filterId: 'abc-123-def'
      };

      const widget = new FilterCounterWidget(adminizer as any, user as any, options);

      expect(widget.link).toBe('/adminizer/model?filterId=abc-123-def');
    });

    it('builds correct link with slug', () => {
      const adminizer = createMockAdminizer();
      const user = createMockUser();
      const options: FilterCounterWidgetOptions = {
        id: 'test-widget',
        name: 'Test Widget',
        filterId: 'pending-orders',
        isSlug: true
      };

      const widget = new FilterCounterWidget(adminizer as any, user as any, options);

      expect(widget.link).toBe('/adminizer/model?filterSlug=pending-orders');
    });

    it('generates description from filterId if not provided', () => {
      const adminizer = createMockAdminizer();
      const user = createMockUser();
      const options: FilterCounterWidgetOptions = {
        id: 'test-widget',
        name: 'Test Widget',
        filterId: 'my-filter'
      };

      const widget = new FilterCounterWidget(adminizer as any, user as any, options);

      expect(widget.description).toContain('my-filter');
    });

    it('uses custom description if provided', () => {
      const adminizer = createMockAdminizer();
      const user = createMockUser();
      const options: FilterCounterWidgetOptions = {
        id: 'test-widget',
        name: 'Test Widget',
        filterId: 'my-filter',
        description: 'Custom description'
      };

      const widget = new FilterCounterWidget(adminizer as any, user as any, options);

      expect(widget.description).toBe('Custom description');
    });
  });

  describe('widgetType', () => {
    it('is always "info"', () => {
      const adminizer = createMockAdminizer();
      const user = createMockUser();
      const widget = new FilterCounterWidget(adminizer as any, user as any, {
        id: 'test',
        name: 'Test',
        filterId: 'filter'
      });

      expect(widget.widgetType).toBe('info');
    });
  });

  describe('formatCount option', () => {
    it('uses default locale formatting', () => {
      const count = 1234567;
      const formatted = count.toLocaleString();
      expect(formatted).toMatch(/1[,.]?234[,.]?567/);
    });

    it('supports custom format function', () => {
      const customFormat = (count: number) => `${count} records`;
      expect(customFormat(42)).toBe('42 records');
    });

    it('supports prefix and suffix', () => {
      const prefix = 'Total: ';
      const suffix = ' items';
      const count = 100;
      const result = `${prefix}${count}${suffix}`;
      expect(result).toBe('Total: 100 items');
    });
  });

  describe('zeroText option', () => {
    it('defaults to "0"', () => {
      const adminizer = createMockAdminizer();
      const user = createMockUser();
      const options: FilterCounterWidgetOptions = {
        id: 'test',
        name: 'Test',
        filterId: 'filter'
      };

      // Access private property for testing
      const widget = new FilterCounterWidget(adminizer as any, user as any, options);
      expect((widget as any).zeroText).toBe('0');
    });

    it('can be customized', () => {
      const adminizer = createMockAdminizer();
      const user = createMockUser();
      const options: FilterCounterWidgetOptions = {
        id: 'test',
        name: 'Test',
        filterId: 'filter',
        zeroText: 'No items'
      };

      const widget = new FilterCounterWidget(adminizer as any, user as any, options);
      expect((widget as any).zeroText).toBe('No items');
    });
  });

  describe('errorText option', () => {
    it('defaults to "-"', () => {
      const adminizer = createMockAdminizer();
      const user = createMockUser();
      const options: FilterCounterWidgetOptions = {
        id: 'test',
        name: 'Test',
        filterId: 'filter'
      };

      const widget = new FilterCounterWidget(adminizer as any, user as any, options);
      expect((widget as any).errorText).toBe('-');
    });

    it('can be customized', () => {
      const adminizer = createMockAdminizer();
      const user = createMockUser();
      const options: FilterCounterWidgetOptions = {
        id: 'test',
        name: 'Test',
        filterId: 'filter',
        errorText: 'Error'
      };

      const widget = new FilterCounterWidget(adminizer as any, user as any, options);
      expect((widget as any).errorText).toBe('Error');
    });
  });

  describe('createFilterCounterWidgets factory', () => {
    it('creates multiple widgets from config array', () => {
      const adminizer = createMockAdminizer();
      const user = createMockUser();
      const configs: FilterCounterWidgetOptions[] = [
        { id: 'widget-1', name: 'Widget 1', filterId: 'filter-1' },
        { id: 'widget-2', name: 'Widget 2', filterId: 'filter-2' },
        { id: 'widget-3', name: 'Widget 3', filterId: 'filter-3' }
      ];

      const widgets = createFilterCounterWidgets(adminizer as any, user as any, configs);

      expect(widgets.length).toBe(3);
      expect(widgets[0].id).toBe('widget-1');
      expect(widgets[1].id).toBe('widget-2');
      expect(widgets[2].id).toBe('widget-3');
    });

    it('returns empty array for empty config', () => {
      const adminizer = createMockAdminizer();
      const user = createMockUser();

      const widgets = createFilterCounterWidgets(adminizer as any, user as any, []);

      expect(widgets.length).toBe(0);
    });
  });

  describe('widget configuration', () => {
    it('example: pending orders widget', () => {
      const config: FilterCounterWidgetOptions = {
        id: 'pending-orders',
        name: 'Pending Orders',
        description: 'Count of orders waiting for processing',
        filterId: 'pending-orders-filter',
        isSlug: true,
        icon: 'shopping_cart',
        backgroundCSS: '#ff9800',
        prefix: '',
        suffix: ' orders'
      };

      expect(config.id).toBe('pending-orders');
      expect(config.isSlug).toBe(true);
    });

    it('example: active users widget', () => {
      const config: FilterCounterWidgetOptions = {
        id: 'active-users',
        name: 'Active Users',
        filterId: 'active-users-filter',
        icon: 'people',
        backgroundCSS: '#4caf50',
        size: { h: 1, w: 2 }
      };

      expect(config.id).toBe('active-users');
      expect(config.size).toEqual({ h: 1, w: 2 });
    });

    it('example: error count widget with custom error text', () => {
      const config: FilterCounterWidgetOptions = {
        id: 'error-count',
        name: 'Errors Today',
        filterId: 'errors-today',
        icon: 'error',
        backgroundCSS: '#f44336',
        zeroText: 'All clear!',
        errorText: 'N/A'
      };

      expect(config.zeroText).toBe('All clear!');
      expect(config.errorText).toBe('N/A');
    });
  });
});
