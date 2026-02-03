import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  FilterBuilder,
  FilterHookType,
  FilterHookCallback,
  FilterDefinition
} from '../src/lib/filters/FilterBuilder';
import { FilterAP } from '../src/models/FilterAP';

// Mock Adminizer for isolated testing
const mockAdminizer = {} as any;

describe('FilterBuilder', () => {
  // Clear hooks between tests
  beforeEach(() => {
    // Clear registered filters using internal access
    (FilterBuilder as any).registeredFilters = new Map();
    (FilterBuilder as any).hooks = new Map();
  });

  describe('Fluent API - basic methods', () => {
    it('creates empty builder with defaults', () => {
      const builder = FilterBuilder.create(mockAdminizer);
      const result = builder.build();

      expect(result.conditions).toEqual([]);
      expect(result.visibility).toBe('private');
      expect(result.version).toBe(1);
      expect(result.apiEnabled).toBe(false);
      expect(result.isPinned).toBe(false);
      expect(result.isSystemFilter).toBe(false);
    });

    it('sets model name with forModel()', () => {
      const result = FilterBuilder.create(mockAdminizer)
        .forModel('Order')
        .build();

      expect(result.modelName).toBe('Order');
    });

    it('sets name with named()', () => {
      const result = FilterBuilder.create(mockAdminizer)
        .named('Recent Orders')
        .build();

      expect(result.name).toBe('Recent Orders');
    });

    it('sets description with described()', () => {
      const result = FilterBuilder.create(mockAdminizer)
        .described('Orders from the last 7 days')
        .build();

      expect(result.description).toBe('Orders from the last 7 days');
    });

    it('sets slug with withSlug()', () => {
      const result = FilterBuilder.create(mockAdminizer)
        .withSlug('recent-orders')
        .build();

      expect(result.slug).toBe('recent-orders');
    });

    it('sets sort with sortBy()', () => {
      const result = FilterBuilder.create(mockAdminizer)
        .sortBy('createdAt', 'DESC')
        .build();

      expect(result.sortField).toBe('createdAt');
      expect(result.sortDirection).toBe('DESC');
    });

    it('defaults sortDirection to DESC', () => {
      const result = FilterBuilder.create(mockAdminizer)
        .sortBy('updatedAt')
        .build();

      expect(result.sortDirection).toBe('DESC');
    });
  });

  describe('Fluent API - visibility', () => {
    it('sets private visibility with asPrivate()', () => {
      const result = FilterBuilder.create(mockAdminizer)
        .asPrivate()
        .build();

      expect(result.visibility).toBe('private');
    });

    it('sets public visibility with asPublic()', () => {
      const result = FilterBuilder.create(mockAdminizer)
        .asPublic()
        .build();

      expect(result.visibility).toBe('public');
    });

    it('sets group visibility with forGroups()', () => {
      const result = FilterBuilder.create(mockAdminizer)
        .forGroups([1, 2, 3])
        .build();

      expect(result.visibility).toBe('groups');
      expect(result.groupIds).toEqual([1, 2, 3]);
    });

    it('sets system visibility with asSystem()', () => {
      const result = FilterBuilder.create(mockAdminizer)
        .asSystem()
        .build();

      expect(result.visibility).toBe('system');
      expect(result.isSystemFilter).toBe(true);
    });
  });

  describe('Fluent API - UI options', () => {
    it('enables API access with withApiAccess()', () => {
      const result = FilterBuilder.create(mockAdminizer)
        .withApiAccess(true)
        .build();

      expect(result.apiEnabled).toBe(true);
      expect(result.apiKey).toBeDefined();
      expect(result.apiKey?.length).toBeGreaterThan(0);
    });

    it('sets icon with withIcon()', () => {
      const result = FilterBuilder.create(mockAdminizer)
        .withIcon('shopping-cart')
        .build();

      expect(result.icon).toBe('shopping-cart');
    });

    it('sets color with withColor()', () => {
      const result = FilterBuilder.create(mockAdminizer)
        .withColor('#ff5500')
        .build();

      expect(result.color).toBe('#ff5500');
    });

    it('sets pinned with pinned()', () => {
      const result = FilterBuilder.create(mockAdminizer)
        .pinned(true)
        .build();

      expect(result.isPinned).toBe(true);
    });
  });

  describe('Fluent API - conditions', () => {
    it('adds simple condition with where()', () => {
      const result = FilterBuilder.create(mockAdminizer)
        .where('status', 'eq', 'active')
        .build();

      expect(result.conditions).toHaveLength(1);
      expect(result.conditions![0].field).toBe('status');
      expect(result.conditions![0].operator).toBe('eq');
      expect(result.conditions![0].value).toBe('active');
    });

    it('adds multiple conditions with andWhere()', () => {
      const result = FilterBuilder.create(mockAdminizer)
        .where('status', 'eq', 'active')
        .andWhere('total', 'gte', 100)
        .build();

      expect(result.conditions).toHaveLength(2);
      expect(result.conditions![0].field).toBe('status');
      expect(result.conditions![1].field).toBe('total');
    });

    it('adds isNull condition with whereNull()', () => {
      const result = FilterBuilder.create(mockAdminizer)
        .whereNull('deletedAt')
        .build();

      expect(result.conditions![0].field).toBe('deletedAt');
      expect(result.conditions![0].operator).toBe('isNull');
    });

    it('adds isNotNull condition with whereNotNull()', () => {
      const result = FilterBuilder.create(mockAdminizer)
        .whereNotNull('paidAt')
        .build();

      expect(result.conditions![0].field).toBe('paidAt');
      expect(result.conditions![0].operator).toBe('isNotNull');
    });

    it('adds IN condition with whereIn()', () => {
      const result = FilterBuilder.create(mockAdminizer)
        .whereIn('status', ['pending', 'processing'])
        .build();

      expect(result.conditions![0].operator).toBe('in');
      expect(result.conditions![0].value).toEqual(['pending', 'processing']);
    });

    it('adds NOT IN condition with whereNotIn()', () => {
      const result = FilterBuilder.create(mockAdminizer)
        .whereNotIn('status', ['deleted', 'cancelled'])
        .build();

      expect(result.conditions![0].operator).toBe('notIn');
      expect(result.conditions![0].value).toEqual(['deleted', 'cancelled']);
    });

    it('adds BETWEEN condition with whereBetween()', () => {
      const result = FilterBuilder.create(mockAdminizer)
        .whereBetween('total', 100, 500)
        .build();

      expect(result.conditions![0].operator).toBe('between');
      expect(result.conditions![0].value).toEqual([100, 500]);
    });

    it('adds LIKE condition with whereLike()', () => {
      const result = FilterBuilder.create(mockAdminizer)
        .whereLike('name', 'John')
        .build();

      expect(result.conditions![0].operator).toBe('like');
      expect(result.conditions![0].value).toBe('John');
    });

    it('adds ILIKE condition with whereILike()', () => {
      const result = FilterBuilder.create(mockAdminizer)
        .whereILike('email', 'test@')
        .build();

      expect(result.conditions![0].operator).toBe('ilike');
      expect(result.conditions![0].value).toBe('test@');
    });

    it('adds relation condition with whereRelation()', () => {
      const result = FilterBuilder.create(mockAdminizer)
        .whereRelation('customer', 'name', 'like', 'John')
        .build();

      expect(result.conditions![0].relation).toBe('customer');
      expect(result.conditions![0].relationField).toBe('name');
      expect(result.conditions![0].operator).toBe('like');
    });

    it('adds custom handler condition with whereCustom()', () => {
      const result = FilterBuilder.create(mockAdminizer)
        .whereCustom('Order.phone', 'like', '900', { normalize: true })
        .build();

      expect(result.conditions![0].customHandler).toBe('Order.phone');
      expect(result.conditions![0].operator).toBe('like');
      expect(result.conditions![0].customHandlerParams).toEqual({ normalize: true });
    });

    it('adds raw SQL condition with whereRaw()', () => {
      const result = FilterBuilder.create(mockAdminizer)
        .whereRaw('total > $1 AND discount < $2', [100, 50])
        .build();

      expect(result.conditions![0].rawSQL).toBe('total > $1 AND discount < $2');
      expect(result.conditions![0].rawSQLParams).toEqual([100, 50]);
    });
  });

  describe('Fluent API - groups', () => {
    it('creates AND group with startAndGroup()/endGroup()', () => {
      const result = FilterBuilder.create(mockAdminizer)
        .startAndGroup()
          .where('status', 'eq', 'active')
          .where('verified', 'eq', true)
        .endGroup()
        .build();

      expect(result.conditions).toHaveLength(1);
      expect(result.conditions![0].logic).toBe('AND');
      expect(result.conditions![0].children).toHaveLength(2);
    });

    it('creates OR group with startOrGroup()/endGroup()', () => {
      const result = FilterBuilder.create(mockAdminizer)
        .startOrGroup()
          .where('status', 'eq', 'pending')
          .where('status', 'eq', 'processing')
        .endGroup()
        .build();

      expect(result.conditions).toHaveLength(1);
      expect(result.conditions![0].logic).toBe('OR');
      expect(result.conditions![0].children).toHaveLength(2);
    });

    it('creates nested groups', () => {
      const result = FilterBuilder.create(mockAdminizer)
        .where('active', 'eq', true)
        .startOrGroup()
          .where('status', 'eq', 'pending')
          .startAndGroup()
            .where('total', 'gte', 1000)
            .where('priority', 'eq', 'high')
          .endGroup()
        .endGroup()
        .build();

      expect(result.conditions).toHaveLength(2);
      // First condition is simple
      expect(result.conditions![0].field).toBe('active');
      // Second is OR group
      expect(result.conditions![1].logic).toBe('OR');
      expect(result.conditions![1].children).toHaveLength(2);
      // Inside OR group there's an AND group
      expect(result.conditions![1].children![1].logic).toBe('AND');
      expect(result.conditions![1].children![1].children).toHaveLength(2);
    });
  });

  describe('Fluent API - columns', () => {
    it('adds single column with withColumn()', () => {
      const builder = FilterBuilder.create(mockAdminizer)
        .withColumn('name');

      // Access private columnsData
      const columnsData = (builder as any).columnsData;

      expect(columnsData).toHaveLength(1);
      expect(columnsData[0].fieldName).toBe('name');
      expect(columnsData[0].order).toBe(0);
      expect(columnsData[0].isVisible).toBe(true);
      expect(columnsData[0].isEditable).toBe(false);
    });

    it('adds column with options', () => {
      const builder = FilterBuilder.create(mockAdminizer)
        .withColumn('total', {
          order: 5,
          width: 150,
          isVisible: true,
          isEditable: true
        });

      const columnsData = (builder as any).columnsData;

      expect(columnsData[0].order).toBe(5);
      expect(columnsData[0].width).toBe(150);
      expect(columnsData[0].isEditable).toBe(true);
    });

    it('adds multiple columns with withColumns()', () => {
      const builder = FilterBuilder.create(mockAdminizer)
        .withColumns([
          { fieldName: 'id', order: 0 },
          { fieldName: 'name', order: 1 },
          { fieldName: 'status', order: 2, isVisible: false }
        ]);

      const columnsData = (builder as any).columnsData;

      expect(columnsData).toHaveLength(3);
      expect(columnsData[0].fieldName).toBe('id');
      expect(columnsData[1].fieldName).toBe('name');
      expect(columnsData[2].fieldName).toBe('status');
      expect(columnsData[2].isVisible).toBe(false);
    });

    it('auto-increments order when not specified', () => {
      const builder = FilterBuilder.create(mockAdminizer)
        .withColumn('a')
        .withColumn('b')
        .withColumn('c');

      const columnsData = (builder as any).columnsData;

      expect(columnsData[0].order).toBe(0);
      expect(columnsData[1].order).toBe(1);
      expect(columnsData[2].order).toBe(2);
    });
  });

  describe('Static methods - hooks', () => {
    it('registers and retrieves hooks with onHook()', () => {
      const callback: FilterHookCallback = async (filter) => filter;

      FilterBuilder.onHook('beforeCreate', callback);

      const hooks = (FilterBuilder as any).hooks.get('beforeCreate');
      expect(hooks).toContain(callback);
    });

    it('removes hook with offHook()', () => {
      const callback: FilterHookCallback = async (filter) => filter;

      FilterBuilder.onHook('beforeCreate', callback);
      FilterBuilder.offHook('beforeCreate', callback);

      const hooks = (FilterBuilder as any).hooks.get('beforeCreate');
      expect(hooks).not.toContain(callback);
    });

    it('runs hooks in order with runHooks()', async () => {
      const order: number[] = [];

      FilterBuilder.onHook('beforeCreate', async (filter) => {
        order.push(1);
        return { ...filter, name: filter.name + '-1' };
      });

      FilterBuilder.onHook('beforeCreate', async (filter) => {
        order.push(2);
        return { ...filter, name: filter.name + '-2' };
      });

      const context = {
        adminizer: mockAdminizer,
        operation: 'create' as const
      };

      const result = await FilterBuilder.runHooks(
        'beforeCreate',
        { name: 'test' },
        context
      );

      expect(order).toEqual([1, 2]);
      expect(result.name).toBe('test-1-2');
    });

    it('handles hooks that return void', async () => {
      FilterBuilder.onHook('afterCreate', async () => {
        // Does nothing, returns void
      });

      const context = {
        adminizer: mockAdminizer,
        operation: 'create' as const
      };

      const result = await FilterBuilder.runHooks(
        'afterCreate',
        { name: 'test' },
        context
      );

      expect(result.name).toBe('test');
    });
  });

  describe('Static methods - filter registration', () => {
    it('registers filter definition with registerFilter()', () => {
      const definition: FilterDefinition = {
        name: 'Recent Orders',
        modelName: 'Order',
        conditions: [
          { id: '1', field: 'createdAt', operator: 'gte', value: 'today' }
        ]
      };

      FilterBuilder.registerFilter('recent-orders', definition);

      const retrieved = FilterBuilder.getRegisteredFilter('recent-orders');
      expect(retrieved).toEqual(definition);
    });

    it('returns undefined for non-existent registration', () => {
      const retrieved = FilterBuilder.getRegisteredFilter('non-existent');
      expect(retrieved).toBeUndefined();
    });

    it('returns all registered filters with getAllRegisteredFilters()', () => {
      FilterBuilder.registerFilter('filter-1', {
        name: 'Filter 1',
        modelName: 'Model1',
        conditions: []
      });

      FilterBuilder.registerFilter('filter-2', {
        name: 'Filter 2',
        modelName: 'Model2',
        conditions: []
      });

      const all = FilterBuilder.getAllRegisteredFilters();
      expect(all.size).toBe(2);
      expect(all.has('filter-1')).toBe(true);
      expect(all.has('filter-2')).toBe(true);
    });

    it('overwrites existing registration', () => {
      FilterBuilder.registerFilter('test', {
        name: 'Original',
        modelName: 'Model',
        conditions: []
      });

      FilterBuilder.registerFilter('test', {
        name: 'Updated',
        modelName: 'Model',
        conditions: []
      });

      const retrieved = FilterBuilder.getRegisteredFilter('test');
      expect(retrieved?.name).toBe('Updated');
    });
  });

  describe('Complex filter building', () => {
    it('builds complete filter with all options', () => {
      const result = FilterBuilder.create(mockAdminizer)
        .forModel('Order')
        .named('High-Value VIP Orders')
        .described('Orders over $1000 from VIP customers')
        .withSlug('high-value-vip')
        .where('total', 'gte', 1000)
        .andWhere('status', 'in', ['completed', 'shipped'])
        .whereRelation('customer', 'isVip', 'eq', true)
        .sortBy('total', 'DESC')
        .asPublic()
        .withApiAccess(true)
        .withIcon('star')
        .withColor('#gold')
        .pinned()
        .withColumns([
          { fieldName: 'id', order: 0 },
          { fieldName: 'customer', order: 1 },
          { fieldName: 'total', order: 2 },
          { fieldName: 'status', order: 3 }
        ])
        .build();

      expect(result.modelName).toBe('Order');
      expect(result.name).toBe('High-Value VIP Orders');
      expect(result.description).toBe('Orders over $1000 from VIP customers');
      expect(result.slug).toBe('high-value-vip');
      expect(result.conditions).toHaveLength(3);
      expect(result.sortField).toBe('total');
      expect(result.sortDirection).toBe('DESC');
      expect(result.visibility).toBe('public');
      expect(result.apiEnabled).toBe(true);
      expect(result.icon).toBe('star');
      expect(result.color).toBe('#gold');
      expect(result.isPinned).toBe(true);
    });

    it('builds filter with complex nested conditions', () => {
      const result = FilterBuilder.create(mockAdminizer)
        .forModel('Order')
        .named('Complex Filter')
        .where('active', 'eq', true)
        .startOrGroup()
          .startAndGroup()
            .where('status', 'eq', 'pending')
            .where('priority', 'eq', 'high')
          .endGroup()
          .startAndGroup()
            .where('status', 'eq', 'processing')
            .where('total', 'gte', 500)
          .endGroup()
        .endGroup()
        .build();

      expect(result.conditions).toHaveLength(2);

      // First: simple condition
      expect(result.conditions![0].field).toBe('active');

      // Second: OR group with 2 AND subgroups
      const orGroup = result.conditions![1];
      expect(orGroup.logic).toBe('OR');
      expect(orGroup.children).toHaveLength(2);

      // First AND subgroup
      expect(orGroup.children![0].logic).toBe('AND');
      expect(orGroup.children![0].children).toHaveLength(2);
      expect(orGroup.children![0].children![0].field).toBe('status');
      expect(orGroup.children![0].children![1].field).toBe('priority');

      // Second AND subgroup
      expect(orGroup.children![1].logic).toBe('AND');
      expect(orGroup.children![1].children).toHaveLength(2);
      expect(orGroup.children![1].children![0].field).toBe('status');
      expect(orGroup.children![1].children![1].field).toBe('total');
    });
  });
});
