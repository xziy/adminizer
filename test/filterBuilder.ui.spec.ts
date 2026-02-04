/**
 * FilterBuilder UI Component Tests
 *
 * Tests for the React FilterBuilder component and related utilities.
 */

import { describe, it, expect } from 'vitest';
import {
    generateConditionId,
    createEmptyCondition,
    createConditionGroup,
    operatorsByType,
    operatorLabels,
    defaultLabels,
    FilterCondition,
} from '../src/assets/js/components/filter-builder/types';

describe('FilterBuilder Types and Utilities', () => {
    describe('generateConditionId', () => {
        it('should generate a valid UUID', () => {
            const id = generateConditionId();
            expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        });

        it('should generate unique IDs', () => {
            const ids = new Set();
            for (let i = 0; i < 100; i++) {
                ids.add(generateConditionId());
            }
            expect(ids.size).toBe(100);
        });
    });

    describe('createEmptyCondition', () => {
        it('should create a condition with default values', () => {
            const condition = createEmptyCondition();

            expect(condition.id).toBeDefined();
            expect(condition.field).toBe('');
            expect(condition.operator).toBe('eq');
            expect(condition.value).toBe('');
        });

        it('should create conditions with unique IDs', () => {
            const condition1 = createEmptyCondition();
            const condition2 = createEmptyCondition();

            expect(condition1.id).not.toBe(condition2.id);
        });
    });

    describe('createConditionGroup', () => {
        it('should create an AND group by default', () => {
            const group = createConditionGroup();

            expect(group.id).toBeDefined();
            expect(group.logic).toBe('AND');
            expect(group.children).toHaveLength(1);
            expect(group.children![0].field).toBe('');
        });

        it('should create an OR group when specified', () => {
            const group = createConditionGroup('OR');

            expect(group.logic).toBe('OR');
            expect(group.children).toHaveLength(1);
        });

        it('should create groups with unique IDs', () => {
            const group1 = createConditionGroup();
            const group2 = createConditionGroup();

            expect(group1.id).not.toBe(group2.id);
        });
    });

    describe('operatorsByType', () => {
        it('should have operators for string type', () => {
            const operators = operatorsByType.string;

            expect(operators).toContain('eq');
            expect(operators).toContain('neq');
            expect(operators).toContain('like');
            expect(operators).toContain('ilike');
            expect(operators).toContain('startsWith');
            expect(operators).toContain('endsWith');
            expect(operators).toContain('in');
            expect(operators).toContain('notIn');
            expect(operators).toContain('isNull');
            expect(operators).toContain('isNotNull');
        });

        it('should have operators for number type', () => {
            const operators = operatorsByType.number;

            expect(operators).toContain('eq');
            expect(operators).toContain('neq');
            expect(operators).toContain('gt');
            expect(operators).toContain('gte');
            expect(operators).toContain('lt');
            expect(operators).toContain('lte');
            expect(operators).toContain('between');
        });

        it('should have limited operators for boolean type', () => {
            const operators = operatorsByType.boolean;

            expect(operators).toContain('eq');
            expect(operators).toContain('neq');
            expect(operators).toContain('isNull');
            expect(operators).toContain('isNotNull');
            expect(operators).not.toContain('like');
            expect(operators).not.toContain('gt');
        });

        it('should have date operators', () => {
            const operators = operatorsByType.date;

            expect(operators).toContain('eq');
            expect(operators).toContain('gt');
            expect(operators).toContain('gte');
            expect(operators).toContain('lt');
            expect(operators).toContain('lte');
            expect(operators).toContain('between');
        });

        it('should have default operators', () => {
            const operators = operatorsByType.default;

            expect(operators).toContain('eq');
            expect(operators).toContain('neq');
            expect(operators).toContain('like');
        });
    });

    describe('operatorLabels', () => {
        it('should have labels for all operators', () => {
            const expectedOperators = [
                'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
                'like', 'ilike', 'startsWith', 'endsWith',
                'in', 'notIn', 'between', 'isNull', 'isNotNull',
                'regex', 'custom'
            ];

            for (const op of expectedOperators) {
                expect(operatorLabels[op as keyof typeof operatorLabels]).toBeDefined();
                expect(typeof operatorLabels[op as keyof typeof operatorLabels]).toBe('string');
            }
        });

        it('should have human-readable labels', () => {
            expect(operatorLabels.eq).toBe('equals');
            expect(operatorLabels.neq).toBe('not equals');
            expect(operatorLabels.gt).toBe('greater than');
            expect(operatorLabels.like).toBe('contains');
            expect(operatorLabels.isNull).toBe('is empty');
        });
    });

    describe('defaultLabels', () => {
        it('should have all required labels', () => {
            expect(defaultLabels.addCondition).toBeDefined();
            expect(defaultLabels.addGroup).toBeDefined();
            expect(defaultLabels.removeCondition).toBeDefined();
            expect(defaultLabels.removeGroup).toBeDefined();
            expect(defaultLabels.field).toBeDefined();
            expect(defaultLabels.operator).toBeDefined();
            expect(defaultLabels.value).toBeDefined();
            expect(defaultLabels.and).toBeDefined();
            expect(defaultLabels.or).toBeDefined();
            expect(defaultLabels.not).toBeDefined();
        });

        it('should have correct default values', () => {
            expect(defaultLabels.and).toBe('AND');
            expect(defaultLabels.or).toBe('OR');
            expect(defaultLabels.not).toBe('NOT');
        });
    });

    describe('FilterCondition type structure', () => {
        it('should allow simple condition', () => {
            const condition: FilterCondition = {
                id: '1',
                field: 'name',
                operator: 'eq',
                value: 'test',
            };

            expect(condition.id).toBe('1');
            expect(condition.field).toBe('name');
            expect(condition.operator).toBe('eq');
            expect(condition.value).toBe('test');
        });

        it('should allow nested group condition', () => {
            const condition: FilterCondition = {
                id: '1',
                logic: 'AND',
                children: [
                    { id: '2', field: 'name', operator: 'eq', value: 'test' },
                    { id: '3', field: 'age', operator: 'gt', value: 18 },
                ],
            };

            expect(condition.logic).toBe('AND');
            expect(condition.children).toHaveLength(2);
        });

        it('should allow deeply nested conditions', () => {
            const condition: FilterCondition = {
                id: '1',
                logic: 'AND',
                children: [
                    {
                        id: '2',
                        logic: 'OR',
                        children: [
                            { id: '3', field: 'status', operator: 'eq', value: 'active' },
                            { id: '4', field: 'status', operator: 'eq', value: 'pending' },
                        ],
                    },
                    { id: '5', field: 'age', operator: 'gte', value: 18 },
                ],
            };

            expect(condition.children![0].logic).toBe('OR');
            expect(condition.children![0].children).toHaveLength(2);
        });

        it('should allow relation conditions', () => {
            const condition: FilterCondition = {
                id: '1',
                field: 'email',
                operator: 'like',
                value: '@test.com',
                relation: 'user',
                relationField: 'email',
            };

            expect(condition.relation).toBe('user');
            expect(condition.relationField).toBe('email');
        });

        it('should allow custom handler conditions', () => {
            const condition: FilterCondition = {
                id: '1',
                field: 'metadata',
                operator: 'custom',
                customHandler: 'jsonSearch',
                customHandlerParams: { path: '$.tags[*]', value: 'important' },
            };

            expect(condition.customHandler).toBe('jsonSearch');
            expect(condition.customHandlerParams).toBeDefined();
        });
    });
});

describe('FilterBuilder Condition Validation', () => {
    it('should detect empty conditions', () => {
        const isEmpty = (c: FilterCondition): boolean => {
            if (c.logic && c.children) {
                return c.children.every(isEmpty);
            }
            return !c.field || !c.operator;
        };

        const emptyCondition: FilterCondition = {
            id: '1',
            field: '',
            operator: 'eq',
            value: '',
        };

        const validCondition: FilterCondition = {
            id: '2',
            field: 'name',
            operator: 'eq',
            value: 'test',
        };

        expect(isEmpty(emptyCondition)).toBe(true);
        expect(isEmpty(validCondition)).toBe(false);
    });

    it('should detect valid group conditions', () => {
        const hasValidChildren = (c: FilterCondition): boolean => {
            if (!c.logic || !c.children) return false;
            return c.children.some((child) => {
                if (child.logic && child.children) {
                    return hasValidChildren(child);
                }
                return child.field && child.operator;
            });
        };

        const validGroup: FilterCondition = {
            id: '1',
            logic: 'AND',
            children: [
                { id: '2', field: 'name', operator: 'eq', value: 'test' },
            ],
        };

        const emptyGroup: FilterCondition = {
            id: '1',
            logic: 'AND',
            children: [
                { id: '2', field: '', operator: 'eq', value: '' },
            ],
        };

        expect(hasValidChildren(validGroup)).toBe(true);
        expect(hasValidChildren(emptyGroup)).toBe(false);
    });

    it('should count condition depth', () => {
        const getDepth = (c: FilterCondition, current = 0): number => {
            if (!c.children) return current;
            return Math.max(
                ...c.children.map((child) => getDepth(child, current + 1))
            );
        };

        const shallow: FilterCondition = {
            id: '1',
            logic: 'AND',
            children: [
                { id: '2', field: 'name', operator: 'eq', value: 'test' },
            ],
        };

        const deep: FilterCondition = {
            id: '1',
            logic: 'AND',
            children: [{
                id: '2',
                logic: 'OR',
                children: [{
                    id: '3',
                    logic: 'AND',
                    children: [
                        { id: '4', field: 'name', operator: 'eq', value: 'test' },
                    ],
                }],
            }],
        };

        expect(getDepth(shallow)).toBe(1);
        expect(getDepth(deep)).toBe(3);
    });
});
