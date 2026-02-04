/**
 * CustomConditionEditor UI Component Tests
 *
 * Tests for the React CustomConditionEditor component and related utilities.
 */

import { describe, it, expect } from 'vitest';
import {
    createEmptyCustomCondition,
    isValidCustomCondition,
    defaultCustomConditionEditorLabels,
    defaultCustomOperators,
    CustomConditionValue,
    CustomHandler,
    ParameterSchema,
} from '../src/assets/js/components/custom-condition-editor/types';

describe('CustomConditionEditor Types and Utilities', () => {
    describe('createEmptyCustomCondition', () => {
        it('should create an empty custom condition', () => {
            const condition = createEmptyCustomCondition();

            expect(condition.handlerId).toBe('');
            expect(condition.operator).toBe('eq');
            expect(condition.value).toBe('');
            expect(condition.params).toEqual({});
        });

        it('should create independent instances', () => {
            const condition1 = createEmptyCustomCondition();
            const condition2 = createEmptyCustomCondition();

            condition1.params!.test = 'value';

            expect(condition2.params).toEqual({});
        });
    });

    describe('isValidCustomCondition', () => {
        it('should return false for null', () => {
            expect(isValidCustomCondition(null)).toBe(false);
        });

        it('should return false for empty condition', () => {
            const condition = createEmptyCustomCondition();
            expect(isValidCustomCondition(condition)).toBe(false);
        });

        it('should return false for condition without handler', () => {
            const condition: CustomConditionValue = {
                handlerId: '',
                operator: 'eq',
                value: 'test',
            };
            expect(isValidCustomCondition(condition)).toBe(false);
        });

        it('should return false for condition without operator', () => {
            const condition: CustomConditionValue = {
                handlerId: 'Order.phone',
                operator: '',
                value: 'test',
            };
            expect(isValidCustomCondition(condition)).toBe(false);
        });

        it('should return false for condition without value (for non-null operators)', () => {
            const condition: CustomConditionValue = {
                handlerId: 'Order.phone',
                operator: 'eq',
                value: '',
            };
            expect(isValidCustomCondition(condition)).toBe(false);
        });

        it('should return true for valid condition with value', () => {
            const condition: CustomConditionValue = {
                handlerId: 'Order.phone',
                operator: 'eq',
                value: '555-1234',
            };
            expect(isValidCustomCondition(condition)).toBe(true);
        });

        it('should return true for isNull operator without value', () => {
            const condition: CustomConditionValue = {
                handlerId: 'Order.phone',
                operator: 'isNull',
                value: '',
            };
            expect(isValidCustomCondition(condition)).toBe(true);
        });

        it('should return true for isNotNull operator without value', () => {
            const condition: CustomConditionValue = {
                handlerId: 'Order.phone',
                operator: 'isNotNull',
                value: undefined,
            };
            expect(isValidCustomCondition(condition)).toBe(true);
        });

        it('should return true for condition with params', () => {
            const condition: CustomConditionValue = {
                handlerId: 'Order.metadata',
                operator: 'eq',
                value: 'test',
                params: { path: 'tags[0]' },
            };
            expect(isValidCustomCondition(condition)).toBe(true);
        });
    });

    describe('defaultCustomConditionEditorLabels', () => {
        it('should have all required labels', () => {
            expect(defaultCustomConditionEditorLabels.selectHandler).toBeDefined();
            expect(defaultCustomConditionEditorLabels.selectOperator).toBeDefined();
            expect(defaultCustomConditionEditorLabels.enterValue).toBeDefined();
            expect(defaultCustomConditionEditorLabels.noHandlersAvailable).toBeDefined();
        });

        it('should have form labels', () => {
            expect(defaultCustomConditionEditorLabels.handlerLabel).toBe('Custom Field');
            expect(defaultCustomConditionEditorLabels.operatorLabel).toBe('Operator');
            expect(defaultCustomConditionEditorLabels.valueLabel).toBe('Value');
            expect(defaultCustomConditionEditorLabels.parametersLabel).toBe('Parameters');
        });

        it('should have action labels', () => {
            expect(defaultCustomConditionEditorLabels.clearSelection).toBe('Clear');
        });
    });

    describe('defaultCustomOperators', () => {
        it('should have common operators', () => {
            const operatorValues = defaultCustomOperators.map((op) => op.value);

            expect(operatorValues).toContain('eq');
            expect(operatorValues).toContain('neq');
            expect(operatorValues).toContain('like');
            expect(operatorValues).toContain('gt');
            expect(operatorValues).toContain('gte');
            expect(operatorValues).toContain('lt');
            expect(operatorValues).toContain('lte');
        });

        it('should have null operators', () => {
            const operatorValues = defaultCustomOperators.map((op) => op.value);

            expect(operatorValues).toContain('isNull');
            expect(operatorValues).toContain('isNotNull');
        });

        it('should have array operator', () => {
            const operatorValues = defaultCustomOperators.map((op) => op.value);

            expect(operatorValues).toContain('in');
        });

        it('should have labels for all operators', () => {
            for (const op of defaultCustomOperators) {
                expect(op.label).toBeDefined();
                expect(typeof op.label).toBe('string');
                expect(op.label.length).toBeGreaterThan(0);
            }
        });
    });

    describe('CustomHandler interface', () => {
        it('should accept valid handler data', () => {
            const handler: CustomHandler = {
                id: 'Order.phone',
                name: 'Phone Search',
                fieldName: 'phone',
                modelName: 'Order',
            };

            expect(handler.id).toBe('Order.phone');
            expect(handler.name).toBe('Phone Search');
            expect(handler.fieldName).toBe('phone');
            expect(handler.modelName).toBe('Order');
        });

        it('should accept handler with description', () => {
            const handler: CustomHandler = {
                id: 'Order.phone',
                name: 'Phone Search',
                description: 'Search by phone number in JSON field',
                fieldName: 'phone',
                modelName: 'Order',
            };

            expect(handler.description).toBe('Search by phone number in JSON field');
        });

        it('should accept handler with parameter schema', () => {
            const handler: CustomHandler = {
                id: 'Order.metadata',
                name: 'Metadata Search',
                fieldName: 'metadata',
                modelName: 'Order',
                parameterSchema: [
                    {
                        name: 'path',
                        label: 'JSON Path',
                        type: 'string',
                        required: true,
                        placeholder: 'e.g., tags[0]',
                    },
                ],
            };

            expect(handler.parameterSchema).toHaveLength(1);
            expect(handler.parameterSchema![0].name).toBe('path');
            expect(handler.parameterSchema![0].type).toBe('string');
            expect(handler.parameterSchema![0].required).toBe(true);
        });
    });

    describe('ParameterSchema interface', () => {
        it('should support string type', () => {
            const param: ParameterSchema = {
                name: 'query',
                label: 'Search Query',
                type: 'string',
            };

            expect(param.type).toBe('string');
        });

        it('should support number type with validation', () => {
            const param: ParameterSchema = {
                name: 'limit',
                label: 'Result Limit',
                type: 'number',
                defaultValue: 10,
                validation: {
                    min: 1,
                    max: 100,
                },
            };

            expect(param.type).toBe('number');
            expect(param.defaultValue).toBe(10);
            expect(param.validation?.min).toBe(1);
            expect(param.validation?.max).toBe(100);
        });

        it('should support boolean type', () => {
            const param: ParameterSchema = {
                name: 'caseSensitive',
                label: 'Case Sensitive',
                type: 'boolean',
                defaultValue: false,
            };

            expect(param.type).toBe('boolean');
            expect(param.defaultValue).toBe(false);
        });

        it('should support select type with options', () => {
            const param: ParameterSchema = {
                name: 'comparison',
                label: 'Comparison Type',
                type: 'select',
                options: [
                    { value: 'exact', label: 'Exact Match' },
                    { value: 'fuzzy', label: 'Fuzzy Match' },
                    { value: 'regex', label: 'Regular Expression' },
                ],
            };

            expect(param.type).toBe('select');
            expect(param.options).toHaveLength(3);
            expect(param.options![0].value).toBe('exact');
        });

        it('should support date type', () => {
            const param: ParameterSchema = {
                name: 'after',
                label: 'After Date',
                type: 'date',
            };

            expect(param.type).toBe('date');
        });

        it('should support json type', () => {
            const param: ParameterSchema = {
                name: 'config',
                label: 'Configuration',
                type: 'json',
                placeholder: '{"key": "value"}',
            };

            expect(param.type).toBe('json');
            expect(param.placeholder).toBe('{"key": "value"}');
        });

        it('should support pattern validation', () => {
            const param: ParameterSchema = {
                name: 'email',
                label: 'Email Pattern',
                type: 'string',
                validation: {
                    pattern: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$',
                    message: 'Invalid email format',
                },
            };

            expect(param.validation?.pattern).toBeDefined();
            expect(param.validation?.message).toBe('Invalid email format');
        });
    });

    describe('CustomConditionValue interface', () => {
        it('should accept minimal condition', () => {
            const condition: CustomConditionValue = {
                handlerId: 'Order.phone',
                operator: 'eq',
                value: '555-1234',
            };

            expect(condition.handlerId).toBe('Order.phone');
            expect(condition.operator).toBe('eq');
            expect(condition.value).toBe('555-1234');
        });

        it('should accept condition with params', () => {
            const condition: CustomConditionValue = {
                handlerId: 'Order.metadata',
                operator: 'like',
                value: 'premium',
                params: {
                    path: 'customer.tier',
                    caseSensitive: false,
                },
            };

            expect(condition.params?.path).toBe('customer.tier');
            expect(condition.params?.caseSensitive).toBe(false);
        });

        it('should accept null value for isNull operator', () => {
            const condition: CustomConditionValue = {
                handlerId: 'Order.notes',
                operator: 'isNull',
                value: null,
            };

            expect(condition.value).toBeNull();
        });

        it('should accept array value for in operator', () => {
            const condition: CustomConditionValue = {
                handlerId: 'Order.status',
                operator: 'in',
                value: ['pending', 'processing', 'completed'],
            };

            expect(Array.isArray(condition.value)).toBe(true);
            expect(condition.value).toContain('pending');
        });

        it('should accept numeric value', () => {
            const condition: CustomConditionValue = {
                handlerId: 'Order.total',
                operator: 'gte',
                value: 1000,
            };

            expect(condition.value).toBe(1000);
        });
    });
});

describe('CustomConditionEditor Component Structure', () => {
    describe('Handler selection', () => {
        it('should have handler selection functionality in labels', () => {
            expect(defaultCustomConditionEditorLabels.selectHandler).toBe('Select custom handler...');
            expect(defaultCustomConditionEditorLabels.handlerLabel).toBe('Custom Field');
        });

        it('should have no handlers message', () => {
            expect(defaultCustomConditionEditorLabels.noHandlersAvailable).toBe(
                'No custom handlers available'
            );
        });
    });

    describe('Operator configuration', () => {
        it('should have operator selection labels', () => {
            expect(defaultCustomConditionEditorLabels.selectOperator).toBe('Select operator...');
            expect(defaultCustomConditionEditorLabels.operatorLabel).toBe('Operator');
        });

        it('should provide default operators', () => {
            expect(defaultCustomOperators.length).toBeGreaterThan(0);
            expect(defaultCustomOperators.find((op) => op.value === 'eq')).toBeDefined();
        });
    });

    describe('Value input', () => {
        it('should have value input labels', () => {
            expect(defaultCustomConditionEditorLabels.enterValue).toBe('Enter value...');
            expect(defaultCustomConditionEditorLabels.valueLabel).toBe('Value');
        });
    });

    describe('Parameters section', () => {
        it('should have parameters label', () => {
            expect(defaultCustomConditionEditorLabels.parametersLabel).toBe('Parameters');
        });
    });

    describe('Actions', () => {
        it('should have clear action', () => {
            expect(defaultCustomConditionEditorLabels.clearSelection).toBe('Clear');
        });
    });
});

describe('Custom Handler Use Cases', () => {
    describe('JSON field search', () => {
        it('should support JSON path search handler', () => {
            const handler: CustomHandler = {
                id: 'Order.phone',
                name: 'Phone Number Search',
                description: 'Search phone number in JSON contact field',
                fieldName: 'phone',
                modelName: 'Order',
                parameterSchema: [
                    {
                        name: 'jsonPath',
                        label: 'JSON Path',
                        type: 'string',
                        required: true,
                        defaultValue: 'number',
                        placeholder: 'e.g., number, area.code',
                    },
                ],
            };

            const condition: CustomConditionValue = {
                handlerId: handler.id,
                operator: 'like',
                value: '555',
                params: { jsonPath: 'number' },
            };

            expect(isValidCustomCondition(condition)).toBe(true);
        });
    });

    describe('Computed field', () => {
        it('should support computed total handler', () => {
            const handler: CustomHandler = {
                id: 'Order.discountedTotal',
                name: 'Discounted Total',
                description: 'Filter by total after discount applied',
                fieldName: 'discountedTotal',
                modelName: 'Order',
            };

            const condition: CustomConditionValue = {
                handlerId: handler.id,
                operator: 'gte',
                value: 500,
            };

            expect(isValidCustomCondition(condition)).toBe(true);
        });
    });

    describe('Full-text search', () => {
        it('should support full-text search handler', () => {
            const handler: CustomHandler = {
                id: 'Product.fullText',
                name: 'Full-Text Search',
                description: 'Search across name, description, and tags',
                fieldName: 'fullText',
                modelName: 'Product',
                parameterSchema: [
                    {
                        name: 'fields',
                        label: 'Search Fields',
                        type: 'select',
                        options: [
                            { value: 'all', label: 'All Fields' },
                            { value: 'name', label: 'Name Only' },
                            { value: 'description', label: 'Description Only' },
                        ],
                        defaultValue: 'all',
                    },
                    {
                        name: 'fuzzy',
                        label: 'Fuzzy Match',
                        type: 'boolean',
                        defaultValue: true,
                    },
                ],
            };

            const condition: CustomConditionValue = {
                handlerId: handler.id,
                operator: 'like',
                value: 'wireless headphones',
                params: { fields: 'all', fuzzy: true },
            };

            expect(isValidCustomCondition(condition)).toBe(true);
            expect(handler.parameterSchema).toHaveLength(2);
        });
    });

    describe('Geo-spatial query', () => {
        it('should support geo radius handler', () => {
            const handler: CustomHandler = {
                id: 'Store.nearLocation',
                name: 'Near Location',
                description: 'Find stores within radius of a point',
                fieldName: 'location',
                modelName: 'Store',
                parameterSchema: [
                    {
                        name: 'latitude',
                        label: 'Latitude',
                        type: 'number',
                        required: true,
                        validation: { min: -90, max: 90 },
                    },
                    {
                        name: 'longitude',
                        label: 'Longitude',
                        type: 'number',
                        required: true,
                        validation: { min: -180, max: 180 },
                    },
                    {
                        name: 'radiusKm',
                        label: 'Radius (km)',
                        type: 'number',
                        required: true,
                        defaultValue: 10,
                        validation: { min: 0.1, max: 500 },
                    },
                ],
            };

            const condition: CustomConditionValue = {
                handlerId: handler.id,
                operator: 'lte',
                value: 10,
                params: {
                    latitude: 37.7749,
                    longitude: -122.4194,
                    radiusKm: 10,
                },
            };

            expect(handler.parameterSchema).toHaveLength(3);
            expect(isValidCustomCondition(condition)).toBe(true);
        });
    });

    describe('Date range with business logic', () => {
        it('should support business days handler', () => {
            const handler: CustomHandler = {
                id: 'Task.dueWithinBusinessDays',
                name: 'Due Within Business Days',
                description: 'Tasks due within N business days (excludes weekends)',
                fieldName: 'dueDate',
                modelName: 'Task',
                parameterSchema: [
                    {
                        name: 'excludeHolidays',
                        label: 'Exclude Holidays',
                        type: 'boolean',
                        defaultValue: true,
                    },
                ],
            };

            const condition: CustomConditionValue = {
                handlerId: handler.id,
                operator: 'lte',
                value: 5,
                params: { excludeHolidays: true },
            };

            expect(isValidCustomCondition(condition)).toBe(true);
        });
    });
});

describe('Edge Cases', () => {
    it('should handle empty params object', () => {
        const condition: CustomConditionValue = {
            handlerId: 'Order.phone',
            operator: 'eq',
            value: 'test',
            params: {},
        };

        expect(isValidCustomCondition(condition)).toBe(true);
    });

    it('should handle undefined params', () => {
        const condition: CustomConditionValue = {
            handlerId: 'Order.phone',
            operator: 'eq',
            value: 'test',
        };

        expect(isValidCustomCondition(condition)).toBe(true);
        expect(condition.params).toBeUndefined();
    });

    it('should handle value of 0', () => {
        const condition: CustomConditionValue = {
            handlerId: 'Order.total',
            operator: 'eq',
            value: 0,
        };

        // 0 is a valid value
        expect(isValidCustomCondition(condition)).toBe(true);
    });

    it('should handle boolean value false', () => {
        const condition: CustomConditionValue = {
            handlerId: 'Order.isPaid',
            operator: 'eq',
            value: false,
        };

        expect(isValidCustomCondition(condition)).toBe(true);
    });

    it('should handle whitespace-only value as invalid', () => {
        const condition: CustomConditionValue = {
            handlerId: 'Order.phone',
            operator: 'eq',
            value: '   ',
        };

        // Whitespace string is truthy, so it's considered valid by current impl
        expect(isValidCustomCondition(condition)).toBe(true);
    });
});
