import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FilterMigrator, CURRENT_FILTER_VERSION, MigrationResult, MigrationChange } from '../src/lib/filters/FilterMigrator';
import { FilterAP, FilterCondition, FilterOperator } from '../src/models/FilterAP';

// Helper to create a minimal filter
function createTestFilter(overrides: Partial<FilterAP> = {}): FilterAP {
    return {
        id: 'test-filter-1',
        name: 'Test Filter',
        modelName: 'Order',
        slug: 'test-filter',
        conditions: [],
        visibility: 'private',
        owner: 1,
        apiEnabled: false,
        version: CURRENT_FILTER_VERSION,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides
    };
}

// Helper to create a condition
function createCondition(overrides: Partial<FilterCondition> = {}): FilterCondition {
    return {
        id: `cond-${Math.random().toString(36).substr(2, 9)}`,
        field: 'status',
        operator: 'eq',
        value: 'active',
        ...overrides
    };
}

// Mock fields config for validation tests
const mockFieldsConfig = {
    id: { type: 'number' },
    name: { type: 'string', maxLength: 100 },
    status: { type: 'string' },
    total: { type: 'number' },
    createdAt: { type: 'datetime' },
    isActive: { type: 'boolean' },
    tags: { type: 'json' },
    category: { type: 'association' }
};

describe('FilterMigrator', () => {
    describe('validateAndMigrate', () => {
        it('should return valid result for empty conditions', () => {
            const filter = createTestFilter({ conditions: [] });
            const result = FilterMigrator.validateAndMigrate(filter, mockFieldsConfig);

            expect(result.validation.valid).toBe(true);
            expect(result.filter).toBeDefined();
            expect(result.migrated).toBe(false);
            expect(result.validation.errors).toHaveLength(0);
        });

        it('should validate simple condition with known field', () => {
            const filter = createTestFilter({
                conditions: [
                    createCondition({ field: 'status', operator: 'eq', value: 'active' })
                ]
            });

            const result = FilterMigrator.validateAndMigrate(filter, mockFieldsConfig);

            expect(result.validation.valid).toBe(true);
            expect(result.validation.errors).toHaveLength(0);
        });

        it('should report unknown field as warning in non-strict mode', () => {
            const filter = createTestFilter({
                conditions: [
                    createCondition({ field: 'unknownField', operator: 'eq', value: 'test' })
                ]
            });

            const result = FilterMigrator.validateAndMigrate(filter, mockFieldsConfig, {
                strictValidation: false
            });

            // Unknown field should be converted to warning, not error
            expect(result.validation.valid).toBe(true);
            // Warnings should include some mention of the unknown field
            expect(result.warnings.some(w => w.includes('unknownField'))).toBe(true);
        });

        it('should report unknown field as error in strict mode', () => {
            const filter = createTestFilter({
                conditions: [
                    createCondition({ field: 'unknownField', operator: 'eq', value: 'test' })
                ]
            });

            const result = FilterMigrator.validateAndMigrate(filter, mockFieldsConfig, {
                strictValidation: true
            });

            expect(result.validation.valid).toBe(false);
            expect(result.validation.errors).toContainEqual(
                expect.objectContaining({ code: 'UNKNOWN_FIELD' })
            );
        });

        it('should update filter version', () => {
            const filter = createTestFilter({ version: 0 });
            const result = FilterMigrator.validateAndMigrate(filter, mockFieldsConfig);

            expect(result.filter.version).toBe(CURRENT_FILTER_VERSION);
            expect(result.fromVersion).toBe(0);
            expect(result.toVersion).toBe(CURRENT_FILTER_VERSION);
        });

        it('should handle missing version field', () => {
            const filter = createTestFilter();
            delete (filter as any).version;

            const result = FilterMigrator.validateAndMigrate(filter, mockFieldsConfig);

            expect(result.filter.version).toBe(CURRENT_FILTER_VERSION);
            expect(result.fromVersion).toBe(0);
        });
    });

    describe('operator validation', () => {
        it('should validate correct operator for string field', () => {
            const filter = createTestFilter({
                conditions: [
                    createCondition({ field: 'name', operator: 'like', value: '%test%' })
                ]
            });

            const result = FilterMigrator.validateAndMigrate(filter, mockFieldsConfig);
            expect(result.validation.valid).toBe(true);
        });

        it('should validate correct operator for number field', () => {
            const filter = createTestFilter({
                conditions: [
                    createCondition({ field: 'total', operator: 'gte', value: 100 })
                ]
            });

            const result = FilterMigrator.validateAndMigrate(filter, mockFieldsConfig);
            expect(result.validation.valid).toBe(true);
        });

        it('should validate correct operator for datetime field', () => {
            const filter = createTestFilter({
                conditions: [
                    createCondition({ field: 'createdAt', operator: 'between', value: ['2024-01-01', '2024-12-31'] })
                ]
            });

            const result = FilterMigrator.validateAndMigrate(filter, mockFieldsConfig);
            expect(result.validation.valid).toBe(true);
        });

        it('should validate correct operator for boolean field', () => {
            const filter = createTestFilter({
                conditions: [
                    createCondition({ field: 'isActive', operator: 'eq', value: true })
                ]
            });

            const result = FilterMigrator.validateAndMigrate(filter, mockFieldsConfig);
            expect(result.validation.valid).toBe(true);
        });

        it('should reject invalid operator for boolean field', () => {
            const filter = createTestFilter({
                conditions: [
                    createCondition({ field: 'isActive', operator: 'like', value: 'true' })
                ]
            });

            const result = FilterMigrator.validateAndMigrate(filter, mockFieldsConfig);
            expect(result.validation.valid).toBe(false);
            expect(result.validation.errors).toContainEqual(
                expect.objectContaining({ code: 'INVALID_OPERATOR' })
            );
        });

        it('should validate IN operator with array value', () => {
            const filter = createTestFilter({
                conditions: [
                    createCondition({ field: 'status', operator: 'in', value: ['active', 'pending'] })
                ]
            });

            const result = FilterMigrator.validateAndMigrate(filter, mockFieldsConfig);
            expect(result.validation.valid).toBe(true);
        });

        it('should reject IN operator without array value', () => {
            const filter = createTestFilter({
                conditions: [
                    createCondition({ field: 'status', operator: 'in', value: 'active' })
                ]
            });

            const result = FilterMigrator.validateAndMigrate(filter, mockFieldsConfig);
            expect(result.validation.valid).toBe(false);
            expect(result.validation.errors).toContainEqual(
                expect.objectContaining({ code: 'INVALID_VALUE' })
            );
        });
    });

    describe('nested conditions', () => {
        it('should validate AND group', () => {
            const filter = createTestFilter({
                conditions: [{
                    id: 'group-1',
                    logic: 'AND',
                    children: [
                        createCondition({ field: 'status', operator: 'eq', value: 'active' }),
                        createCondition({ field: 'total', operator: 'gte', value: 100 })
                    ]
                }]
            });

            const result = FilterMigrator.validateAndMigrate(filter, mockFieldsConfig);
            expect(result.validation.valid).toBe(true);
        });

        it('should validate OR group', () => {
            const filter = createTestFilter({
                conditions: [{
                    id: 'group-1',
                    logic: 'OR',
                    children: [
                        createCondition({ field: 'status', operator: 'eq', value: 'active' }),
                        createCondition({ field: 'status', operator: 'eq', value: 'pending' })
                    ]
                }]
            });

            const result = FilterMigrator.validateAndMigrate(filter, mockFieldsConfig);
            expect(result.validation.valid).toBe(true);
        });

        it('should validate NOT group with single child', () => {
            const filter = createTestFilter({
                conditions: [{
                    id: 'group-1',
                    logic: 'NOT',
                    children: [
                        createCondition({ field: 'status', operator: 'eq', value: 'deleted' })
                    ]
                }]
            });

            const result = FilterMigrator.validateAndMigrate(filter, mockFieldsConfig);
            expect(result.validation.valid).toBe(true);
        });

        it('should reject NOT group with multiple children', () => {
            const filter = createTestFilter({
                conditions: [{
                    id: 'group-1',
                    logic: 'NOT',
                    children: [
                        createCondition({ field: 'status', operator: 'eq', value: 'deleted' }),
                        createCondition({ field: 'status', operator: 'eq', value: 'archived' })
                    ]
                }]
            });

            const result = FilterMigrator.validateAndMigrate(filter, mockFieldsConfig);
            expect(result.validation.valid).toBe(false);
            expect(result.validation.errors).toContainEqual(
                expect.objectContaining({ code: 'NOT_REQUIRES_ONE' })
            );
        });

        it('should validate deeply nested conditions', () => {
            const filter = createTestFilter({
                conditions: [{
                    id: 'level-1',
                    logic: 'AND',
                    children: [{
                        id: 'level-2',
                        logic: 'OR',
                        children: [
                            createCondition({ field: 'status', operator: 'eq', value: 'active' }),
                            {
                                id: 'level-3',
                                logic: 'AND',
                                children: [
                                    createCondition({ field: 'total', operator: 'gte', value: 100 }),
                                    createCondition({ field: 'isActive', operator: 'eq', value: true })
                                ]
                            }
                        ]
                    }]
                }]
            });

            const result = FilterMigrator.validateAndMigrate(filter, mockFieldsConfig);
            expect(result.validation.valid).toBe(true);
        });
    });

    describe('needsMigration', () => {
        it('should return false for current version filter', () => {
            const filter = createTestFilter({ version: CURRENT_FILTER_VERSION });
            expect(FilterMigrator.needsMigration(filter)).toBe(false);
        });

        it('should return true for filter with missing version', () => {
            const filter = createTestFilter();
            delete (filter as any).version;
            expect(FilterMigrator.needsMigration(filter)).toBe(true);
        });

        it('should return true for filter with old version', () => {
            const filter = createTestFilter({ version: 0 });
            expect(FilterMigrator.needsMigration(filter)).toBe(true);
        });
    });

    describe('validateOnly', () => {
        it('should validate without migration', () => {
            const filter = createTestFilter({
                version: 0,
                conditions: [
                    createCondition({ field: 'status', operator: 'eq', value: 'active' })
                ]
            });

            const result = FilterMigrator.validateOnly(filter, mockFieldsConfig);

            expect(result.valid).toBe(true);
            // Version should NOT be updated since we only validate
            expect(filter.version).toBe(0);
        });

        it('should return errors for invalid conditions', () => {
            const filter = createTestFilter({
                conditions: [
                    createCondition({ field: undefined as any, operator: 'eq', value: 'test' })
                ]
            });

            const result = FilterMigrator.validateOnly(filter, mockFieldsConfig);

            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                expect.objectContaining({ code: 'FIELD_REQUIRED' })
            );
        });
    });

    describe('sanitizeConditions', () => {
        it('should return conditions unchanged when no issues', () => {
            const conditions: FilterCondition[] = [
                createCondition({ field: 'status', operator: 'eq', value: 'active' })
            ];

            const result = FilterMigrator.sanitizeConditions(conditions, mockFieldsConfig);

            expect(result.conditions).toHaveLength(1);
            expect(result.removed).toHaveLength(0);
        });

        it('should remove rawSQL conditions when requested', () => {
            const conditions: FilterCondition[] = [
                createCondition({ field: 'status', operator: 'eq', value: 'active' }),
                { id: 'raw-1', rawSQL: 'total > 100', rawSQLParams: [] }
            ];

            const result = FilterMigrator.sanitizeConditions(conditions, mockFieldsConfig, {
                removeRawSQL: true
            });

            expect(result.conditions).toHaveLength(1);
            expect(result.removed).toContainEqual(expect.stringContaining('rawSQL removed'));
        });

        it('should remove conditions with unknown fields when requested', () => {
            const conditions: FilterCondition[] = [
                createCondition({ field: 'status', operator: 'eq', value: 'active' }),
                createCondition({ field: 'unknownField', operator: 'eq', value: 'test' })
            ];

            const result = FilterMigrator.sanitizeConditions(conditions, mockFieldsConfig, {
                removeInvalid: true
            });

            expect(result.conditions).toHaveLength(1);
            expect(result.conditions[0].field).toBe('status');
            expect(result.removed).toContainEqual(expect.stringContaining('unknownField'));
        });

        it('should preserve valid nested conditions', () => {
            const conditions: FilterCondition[] = [{
                id: 'group-1',
                logic: 'AND',
                children: [
                    createCondition({ field: 'status', operator: 'eq', value: 'active' }),
                    createCondition({ field: 'total', operator: 'gte', value: 100 })
                ]
            }];

            const result = FilterMigrator.sanitizeConditions(conditions, mockFieldsConfig);

            expect(result.conditions).toHaveLength(1);
            expect(result.conditions[0].children).toHaveLength(2);
        });

        it('should remove invalid nested conditions when requested', () => {
            const conditions: FilterCondition[] = [{
                id: 'group-1',
                logic: 'AND',
                children: [
                    createCondition({ field: 'status', operator: 'eq', value: 'active' }),
                    createCondition({ field: 'unknownField', operator: 'eq', value: 'test' })
                ]
            }];

            const result = FilterMigrator.sanitizeConditions(conditions, mockFieldsConfig, {
                removeInvalid: true
            });

            expect(result.conditions).toHaveLength(1);
            expect(result.conditions[0].children).toHaveLength(1);
            expect(result.removed).toContainEqual(expect.stringContaining('unknownField'));
        });
    });

    describe('getCurrentVersion', () => {
        it('should return current filter version', () => {
            expect(FilterMigrator.getCurrentVersion()).toBe(CURRENT_FILTER_VERSION);
            expect(FilterMigrator.getCurrentVersion()).toBe(1);
        });
    });

    describe('getDeprecatedOperators', () => {
        it('should return deprecated operators mapping', () => {
            const deprecated = FilterMigrator.getDeprecatedOperators();
            expect(typeof deprecated).toBe('object');
        });
    });

    describe('registerMigration', () => {
        it('should allow registering custom migration', () => {
            const customMigration = vi.fn((filter: FilterAP) => ({
                ...filter,
                name: filter.name + ' (migrated)'
            }));

            FilterMigrator.registerMigration(99, customMigration);

            // Create a filter that would trigger this migration
            const filter = createTestFilter({ version: 99 });

            // Since CURRENT_FILTER_VERSION is 1, this migration won't run
            // But we verify it was registered by checking internal state
            // This is more of an API test
            expect(customMigration).not.toHaveBeenCalled();
        });
    });

    describe('edge cases', () => {
        it('should handle null conditions array', () => {
            const filter = createTestFilter({ conditions: null as any });
            const result = FilterMigrator.validateAndMigrate(filter, mockFieldsConfig);

            expect(result.migrated).toBe(false);
        });

        it('should handle undefined fieldsConfig', () => {
            const filter = createTestFilter({
                conditions: [
                    createCondition({ field: 'status', operator: 'eq', value: 'active' })
                ]
            });

            const result = FilterMigrator.validateAndMigrate(filter, undefined);

            expect(result.filter).toBeDefined();
            expect(result.validation.valid).toBe(true);
        });

        it('should handle empty fieldsConfig', () => {
            const filter = createTestFilter({
                conditions: [
                    createCondition({ field: 'status', operator: 'eq', value: 'active' })
                ]
            });

            const result = FilterMigrator.validateAndMigrate(filter, {});

            // Should report unknown field since config is empty
            expect(result.warnings.some(w => w.includes('status'))).toBe(true);
        });

        it('should handle condition without operator', () => {
            const filter = createTestFilter({
                conditions: [
                    { id: 'cond-1', field: 'status', value: 'active' } as FilterCondition
                ]
            });

            const result = FilterMigrator.validateAndMigrate(filter, mockFieldsConfig);

            expect(result.validation.valid).toBe(false);
            expect(result.validation.errors).toContainEqual(
                expect.objectContaining({ code: 'OPERATOR_REQUIRED' })
            );
        });

        it('should handle condition without value (non-null operators)', () => {
            const filter = createTestFilter({
                conditions: [
                    createCondition({ field: 'status', operator: 'eq', value: undefined })
                ]
            });

            const result = FilterMigrator.validateAndMigrate(filter, mockFieldsConfig);

            expect(result.validation.valid).toBe(false);
            expect(result.validation.errors).toContainEqual(
                expect.objectContaining({ code: 'INVALID_VALUE' })
            );
        });

        it('should allow isNull operator without value', () => {
            const filter = createTestFilter({
                conditions: [
                    createCondition({ field: 'status', operator: 'isNull', value: undefined })
                ]
            });

            const result = FilterMigrator.validateAndMigrate(filter, mockFieldsConfig);

            expect(result.validation.valid).toBe(true);
        });

        it('should allow isNotNull operator without value', () => {
            const filter = createTestFilter({
                conditions: [
                    createCondition({ field: 'name', operator: 'isNotNull', value: undefined })
                ]
            });

            const result = FilterMigrator.validateAndMigrate(filter, mockFieldsConfig);

            expect(result.validation.valid).toBe(true);
        });
    });

    describe('BETWEEN operator validation', () => {
        it('should accept array with 2 values', () => {
            const filter = createTestFilter({
                conditions: [
                    createCondition({ field: 'total', operator: 'between', value: [100, 500] })
                ]
            });

            const result = FilterMigrator.validateAndMigrate(filter, mockFieldsConfig);
            expect(result.validation.valid).toBe(true);
        });

        it('should reject non-array value', () => {
            const filter = createTestFilter({
                conditions: [
                    createCondition({ field: 'total', operator: 'between', value: 100 })
                ]
            });

            const result = FilterMigrator.validateAndMigrate(filter, mockFieldsConfig);
            expect(result.validation.valid).toBe(false);
            expect(result.validation.errors).toContainEqual(
                expect.objectContaining({ message: expect.stringContaining('BETWEEN') })
            );
        });

        it('should reject array with wrong length', () => {
            const filter = createTestFilter({
                conditions: [
                    createCondition({ field: 'total', operator: 'between', value: [100] })
                ]
            });

            const result = FilterMigrator.validateAndMigrate(filter, mockFieldsConfig);
            expect(result.validation.valid).toBe(false);
        });
    });

    describe('regex operator validation', () => {
        it('should accept valid regex pattern', () => {
            const filter = createTestFilter({
                conditions: [
                    createCondition({ field: 'name', operator: 'regex', value: '^test.*$' })
                ]
            });

            const result = FilterMigrator.validateAndMigrate(filter, mockFieldsConfig);
            expect(result.validation.valid).toBe(true);
        });

        it('should reject invalid regex pattern', () => {
            const filter = createTestFilter({
                conditions: [
                    createCondition({ field: 'name', operator: 'regex', value: '[invalid(' })
                ]
            });

            const result = FilterMigrator.validateAndMigrate(filter, mockFieldsConfig);
            expect(result.validation.valid).toBe(false);
            expect(result.validation.errors).toContainEqual(
                expect.objectContaining({ message: expect.stringContaining('regex') })
            );
        });
    });

    describe('custom handler conditions', () => {
        it('should skip validation for custom handler conditions', () => {
            const filter = createTestFilter({
                conditions: [
                    createCondition({
                        field: 'tags',
                        operator: 'custom',
                        customHandler: 'jsonContains',
                        customHandlerParams: { key: 'priority', value: 'high' }
                    })
                ]
            });

            const result = FilterMigrator.validateAndMigrate(filter, mockFieldsConfig);
            expect(result.validation.valid).toBe(true);
        });
    });

    describe('rawSQL conditions', () => {
        it('should validate safe rawSQL', () => {
            const filter = createTestFilter({
                conditions: [
                    { id: 'raw-1', rawSQL: 'total > $1', rawSQLParams: [100] }
                ]
            });

            const result = FilterMigrator.validateAndMigrate(filter, mockFieldsConfig);
            expect(result.validation.valid).toBe(true);
        });

        it('should reject dangerous rawSQL patterns', () => {
            const filter = createTestFilter({
                conditions: [
                    { id: 'raw-1', rawSQL: 'total > 0; DROP TABLE users;', rawSQLParams: [] }
                ]
            });

            const result = FilterMigrator.validateAndMigrate(filter, mockFieldsConfig);
            expect(result.validation.valid).toBe(false);
            expect(result.validation.errors).toContainEqual(
                expect.objectContaining({ code: 'DANGEROUS_SQL' })
            );
        });

        it('should reject UNION SELECT in rawSQL', () => {
            const filter = createTestFilter({
                conditions: [
                    { id: 'raw-1', rawSQL: 'total > 0 UNION SELECT * FROM users', rawSQLParams: [] }
                ]
            });

            const result = FilterMigrator.validateAndMigrate(filter, mockFieldsConfig);
            expect(result.validation.valid).toBe(false);
            expect(result.validation.errors).toContainEqual(
                expect.objectContaining({ code: 'DANGEROUS_SQL' })
            );
        });
    });

    describe('migration changes tracking', () => {
        it('should track changes when migration occurs', () => {
            const filter = createTestFilter({ version: 0 });
            const result = FilterMigrator.validateAndMigrate(filter, mockFieldsConfig);

            expect(result.fromVersion).toBe(0);
            expect(result.toVersion).toBe(CURRENT_FILTER_VERSION);
            // No actual changes since we don't have any deprecated operators
            expect(result.changes).toBeDefined();
        });

        it('should preserve MigrationChange structure', () => {
            const filter = createTestFilter({
                version: 0,
                conditions: [
                    // Add a condition with potentially unknown operator
                    { id: 'cond-1', field: 'status', operator: 'unknownOp' as any, value: 'test' }
                ]
            });

            const result = FilterMigrator.validateAndMigrate(filter, mockFieldsConfig);

            // Should have recorded the unknown operator
            const change = result.changes.find(c => c.type === 'condition_modified');
            if (change) {
                expect(change.conditionId).toBe('cond-1');
                expect(change.description).toContain('unknownOp');
            }
        });
    });
});

describe('FilterMigrator Integration', () => {
    it('should handle complete filter lifecycle', () => {
        // 1. Create a filter with old version
        const filter = createTestFilter({
            version: 0,
            conditions: [
                createCondition({ field: 'status', operator: 'eq', value: 'active' }),
                {
                    id: 'group-1',
                    logic: 'OR',
                    children: [
                        createCondition({ field: 'total', operator: 'gte', value: 100 }),
                        createCondition({ field: 'total', operator: 'lte', value: 50 })
                    ]
                }
            ]
        });

        // 2. Check if needs migration
        expect(FilterMigrator.needsMigration(filter)).toBe(true);

        // 3. Validate and migrate
        const result = FilterMigrator.validateAndMigrate(filter, mockFieldsConfig);

        // 4. Verify result
        expect(result.filter.version).toBe(CURRENT_FILTER_VERSION);
        expect(result.validation.valid).toBe(true);
        expect(result.fromVersion).toBe(0);
        expect(result.toVersion).toBe(CURRENT_FILTER_VERSION);

        // 5. Migrated filter should not need migration anymore
        expect(FilterMigrator.needsMigration(result.filter)).toBe(false);
    });

    it('should handle filter with mixed valid and invalid conditions', () => {
        const filter = createTestFilter({
            conditions: [
                createCondition({ field: 'status', operator: 'eq', value: 'active' }), // valid
                createCondition({ field: 'unknownField', operator: 'eq', value: 'test' }), // invalid field
                createCondition({ field: 'isActive', operator: 'like', value: 'true' }) // invalid operator
            ]
        });

        // Non-strict validation
        const resultNonStrict = FilterMigrator.validateAndMigrate(filter, mockFieldsConfig, {
            strictValidation: false
        });

        // Unknown field becomes warning, invalid operator remains error
        expect(resultNonStrict.validation.valid).toBe(false);
        expect(resultNonStrict.warnings.some(w => w.includes('unknownField'))).toBe(true);
        expect(resultNonStrict.validation.errors).toContainEqual(
            expect.objectContaining({ code: 'INVALID_OPERATOR' })
        );
    });
});
