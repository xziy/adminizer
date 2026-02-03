import { describe, it, expect, vi } from 'vitest';
import {
  ModernQueryBuilder,
  FILTER_SECURITY_LIMITS
} from '../src/lib/query-builder/ModernQueryBuilder';
import { ConditionValidator, ValidationResult } from '../src/lib/filters/ConditionValidator';
import { FilterCondition } from '../src/models/FilterAP';

describe('ConditionValidator', () => {
  const fieldsConfig = {
    name: { type: 'string', maxLength: 100 },
    email: { type: 'string' },
    age: { type: 'number', min: 0, max: 150 },
    status: { type: 'select' },
    isActive: { type: 'boolean' },
    createdAt: { type: 'datetime' },
    metadata: { type: 'json' },
    groupId: { type: 'association' }
  };

  describe('basic validation', () => {
    it('validates valid simple condition', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'name', operator: 'eq', value: 'John' }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects condition without field', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        { id: '1', operator: 'eq', value: 'John' } as any
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('FIELD_REQUIRED');
    });

    it('rejects unknown field', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'unknownField', operator: 'eq', value: 'test' }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('UNKNOWN_FIELD');
    });

    it('rejects condition without operator', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'name', value: 'John' } as any
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('OPERATOR_REQUIRED');
    });

    it('rejects condition without value (except isNull/isNotNull)', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'name', operator: 'eq', value: '' }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_VALUE');
    });

    it('allows isNull without value', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'name', operator: 'isNull' }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(true);
    });

    it('allows isNotNull without value', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'name', operator: 'isNotNull' }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(true);
    });
  });

  describe('operator validation', () => {
    it('rejects invalid operator for string field', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'name', operator: 'gt', value: '10' }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_OPERATOR');
    });

    it('rejects like operator for boolean field', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'isActive', operator: 'like', value: 'true' }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_OPERATOR');
    });

    it('allows numeric operators for number field', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'age', operator: 'gt', value: 18 },
        { id: '2', field: 'age', operator: 'lte', value: 65 },
        { id: '3', field: 'age', operator: 'between', value: [18, 65] }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(true);
    });

    it('allows string operators for string field', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'name', operator: 'like', value: 'John' },
        { id: '2', field: 'name', operator: 'startsWith', value: 'J' },
        { id: '3', field: 'email', operator: 'endsWith', value: '@example.com' }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(true);
    });
  });

  describe('value validation', () => {
    it('rejects IN operator without array', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'status', operator: 'in', value: 'active' }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('array');
    });

    it('rejects empty IN array', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'status', operator: 'in', value: [] }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('at least one');
    });

    it('rejects BETWEEN without array of 2', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'age', operator: 'between', value: [18] }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('2 values');
    });

    it('rejects invalid regex pattern', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'name', operator: 'regex', value: '[invalid(' }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('Invalid regex');
    });

    it('validates valid regex pattern', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'name', operator: 'regex', value: '^John.*$' }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(true);
    });

    it('rejects number out of range', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'age', operator: 'eq', value: 200 }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('at most 150');
    });

    it('rejects negative age', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'age', operator: 'eq', value: -5 }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('at least 0');
    });
  });

  describe('nested conditions', () => {
    it('validates AND group', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        {
          id: 'g1',
          logic: 'AND',
          children: [
            { id: '1', field: 'name', operator: 'like', value: 'John' },
            { id: '2', field: 'age', operator: 'gte', value: 18 }
          ]
        }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(true);
    });

    it('validates OR group', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        {
          id: 'g1',
          logic: 'OR',
          children: [
            { id: '1', field: 'status', operator: 'eq', value: 'active' },
            { id: '2', field: 'status', operator: 'eq', value: 'pending' }
          ]
        }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(true);
    });

    it('validates NOT with single child', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        {
          id: 'g1',
          logic: 'NOT',
          children: [
            { id: '1', field: 'status', operator: 'eq', value: 'deleted' }
          ]
        }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(true);
    });

    it('rejects NOT with multiple children', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        {
          id: 'g1',
          logic: 'NOT',
          children: [
            { id: '1', field: 'status', operator: 'eq', value: 'deleted' },
            { id: '2', field: 'isActive', operator: 'eq', value: false }
          ]
        }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('NOT_REQUIRES_ONE');
    });

    it('validates deeply nested conditions', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        {
          id: 'g1',
          logic: 'AND',
          children: [
            { id: '1', field: 'isActive', operator: 'eq', value: true },
            {
              id: 'g2',
              logic: 'OR',
              children: [
                { id: '2', field: 'status', operator: 'eq', value: 'active' },
                {
                  id: 'g3',
                  logic: 'AND',
                  children: [
                    { id: '3', field: 'age', operator: 'gte', value: 21 },
                    { id: '4', field: 'name', operator: 'startsWith', value: 'A' }
                  ]
                }
              ]
            }
          ]
        }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(true);
    });

    it('rejects invalid condition inside group', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        {
          id: 'g1',
          logic: 'AND',
          children: [
            { id: '1', field: 'name', operator: 'eq', value: 'John' },
            { id: '2', field: 'unknownField', operator: 'eq', value: 'test' }
          ]
        }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('UNKNOWN_FIELD');
    });
  });

  describe('security limits', () => {
    it('rejects too many IN values', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const tooManyValues = Array.from({ length: FILTER_SECURITY_LIMITS.MAX_IN_VALUES + 1 }, (_, i) => `val${i}`);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'status', operator: 'in', value: tooManyValues }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('Too many values');
    });

    it('rejects too long string', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const longString = 'a'.repeat(FILTER_SECURITY_LIMITS.MAX_STRING_LENGTH + 1);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'name', operator: 'eq', value: longString }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('String too long');
    });

    it('rejects exceeding field maxLength', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'name', operator: 'eq', value: 'a'.repeat(101) }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('max length of 100');
    });
  });

  describe('security events logging', () => {
    it('returns security events for MAX_DEPTH_EXCEEDED', () => {
      const validator = new ConditionValidator(fieldsConfig);
      // Create deep nesting beyond limit
      let conditions: FilterCondition[] = [{ id: 'leaf', field: 'name', operator: 'eq', value: 'test' }];
      for (let i = 0; i < 12; i++) {
        conditions = [{ id: `g${i}`, logic: 'AND', children: conditions }];
      }

      const result = validator.validate(conditions);
      expect(result.valid).toBe(false);
      expect(result.securityEvents).toBeDefined();
      expect(result.securityEvents?.length).toBeGreaterThan(0);
      expect(result.securityEvents?.[0].type).toBe('MAX_DEPTH_EXCEEDED');
    });

    it('returns security events for TOO_MANY_CONDITIONS', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const manyChildren: FilterCondition[] = Array.from(
        { length: FILTER_SECURITY_LIMITS.MAX_CONDITIONS_PER_GROUP + 1 },
        (_, i) => ({ id: `c${i}`, field: 'name', operator: 'eq', value: `val${i}` })
      );
      const conditions: FilterCondition[] = [{
        id: 'g1',
        logic: 'AND',
        children: manyChildren
      }];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(false);
      expect(result.securityEvents).toBeDefined();
      expect(result.securityEvents?.[0].type).toBe('TOO_MANY_CONDITIONS');
    });

    it('returns security events for DANGEROUS_SQL', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [{
        id: '1',
        rawSQL: 'SELECT * FROM users; DROP TABLE users;',
        rawSQLParams: []
      }];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(false);
      expect(result.securityEvents).toBeDefined();
      expect(result.securityEvents?.[0].type).toBe('DANGEROUS_SQL');
    });

    it('returns security events for TOO_MANY_IN_VALUES', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const tooManyValues = Array.from({ length: FILTER_SECURITY_LIMITS.MAX_IN_VALUES + 1 }, (_, i) => `val${i}`);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'status', operator: 'in', value: tooManyValues }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(false);
      expect(result.securityEvents).toBeDefined();
      expect(result.securityEvents?.[0].type).toBe('TOO_MANY_IN_VALUES');
    });

    it('returns security events for STRING_TOO_LONG', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const longString = 'a'.repeat(FILTER_SECURITY_LIMITS.MAX_STRING_LENGTH + 1);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'name', operator: 'eq', value: longString }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(false);
      expect(result.securityEvents).toBeDefined();
      expect(result.securityEvents?.[0].type).toBe('STRING_TOO_LONG');
    });

    it('calls static logger when set', () => {
      const mockLogger = { warn: vi.fn() };
      ConditionValidator.logger = mockLogger;

      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [{
        id: '1',
        rawSQL: '1=1 UNION SELECT * FROM passwords',
        rawSQLParams: []
      }];

      validator.validate(conditions);

      expect(mockLogger.warn).toHaveBeenCalled();
      expect(mockLogger.warn.mock.calls[0][0]).toContain('[SECURITY]');
      expect(mockLogger.warn.mock.calls[0][0]).toContain('DANGEROUS_SQL');

      // Cleanup
      ConditionValidator.logger = null;
    });

    it('does not include securityEvents when validation passes', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'name', operator: 'eq', value: 'John' }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(true);
      expect(result.securityEvents).toBeUndefined();
    });

    it('security event has timestamp', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [{
        id: '1',
        rawSQL: '; DROP TABLE users;',
        rawSQLParams: []
      }];

      const before = new Date();
      const result = validator.validate(conditions);
      const after = new Date();

      expect(result.securityEvents?.[0].timestamp).toBeDefined();
      expect(result.securityEvents?.[0].timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.securityEvents?.[0].timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('allowed fields whitelist', () => {
    it('accepts field in whitelist', () => {
      const validator = new ConditionValidator(fieldsConfig, ['name', 'email']);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'name', operator: 'eq', value: 'John' }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(true);
    });

    it('rejects field not in whitelist', () => {
      const validator = new ConditionValidator(fieldsConfig, ['name', 'email']);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'age', operator: 'eq', value: 25 }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('FIELD_NOT_ALLOWED');
    });
  });

  describe('rawSQL validation', () => {
    it('allows valid rawSQL with correct params', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        {
          id: '1',
          rawSQL: 'age > $1 AND age < $2',
          rawSQLParams: [18, 65]
        }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(true);
    });

    it('rejects rawSQL with DROP statement', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        {
          id: '1',
          rawSQL: 'age > 18; DROP TABLE users;',
          rawSQLParams: []
        }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('DANGEROUS_SQL');
    });

    it('rejects rawSQL with UNION SELECT', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        {
          id: '1',
          rawSQL: '1=1 UNION SELECT * FROM passwords',
          rawSQLParams: []
        }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('DANGEROUS_SQL');
    });

    it('rejects rawSQL with mismatched params', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        {
          id: '1',
          rawSQL: 'age > $1 AND status = $2 AND name = $3',
          rawSQLParams: [18, 'active'] // missing third param
        }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('PARAM_MISMATCH');
    });
  });

  describe('getOperatorsForField', () => {
    it('returns correct operators for string field', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const operators = validator.getOperatorsForField('name');

      expect(operators).toContain('eq');
      expect(operators).toContain('like');
      expect(operators).toContain('startsWith');
      expect(operators).toContain('regex');
      expect(operators).not.toContain('gt');
    });

    it('returns correct operators for number field', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const operators = validator.getOperatorsForField('age');

      expect(operators).toContain('eq');
      expect(operators).toContain('gt');
      expect(operators).toContain('between');
      expect(operators).not.toContain('like');
    });

    it('returns correct operators for boolean field', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const operators = validator.getOperatorsForField('isActive');

      expect(operators).toContain('eq');
      expect(operators).toContain('neq');
      expect(operators).toContain('isNull');
      expect(operators).not.toContain('like');
      expect(operators).not.toContain('gt');
    });

    it('returns empty array for unknown field', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const operators = validator.getOperatorsForField('unknownField');

      expect(operators).toHaveLength(0);
    });
  });
});

describe('ModernQueryBuilder static methods', () => {
  describe('getOperatorsForFieldType', () => {
    it('returns string operators', () => {
      const ops = ModernQueryBuilder.getOperatorsForFieldType('string');
      expect(ops).toContain('eq');
      expect(ops).toContain('like');
      expect(ops).toContain('ilike');
      expect(ops).toContain('startsWith');
      expect(ops).toContain('regex');
    });

    it('returns number operators', () => {
      const ops = ModernQueryBuilder.getOperatorsForFieldType('number');
      expect(ops).toContain('eq');
      expect(ops).toContain('gt');
      expect(ops).toContain('gte');
      expect(ops).toContain('lt');
      expect(ops).toContain('lte');
      expect(ops).toContain('between');
      expect(ops).not.toContain('like');
    });

    it('returns boolean operators', () => {
      const ops = ModernQueryBuilder.getOperatorsForFieldType('boolean');
      expect(ops).toContain('eq');
      expect(ops).toContain('neq');
      expect(ops).toContain('isNull');
      expect(ops).not.toContain('like');
      expect(ops).not.toContain('gt');
    });

    it('returns date operators', () => {
      const ops = ModernQueryBuilder.getOperatorsForFieldType('date');
      expect(ops).toContain('eq');
      expect(ops).toContain('gt');
      expect(ops).toContain('between');
      expect(ops).not.toContain('like');
    });

    it('returns json operators', () => {
      const ops = ModernQueryBuilder.getOperatorsForFieldType('json');
      expect(ops).toContain('isNull');
      expect(ops).toContain('isNotNull');
      expect(ops).toContain('custom');
      expect(ops).not.toContain('like');
    });

    it('returns association operators', () => {
      const ops = ModernQueryBuilder.getOperatorsForFieldType('association');
      expect(ops).toContain('eq');
      expect(ops).toContain('in');
      expect(ops).toContain('isNull');
      expect(ops).not.toContain('like');
    });

    it('returns string operators for unknown type', () => {
      const ops = ModernQueryBuilder.getOperatorsForFieldType('unknownType');
      expect(ops).toEqual(ModernQueryBuilder.getOperatorsForFieldType('string'));
    });
  });
});

describe('FILTER_SECURITY_LIMITS', () => {
  it('has MAX_DEPTH defined', () => {
    expect(FILTER_SECURITY_LIMITS.MAX_DEPTH).toBe(10);
  });

  it('has MAX_IN_VALUES defined', () => {
    expect(FILTER_SECURITY_LIMITS.MAX_IN_VALUES).toBe(1000);
  });

  it('has MAX_CONDITIONS_PER_GROUP defined', () => {
    expect(FILTER_SECURITY_LIMITS.MAX_CONDITIONS_PER_GROUP).toBe(100);
  });

  it('has MAX_STRING_LENGTH defined', () => {
    expect(FILTER_SECURITY_LIMITS.MAX_STRING_LENGTH).toBe(10000);
  });
});

describe('Deep nesting tests (depth 5+)', () => {
  const fieldsConfig = {
    name: { type: 'string' },
    status: { type: 'select' },
    age: { type: 'number' },
    isActive: { type: 'boolean' }
  };

  /**
   * Helper: create nested condition tree with specified depth
   */
  function createNestedConditions(depth: number, logic: 'AND' | 'OR' = 'AND'): FilterCondition[] {
    if (depth === 0) {
      return [{ id: 'leaf', field: 'name', operator: 'eq', value: 'test' }];
    }
    return [{
      id: `group-${depth}`,
      logic,
      children: createNestedConditions(depth - 1, logic === 'AND' ? 'OR' : 'AND')
    }];
  }

  it('validates depth 5 nesting (valid)', () => {
    const validator = new ConditionValidator(fieldsConfig);
    const conditions = createNestedConditions(5);

    const result = validator.validate(conditions);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validates depth 7 nesting (valid)', () => {
    const validator = new ConditionValidator(fieldsConfig);
    const conditions = createNestedConditions(7);

    const result = validator.validate(conditions);
    expect(result.valid).toBe(true);
  });

  it('validates depth 10 nesting (at limit)', () => {
    const validator = new ConditionValidator(fieldsConfig);
    const conditions = createNestedConditions(10);

    const result = validator.validate(conditions);
    expect(result.valid).toBe(true);
  });

  it('rejects depth 11 nesting (exceeds limit)', () => {
    const validator = new ConditionValidator(fieldsConfig);
    const conditions = createNestedConditions(11);

    const result = validator.validate(conditions);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('MAX_DEPTH_EXCEEDED');
  });

  it('rejects depth 15 nesting', () => {
    const validator = new ConditionValidator(fieldsConfig);
    const conditions = createNestedConditions(15);

    const result = validator.validate(conditions);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('MAX_DEPTH_EXCEEDED');
    expect(result.errors[0].message).toContain('max 10');
  });

  it('validates complex tree with depth 5 and multiple branches', () => {
    const validator = new ConditionValidator(fieldsConfig);
    const conditions: FilterCondition[] = [{
      id: 'root',
      logic: 'AND',
      children: [
        {
          id: 'branch1',
          logic: 'OR',
          children: [
            {
              id: 'branch1-1',
              logic: 'AND',
              children: [
                {
                  id: 'branch1-1-1',
                  logic: 'OR',
                  children: [
                    {
                      id: 'branch1-1-1-1',
                      logic: 'AND',
                      children: [
                        { id: 'leaf1', field: 'name', operator: 'eq', value: 'John' }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          id: 'branch2',
          logic: 'OR',
          children: [
            {
              id: 'branch2-1',
              logic: 'AND',
              children: [
                {
                  id: 'branch2-1-1',
                  logic: 'OR',
                  children: [
                    {
                      id: 'branch2-1-1-1',
                      logic: 'AND',
                      children: [
                        { id: 'leaf2', field: 'status', operator: 'eq', value: 'active' }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }];

    const result = validator.validate(conditions);
    expect(result.valid).toBe(true);
  });

  it('validates alternating AND/OR deep tree', () => {
    const validator = new ConditionValidator(fieldsConfig);
    // Depth 6: AND -> OR -> AND -> OR -> AND -> OR -> leaf
    const conditions: FilterCondition[] = [{
      id: 'l1', logic: 'AND', children: [{
        id: 'l2', logic: 'OR', children: [{
          id: 'l3', logic: 'AND', children: [{
            id: 'l4', logic: 'OR', children: [{
              id: 'l5', logic: 'AND', children: [{
                id: 'l6', logic: 'OR', children: [
                  { id: 'leaf', field: 'age', operator: 'gte', value: 18 }
                ]
              }]
            }]
          }]
        }]
      }]
    }];

    const result = validator.validate(conditions);
    expect(result.valid).toBe(true);
  });

  it('validates NOT at deep level', () => {
    const validator = new ConditionValidator(fieldsConfig);
    const conditions: FilterCondition[] = [{
      id: 'l1', logic: 'AND', children: [{
        id: 'l2', logic: 'OR', children: [{
          id: 'l3', logic: 'AND', children: [{
            id: 'l4', logic: 'OR', children: [{
              id: 'l5', logic: 'NOT', children: [
                { id: 'leaf', field: 'isActive', operator: 'eq', value: false }
              ]
            }]
          }]
        }]
      }]
    }];

    const result = validator.validate(conditions);
    expect(result.valid).toBe(true);
  });

  it('catches error at deep level', () => {
    const validator = new ConditionValidator(fieldsConfig);
    // Error is at depth 5 - unknown field
    const conditions: FilterCondition[] = [{
      id: 'l1', logic: 'AND', children: [{
        id: 'l2', logic: 'OR', children: [{
          id: 'l3', logic: 'AND', children: [{
            id: 'l4', logic: 'OR', children: [{
              id: 'l5', logic: 'AND', children: [
                { id: 'leaf', field: 'unknownField', operator: 'eq', value: 'test' }
              ]
            }]
          }]
        }]
      }]
    }];

    const result = validator.validate(conditions);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('UNKNOWN_FIELD');
  });

  it('validates wide tree (many siblings) at depth 5', () => {
    const validator = new ConditionValidator(fieldsConfig);
    const conditions: FilterCondition[] = [{
      id: 'l1', logic: 'AND', children: [{
        id: 'l2', logic: 'OR', children: [{
          id: 'l3', logic: 'AND', children: [{
            id: 'l4', logic: 'OR', children: [{
              id: 'l5', logic: 'AND', children: [
                { id: 'leaf1', field: 'name', operator: 'eq', value: 'A' },
                { id: 'leaf2', field: 'name', operator: 'eq', value: 'B' },
                { id: 'leaf3', field: 'name', operator: 'eq', value: 'C' },
                { id: 'leaf4', field: 'name', operator: 'eq', value: 'D' },
                { id: 'leaf5', field: 'name', operator: 'eq', value: 'E' }
              ]
            }]
          }]
        }]
      }]
    }];

    const result = validator.validate(conditions);
    expect(result.valid).toBe(true);
  });
});

describe('Association/Relation field tests', () => {
  const fieldsConfig = {
    name: { type: 'string' },
    userId: { type: 'association' },
    groupId: { type: 'association' },
    tags: { type: 'association-many' },
    categoryIds: { type: 'association-many' }
  };

  describe('belongsTo (association) relations', () => {
    it('allows eq operator for association', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'userId', operator: 'eq', value: 123 }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(true);
    });

    it('allows neq operator for association', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'userId', operator: 'neq', value: 123 }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(true);
    });

    it('allows in operator for association', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'userId', operator: 'in', value: [1, 2, 3] }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(true);
    });

    it('allows notIn operator for association', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'groupId', operator: 'notIn', value: [10, 20] }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(true);
    });

    it('allows isNull operator for association', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'userId', operator: 'isNull' }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(true);
    });

    it('allows isNotNull operator for association', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'groupId', operator: 'isNotNull' }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(true);
    });

    it('rejects like operator for association', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'userId', operator: 'like', value: '%123%' }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_OPERATOR');
    });

    it('rejects gt operator for association', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'userId', operator: 'gt', value: 100 }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_OPERATOR');
    });

    it('rejects between operator for association', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'userId', operator: 'between', value: [1, 100] }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_OPERATOR');
    });
  });

  describe('hasMany (association-many) relations', () => {
    it('allows in operator for association-many', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'tags', operator: 'in', value: ['tag1', 'tag2'] }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(true);
    });

    it('allows notIn operator for association-many', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'categoryIds', operator: 'notIn', value: [1, 2, 3] }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(true);
    });

    it('allows isNull operator for association-many', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'tags', operator: 'isNull' }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(true);
    });

    it('allows isNotNull operator for association-many', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'categoryIds', operator: 'isNotNull' }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(true);
    });

    it('rejects eq operator for association-many', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'tags', operator: 'eq', value: 'tag1' }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_OPERATOR');
    });

    it('rejects neq operator for association-many', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'categoryIds', operator: 'neq', value: 5 }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_OPERATOR');
    });

    it('rejects like operator for association-many', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'tags', operator: 'like', value: '%tag%' }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_OPERATOR');
    });
  });

  describe('combined relation conditions', () => {
    it('validates multiple association conditions', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [
        { id: '1', field: 'userId', operator: 'eq', value: 1 },
        { id: '2', field: 'groupId', operator: 'in', value: [10, 20, 30] }
      ];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(true);
    });

    it('validates nested association conditions', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [{
        id: 'g1',
        logic: 'AND',
        children: [
          { id: '1', field: 'userId', operator: 'isNotNull' },
          {
            id: 'g2',
            logic: 'OR',
            children: [
              { id: '2', field: 'groupId', operator: 'eq', value: 1 },
              { id: '3', field: 'groupId', operator: 'eq', value: 2 }
            ]
          }
        ]
      }];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(true);
    });

    it('validates combined association and association-many', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [{
        id: 'g1',
        logic: 'AND',
        children: [
          { id: '1', field: 'userId', operator: 'eq', value: 1 },
          { id: '2', field: 'tags', operator: 'in', value: ['featured', 'popular'] },
          { id: '3', field: 'categoryIds', operator: 'notIn', value: [100, 200] }
        ]
      }];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(true);
    });

    it('validates association with NOT group', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const conditions: FilterCondition[] = [{
        id: 'g1',
        logic: 'AND',
        children: [
          { id: '1', field: 'userId', operator: 'isNotNull' },
          {
            id: 'not1',
            logic: 'NOT',
            children: [
              { id: '2', field: 'groupId', operator: 'eq', value: 999 }
            ]
          }
        ]
      }];

      const result = validator.validate(conditions);
      expect(result.valid).toBe(true);
    });
  });

  describe('getOperatorsForField with associations', () => {
    it('returns correct operators for association field', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const operators = validator.getOperatorsForField('userId');

      expect(operators).toContain('eq');
      expect(operators).toContain('neq');
      expect(operators).toContain('in');
      expect(operators).toContain('notIn');
      expect(operators).toContain('isNull');
      expect(operators).toContain('isNotNull');
      expect(operators).not.toContain('like');
      expect(operators).not.toContain('gt');
      expect(operators).not.toContain('between');
    });

    it('returns correct operators for association-many field', () => {
      const validator = new ConditionValidator(fieldsConfig);
      const operators = validator.getOperatorsForField('tags');

      expect(operators).toContain('in');
      expect(operators).toContain('notIn');
      expect(operators).toContain('isNull');
      expect(operators).toContain('isNotNull');
      expect(operators).not.toContain('eq');
      expect(operators).not.toContain('neq');
      expect(operators).not.toContain('like');
    });
  });
});

describe('ModernQueryBuilder getOperatorsForFieldType for associations', () => {
  it('returns association operators', () => {
    const ops = ModernQueryBuilder.getOperatorsForFieldType('association');
    expect(ops).toContain('eq');
    expect(ops).toContain('neq');
    expect(ops).toContain('in');
    expect(ops).toContain('notIn');
    expect(ops).toContain('isNull');
    expect(ops).not.toContain('like');
    expect(ops).not.toContain('gt');
  });

  it('returns association-many operators', () => {
    const ops = ModernQueryBuilder.getOperatorsForFieldType('association-many');
    expect(ops).toContain('in');
    expect(ops).toContain('notIn');
    expect(ops).toContain('isNull');
    expect(ops).not.toContain('eq');
    expect(ops).not.toContain('neq');
  });
});
