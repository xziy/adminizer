import { describe, it, expect, beforeEach } from 'vitest';
import {
  CustomFieldHandler,
  CustomFieldHandlerDefinition,
  CustomFieldCondition,
  RegisterOptions
} from '../src/lib/filters/CustomFieldHandler';

describe('CustomFieldHandler', () => {
  // Clear handlers between tests for isolation
  beforeEach(() => {
    CustomFieldHandler.clear();
  });

  describe('register()', () => {
    it('registers a handler successfully', () => {
      const handler: CustomFieldHandlerDefinition = {
        name: 'Test Handler',
        buildCondition: () => ({ criteria: { test: true } })
      };

      CustomFieldHandler.register('Order.test', handler);

      expect(CustomFieldHandler.has('Order.test')).toBe(true);
    });

    it('throws error when registering duplicate without force', () => {
      const handler: CustomFieldHandlerDefinition = {
        name: 'Test Handler',
        buildCondition: () => ({})
      };

      CustomFieldHandler.register('Order.field', handler);

      expect(() => {
        CustomFieldHandler.register('Order.field', handler);
      }).toThrow("Handler 'Order.field' is already registered. Use force: true to overwrite.");
    });

    it('allows overwriting with force option', () => {
      const handler1: CustomFieldHandlerDefinition = {
        name: 'Original',
        buildCondition: () => ({ criteria: { v: 1 } })
      };

      const handler2: CustomFieldHandlerDefinition = {
        name: 'Updated',
        buildCondition: () => ({ criteria: { v: 2 } })
      };

      CustomFieldHandler.register('Order.field', handler1);
      CustomFieldHandler.register('Order.field', handler2, { force: true });

      const registered = CustomFieldHandler.get('Order.field');
      expect(registered?.name).toBe('Updated');
    });

    it('stores handler with description', () => {
      const handler: CustomFieldHandlerDefinition = {
        name: 'Phone Search',
        description: 'Search by phone in JSON field',
        buildCondition: () => ({})
      };

      CustomFieldHandler.register('Order.phone', handler);

      const registered = CustomFieldHandler.get('Order.phone');
      expect(registered?.description).toBe('Search by phone in JSON field');
    });

    it('stores handler with validate function', () => {
      const handler: CustomFieldHandlerDefinition = {
        name: 'Validated Handler',
        buildCondition: () => ({}),
        validate: (value) => {
          if (typeof value !== 'string') {
            return { valid: false, error: 'Value must be string' };
          }
          return { valid: true };
        }
      };

      CustomFieldHandler.register('Order.validated', handler);

      const registered = CustomFieldHandler.get('Order.validated');
      expect(registered?.validate).toBeDefined();
      expect(registered?.validate?.('test')).toEqual({ valid: true });
      expect(registered?.validate?.(123)).toEqual({ valid: false, error: 'Value must be string' });
    });
  });

  describe('get()', () => {
    it('returns registered handler', () => {
      const handler: CustomFieldHandlerDefinition = {
        name: 'Test',
        buildCondition: () => ({ criteria: {} })
      };

      CustomFieldHandler.register('Model.field', handler);

      const result = CustomFieldHandler.get('Model.field');
      expect(result).toBe(handler);
    });

    it('returns undefined for non-existent handler', () => {
      const result = CustomFieldHandler.get('NonExistent.field');
      expect(result).toBeUndefined();
    });
  });

  describe('has()', () => {
    it('returns true for registered handler', () => {
      CustomFieldHandler.register('Test.field', {
        name: 'Test',
        buildCondition: () => ({})
      });

      expect(CustomFieldHandler.has('Test.field')).toBe(true);
    });

    it('returns false for non-existent handler', () => {
      expect(CustomFieldHandler.has('NonExistent.field')).toBe(false);
    });
  });

  describe('getAll()', () => {
    it('returns empty map when no handlers registered', () => {
      const all = CustomFieldHandler.getAll();
      expect(all.size).toBe(0);
    });

    it('returns all registered handlers', () => {
      CustomFieldHandler.register('Order.phone', {
        name: 'Phone',
        buildCondition: () => ({})
      });
      CustomFieldHandler.register('Order.address', {
        name: 'Address',
        buildCondition: () => ({})
      });
      CustomFieldHandler.register('User.metadata', {
        name: 'Metadata',
        buildCondition: () => ({})
      });

      const all = CustomFieldHandler.getAll();
      expect(all.size).toBe(3);
      expect(all.has('Order.phone')).toBe(true);
      expect(all.has('Order.address')).toBe(true);
      expect(all.has('User.metadata')).toBe(true);
    });

    it('returns a copy (not the internal map)', () => {
      CustomFieldHandler.register('Test.field', {
        name: 'Test',
        buildCondition: () => ({})
      });

      const all = CustomFieldHandler.getAll();
      all.delete('Test.field');

      // Original should still have the handler
      expect(CustomFieldHandler.has('Test.field')).toBe(true);
    });
  });

  describe('getForModel()', () => {
    it('returns empty map when no handlers for model', () => {
      CustomFieldHandler.register('Other.field', {
        name: 'Other',
        buildCondition: () => ({})
      });

      const handlers = CustomFieldHandler.getForModel('Order');
      expect(handlers.size).toBe(0);
    });

    it('returns only handlers for specified model', () => {
      CustomFieldHandler.register('Order.phone', {
        name: 'Order Phone',
        buildCondition: () => ({})
      });
      CustomFieldHandler.register('Order.address', {
        name: 'Order Address',
        buildCondition: () => ({})
      });
      CustomFieldHandler.register('User.phone', {
        name: 'User Phone',
        buildCondition: () => ({})
      });

      const orderHandlers = CustomFieldHandler.getForModel('Order');
      expect(orderHandlers.size).toBe(2);
      expect(orderHandlers.has('Order.phone')).toBe(true);
      expect(orderHandlers.has('Order.address')).toBe(true);
      expect(orderHandlers.has('User.phone')).toBe(false);
    });

    it('handles nested field names', () => {
      CustomFieldHandler.register('Order.customer.phone', {
        name: 'Customer Phone',
        buildCondition: () => ({})
      });
      CustomFieldHandler.register('Order.items.sku', {
        name: 'Item SKU',
        buildCondition: () => ({})
      });

      const handlers = CustomFieldHandler.getForModel('Order');
      expect(handlers.size).toBe(2);
      expect(handlers.has('Order.customer.phone')).toBe(true);
      expect(handlers.has('Order.items.sku')).toBe(true);
    });

    it('is case-sensitive for model names', () => {
      CustomFieldHandler.register('Order.field', {
        name: 'Test',
        buildCondition: () => ({})
      });

      expect(CustomFieldHandler.getForModel('Order').size).toBe(1);
      expect(CustomFieldHandler.getForModel('order').size).toBe(0);
      expect(CustomFieldHandler.getForModel('ORDER').size).toBe(0);
    });
  });

  describe('unregister()', () => {
    it('removes registered handler', () => {
      CustomFieldHandler.register('Test.field', {
        name: 'Test',
        buildCondition: () => ({})
      });

      expect(CustomFieldHandler.has('Test.field')).toBe(true);

      const result = CustomFieldHandler.unregister('Test.field');

      expect(result).toBe(true);
      expect(CustomFieldHandler.has('Test.field')).toBe(false);
    });

    it('returns false for non-existent handler', () => {
      const result = CustomFieldHandler.unregister('NonExistent.field');
      expect(result).toBe(false);
    });
  });

  describe('clear()', () => {
    it('removes all handlers', () => {
      CustomFieldHandler.register('Order.a', { name: 'A', buildCondition: () => ({}) });
      CustomFieldHandler.register('Order.b', { name: 'B', buildCondition: () => ({}) });
      CustomFieldHandler.register('User.c', { name: 'C', buildCondition: () => ({}) });

      expect(CustomFieldHandler.count()).toBe(3);

      CustomFieldHandler.clear();

      expect(CustomFieldHandler.count()).toBe(0);
    });
  });

  describe('count()', () => {
    it('returns 0 when empty', () => {
      expect(CustomFieldHandler.count()).toBe(0);
    });

    it('returns correct count', () => {
      CustomFieldHandler.register('A.a', { name: 'A', buildCondition: () => ({}) });
      expect(CustomFieldHandler.count()).toBe(1);

      CustomFieldHandler.register('B.b', { name: 'B', buildCondition: () => ({}) });
      expect(CustomFieldHandler.count()).toBe(2);

      CustomFieldHandler.unregister('A.a');
      expect(CustomFieldHandler.count()).toBe(1);
    });
  });

  describe('buildCondition()', () => {
    it('builds condition with rawSQL for PostgreSQL', () => {
      const handler: CustomFieldHandlerDefinition = {
        name: 'JSON Phone Search',
        buildCondition: (operator, value, dialect) => {
          if (dialect === 'postgres') {
            return {
              rawSQL: "(phone->>'number') LIKE $1",
              params: [`%${value}%`]
            };
          }
          return {};
        }
      };

      CustomFieldHandler.register('Order.phone', handler);
      const registered = CustomFieldHandler.get('Order.phone')!;

      const result = registered.buildCondition('like', '123', 'postgres');

      expect(result.rawSQL).toBe("(phone->>'number') LIKE $1");
      expect(result.params).toEqual(['%123%']);
    });

    it('builds condition with criteria', () => {
      const handler: CustomFieldHandlerDefinition = {
        name: 'Status Handler',
        buildCondition: (operator, value) => {
          return {
            criteria: { status: value }
          };
        }
      };

      CustomFieldHandler.register('Order.status', handler);
      const registered = CustomFieldHandler.get('Order.status')!;

      const result = registered.buildCondition('eq', 'active', 'waterline');

      expect(result.criteria).toEqual({ status: 'active' });
    });

    it('builds condition with inMemory filter', () => {
      const handler: CustomFieldHandlerDefinition = {
        name: 'In-Memory Filter',
        buildCondition: (operator, value, dialect) => {
          if (dialect === 'waterline') {
            return {
              inMemory: (record) => record.tags?.includes(value)
            };
          }
          return {};
        }
      };

      CustomFieldHandler.register('Post.tags', handler);
      const registered = CustomFieldHandler.get('Post.tags')!;

      const result = registered.buildCondition('contains', 'featured', 'waterline');

      expect(result.inMemory).toBeDefined();
      expect(result.inMemory?.({ tags: ['featured', 'news'] })).toBe(true);
      expect(result.inMemory?.({ tags: ['news'] })).toBe(false);
    });

    it('handles different operators', () => {
      const handler: CustomFieldHandlerDefinition = {
        name: 'Operator Handler',
        buildCondition: (operator, value, dialect) => {
          switch (operator) {
            case 'eq':
              return { rawSQL: 'field = $1', params: [value] };
            case 'like':
              return { rawSQL: 'field LIKE $1', params: [`%${value}%`] };
            case 'gt':
              return { rawSQL: 'field > $1', params: [value] };
            default:
              return {};
          }
        }
      };

      CustomFieldHandler.register('Order.amount', handler);
      const registered = CustomFieldHandler.get('Order.amount')!;

      expect(registered.buildCondition('eq', 100, 'postgres').rawSQL).toBe('field = $1');
      expect(registered.buildCondition('like', 'test', 'postgres').rawSQL).toBe('field LIKE $1');
      expect(registered.buildCondition('gt', 50, 'postgres').rawSQL).toBe('field > $1');
    });

    it('handles additional params', () => {
      const handler: CustomFieldHandlerDefinition = {
        name: 'Parameterized Handler',
        buildCondition: (operator, value, dialect, params) => {
          const jsonPath = params?.path || 'data';
          return {
            rawSQL: `(${jsonPath}->>'value') = $1`,
            params: [value]
          };
        }
      };

      CustomFieldHandler.register('Order.json', handler);
      const registered = CustomFieldHandler.get('Order.json')!;

      const result = registered.buildCondition('eq', 'test', 'postgres', { path: 'metadata' });

      expect(result.rawSQL).toBe("(metadata->>'value') = $1");
    });
  });

  describe('validate()', () => {
    it('validates value correctly', () => {
      const handler: CustomFieldHandlerDefinition = {
        name: 'Phone Validator',
        buildCondition: () => ({}),
        validate: (value) => {
          if (typeof value !== 'string') {
            return { valid: false, error: 'Phone must be a string' };
          }
          if (!/^\+?\d{10,}$/.test(value.replace(/\s/g, ''))) {
            return { valid: false, error: 'Invalid phone format' };
          }
          return { valid: true };
        }
      };

      CustomFieldHandler.register('Order.phone', handler);
      const registered = CustomFieldHandler.get('Order.phone')!;

      expect(registered.validate?.('1234567890')).toEqual({ valid: true });
      expect(registered.validate?.('+1 234 567 8901')).toEqual({ valid: true });
      expect(registered.validate?.('abc')).toEqual({ valid: false, error: 'Invalid phone format' });
      expect(registered.validate?.(123)).toEqual({ valid: false, error: 'Phone must be a string' });
    });

    it('handler without validate returns undefined', () => {
      const handler: CustomFieldHandlerDefinition = {
        name: 'No Validation',
        buildCondition: () => ({})
      };

      CustomFieldHandler.register('Order.field', handler);
      const registered = CustomFieldHandler.get('Order.field')!;

      expect(registered.validate).toBeUndefined();
    });
  });

  describe('CustomFieldCondition interface', () => {
    it('supports rawSQL only', () => {
      const condition: CustomFieldCondition = {
        rawSQL: 'SELECT * FROM users WHERE id = $1',
        params: [1]
      };

      expect(condition.rawSQL).toBeDefined();
      expect(condition.params).toEqual([1]);
      expect(condition.inMemory).toBeUndefined();
      expect(condition.criteria).toBeUndefined();
    });

    it('supports inMemory only', () => {
      const condition: CustomFieldCondition = {
        inMemory: (record) => record.active === true
      };

      expect(condition.inMemory).toBeDefined();
      expect(condition.inMemory?.({ active: true })).toBe(true);
      expect(condition.inMemory?.({ active: false })).toBe(false);
    });

    it('supports criteria only', () => {
      const condition: CustomFieldCondition = {
        criteria: { status: 'active', role: 'admin' }
      };

      expect(condition.criteria).toEqual({ status: 'active', role: 'admin' });
    });

    it('supports mixed condition', () => {
      const condition: CustomFieldCondition = {
        rawSQL: 'status = $1',
        params: ['active'],
        inMemory: (record) => record.status === 'active',
        criteria: { status: 'active' }
      };

      expect(condition.rawSQL).toBeDefined();
      expect(condition.params).toBeDefined();
      expect(condition.inMemory).toBeDefined();
      expect(condition.criteria).toBeDefined();
    });
  });

  describe('ID format', () => {
    it('supports ModelName.fieldName format', () => {
      CustomFieldHandler.register('Order.phone', {
        name: 'Test',
        buildCondition: () => ({})
      });

      expect(CustomFieldHandler.has('Order.phone')).toBe(true);
    });

    it('supports nested field format', () => {
      CustomFieldHandler.register('Order.customer.phone.number', {
        name: 'Nested',
        buildCondition: () => ({})
      });

      expect(CustomFieldHandler.has('Order.customer.phone.number')).toBe(true);
    });

    it('supports arbitrary ID format', () => {
      // Not recommended but allowed
      CustomFieldHandler.register('custom-handler-id', {
        name: 'Custom ID',
        buildCondition: () => ({})
      });

      expect(CustomFieldHandler.has('custom-handler-id')).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('handles empty string ID', () => {
      CustomFieldHandler.register('', {
        name: 'Empty',
        buildCondition: () => ({})
      });

      expect(CustomFieldHandler.has('')).toBe(true);
      expect(CustomFieldHandler.get('')?.name).toBe('Empty');
    });

    it('handles very long ID', () => {
      const longId = 'Model.' + 'a'.repeat(1000);
      CustomFieldHandler.register(longId, {
        name: 'Long',
        buildCondition: () => ({})
      });

      expect(CustomFieldHandler.has(longId)).toBe(true);
    });

    it('handles special characters in ID', () => {
      CustomFieldHandler.register('Order.field-with-dash', {
        name: 'Dash',
        buildCondition: () => ({})
      });
      CustomFieldHandler.register('Order.field_with_underscore', {
        name: 'Underscore',
        buildCondition: () => ({})
      });

      expect(CustomFieldHandler.has('Order.field-with-dash')).toBe(true);
      expect(CustomFieldHandler.has('Order.field_with_underscore')).toBe(true);
    });
  });
});
