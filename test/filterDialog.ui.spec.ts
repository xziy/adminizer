/**
 * FilterDialog UI Component Tests
 *
 * Tests for the React FilterDialog component and related utilities.
 */

import { describe, it, expect } from 'vitest';
import {
    generateSlug,
    defaultFilterDialogLabels,
    FilterDialogFilter,
    FilterVisibility,
} from '../src/assets/js/components/filter-dialog/types';

describe('FilterDialog Types and Utilities', () => {
    describe('generateSlug', () => {
        it('should convert name to lowercase', () => {
            const slug = generateSlug('My Filter Name');
            expect(slug).toBe('my-filter-name');
        });

        it('should replace spaces with hyphens', () => {
            const slug = generateSlug('filter with spaces');
            expect(slug).toBe('filter-with-spaces');
        });

        it('should remove special characters', () => {
            const slug = generateSlug('Filter!@#$%Name');
            expect(slug).toBe('filtername');
        });

        it('should handle multiple consecutive spaces', () => {
            const slug = generateSlug('filter   with   spaces');
            expect(slug).toBe('filter-with-spaces');
        });

        it('should handle multiple consecutive hyphens', () => {
            const slug = generateSlug('filter---name');
            expect(slug).toBe('filter-name');
        });

        it('should truncate to 50 characters', () => {
            const longName = 'This is a very long filter name that should be truncated to fifty characters maximum';
            const slug = generateSlug(longName);
            expect(slug.length).toBeLessThanOrEqual(50);
        });

        it('should handle empty string', () => {
            const slug = generateSlug('');
            expect(slug).toBe('');
        });

        it('should handle string with only special characters', () => {
            const slug = generateSlug('!@#$%^&*()');
            expect(slug).toBe('');
        });

        it('should preserve numbers', () => {
            const slug = generateSlug('Filter 123');
            expect(slug).toBe('filter-123');
        });

        it('should handle unicode characters', () => {
            const slug = generateSlug('Фильтр');
            expect(slug).toBe('');
        });

        it('should handle mixed content', () => {
            const slug = generateSlug('Orders - Pending (2024)');
            expect(slug).toBe('orders-pending-2024');
        });
    });

    describe('defaultFilterDialogLabels', () => {
        it('should have all required labels', () => {
            expect(defaultFilterDialogLabels.title).toBeDefined();
            expect(defaultFilterDialogLabels.titleEdit).toBeDefined();
            expect(defaultFilterDialogLabels.tabConditions).toBeDefined();
            expect(defaultFilterDialogLabels.tabColumns).toBeDefined();
            expect(defaultFilterDialogLabels.tabSettings).toBeDefined();
        });

        it('should have form labels', () => {
            expect(defaultFilterDialogLabels.nameLabel).toBeDefined();
            expect(defaultFilterDialogLabels.namePlaceholder).toBeDefined();
            expect(defaultFilterDialogLabels.descriptionLabel).toBeDefined();
            expect(defaultFilterDialogLabels.descriptionPlaceholder).toBeDefined();
        });

        it('should have visibility labels', () => {
            expect(defaultFilterDialogLabels.visibilityLabel).toBeDefined();
            expect(defaultFilterDialogLabels.visibilityPrivate).toBeDefined();
            expect(defaultFilterDialogLabels.visibilityPublic).toBeDefined();
            expect(defaultFilterDialogLabels.visibilityGroups).toBeDefined();
            expect(defaultFilterDialogLabels.visibilitySystem).toBeDefined();
        });

        it('should have action labels', () => {
            expect(defaultFilterDialogLabels.save).toBeDefined();
            expect(defaultFilterDialogLabels.cancel).toBeDefined();
            expect(defaultFilterDialogLabels.preview).toBeDefined();
        });

        it('should have sort labels', () => {
            expect(defaultFilterDialogLabels.sortLabel).toBeDefined();
            expect(defaultFilterDialogLabels.sortFieldLabel).toBeDefined();
            expect(defaultFilterDialogLabels.sortDirectionLabel).toBeDefined();
            expect(defaultFilterDialogLabels.sortAsc).toBeDefined();
            expect(defaultFilterDialogLabels.sortDesc).toBeDefined();
            expect(defaultFilterDialogLabels.noSort).toBeDefined();
        });

        it('should have API labels', () => {
            expect(defaultFilterDialogLabels.apiEnabledLabel).toBeDefined();
            expect(defaultFilterDialogLabels.apiEnabledHelp).toBeDefined();
            expect(defaultFilterDialogLabels.apiKeyLabel).toBeDefined();
        });

        it('should have pin labels', () => {
            expect(defaultFilterDialogLabels.pinnedLabel).toBeDefined();
            expect(defaultFilterDialogLabels.pinnedHelp).toBeDefined();
        });

        it('should have slug labels', () => {
            expect(defaultFilterDialogLabels.slugLabel).toBeDefined();
            expect(defaultFilterDialogLabels.slugPlaceholder).toBeDefined();
            expect(defaultFilterDialogLabels.slugHelp).toBeDefined();
        });

        it('should have error messages', () => {
            expect(defaultFilterDialogLabels.nameRequired).toBeDefined();
        });
    });

    describe('FilterDialogFilter interface', () => {
        it('should accept valid filter data', () => {
            const filter: FilterDialogFilter = {
                name: 'Test Filter',
                modelName: 'Order',
                conditions: [],
                visibility: 'private',
            };

            expect(filter.name).toBe('Test Filter');
            expect(filter.modelName).toBe('Order');
            expect(filter.visibility).toBe('private');
        });

        it('should accept filter with all optional fields', () => {
            const filter: FilterDialogFilter = {
                id: 'filter-123',
                name: 'Test Filter',
                description: 'A test filter description',
                modelName: 'Order',
                conditions: [
                    { id: 'c1', field: 'status', operator: 'eq', value: 'pending' },
                ],
                columns: [
                    { fieldName: 'id', label: 'ID', order: 0, isVisible: true },
                ],
                visibility: 'groups',
                sharedGroups: ['admin', 'sales'],
                slug: 'test-filter',
                isPinned: true,
                isSystemFilter: false,
                apiEnabled: true,
                apiKey: 'api-key-123',
                sort: { field: 'createdAt', direction: 'DESC' },
            };

            expect(filter.id).toBe('filter-123');
            expect(filter.description).toBe('A test filter description');
            expect(filter.columns).toHaveLength(1);
            expect(filter.sharedGroups).toContain('admin');
            expect(filter.slug).toBe('test-filter');
            expect(filter.isPinned).toBe(true);
            expect(filter.apiEnabled).toBe(true);
            expect(filter.sort?.field).toBe('createdAt');
        });

        it('should accept all visibility types', () => {
            const visibilities: FilterVisibility[] = ['private', 'public', 'groups', 'system'];

            for (const visibility of visibilities) {
                const filter: FilterDialogFilter = {
                    name: 'Test',
                    modelName: 'Order',
                    conditions: [],
                    visibility,
                };
                expect(filter.visibility).toBe(visibility);
            }
        });
    });

    describe('Filter conditions structure', () => {
        it('should support simple conditions', () => {
            const filter: FilterDialogFilter = {
                name: 'Simple Filter',
                modelName: 'Order',
                conditions: [
                    { id: '1', field: 'status', operator: 'eq', value: 'pending' },
                    { id: '2', field: 'total', operator: 'gte', value: 100 },
                ],
                visibility: 'private',
            };

            expect(filter.conditions).toHaveLength(2);
            expect(filter.conditions[0].field).toBe('status');
            expect(filter.conditions[1].operator).toBe('gte');
        });

        it('should support nested condition groups', () => {
            const filter: FilterDialogFilter = {
                name: 'Complex Filter',
                modelName: 'Order',
                conditions: [
                    {
                        id: 'root',
                        logic: 'AND',
                        children: [
                            { id: '1', field: 'status', operator: 'eq', value: 'pending' },
                            {
                                id: 'or-group',
                                logic: 'OR',
                                children: [
                                    { id: '2', field: 'total', operator: 'gte', value: 1000 },
                                    { id: '3', field: 'priority', operator: 'eq', value: 'high' },
                                ],
                            },
                        ],
                    },
                ],
                visibility: 'private',
            };

            expect(filter.conditions[0].logic).toBe('AND');
            expect(filter.conditions[0].children).toHaveLength(2);
            expect(filter.conditions[0].children![1].logic).toBe('OR');
        });

        it('should support relation conditions', () => {
            const filter: FilterDialogFilter = {
                name: 'Relation Filter',
                modelName: 'Order',
                conditions: [
                    {
                        id: '1',
                        field: 'name',
                        operator: 'like',
                        value: 'John',
                        relation: 'customer',
                        relationField: 'name',
                    },
                ],
                visibility: 'private',
            };

            expect(filter.conditions[0].relation).toBe('customer');
            expect(filter.conditions[0].relationField).toBe('name');
        });
    });

    describe('Column configuration structure', () => {
        it('should support column configuration', () => {
            const filter: FilterDialogFilter = {
                name: 'Column Test',
                modelName: 'Order',
                conditions: [],
                visibility: 'private',
                columns: [
                    { fieldName: 'id', label: 'ID', order: 0, isVisible: true },
                    { fieldName: 'customer', label: 'Customer', order: 1, isVisible: true, width: 200 },
                    { fieldName: 'total', label: 'Total', order: 2, isVisible: true, isEditable: true },
                    { fieldName: 'notes', label: 'Notes', order: 3, isVisible: false },
                ],
            };

            expect(filter.columns).toHaveLength(4);
            expect(filter.columns![0].fieldName).toBe('id');
            expect(filter.columns![1].width).toBe(200);
            expect(filter.columns![2].isEditable).toBe(true);
            expect(filter.columns![3].isVisible).toBe(false);
        });

        it('should support empty columns array', () => {
            const filter: FilterDialogFilter = {
                name: 'No Columns',
                modelName: 'Order',
                conditions: [],
                visibility: 'private',
                columns: [],
            };

            expect(filter.columns).toHaveLength(0);
        });

        it('should allow undefined columns', () => {
            const filter: FilterDialogFilter = {
                name: 'Default Columns',
                modelName: 'Order',
                conditions: [],
                visibility: 'private',
            };

            expect(filter.columns).toBeUndefined();
        });
    });

    describe('Sort configuration', () => {
        it('should support ascending sort', () => {
            const filter: FilterDialogFilter = {
                name: 'Sorted Filter',
                modelName: 'Order',
                conditions: [],
                visibility: 'private',
                sort: { field: 'createdAt', direction: 'ASC' },
            };

            expect(filter.sort?.field).toBe('createdAt');
            expect(filter.sort?.direction).toBe('ASC');
        });

        it('should support descending sort', () => {
            const filter: FilterDialogFilter = {
                name: 'Sorted Filter',
                modelName: 'Order',
                conditions: [],
                visibility: 'private',
                sort: { field: 'total', direction: 'DESC' },
            };

            expect(filter.sort?.direction).toBe('DESC');
        });

        it('should allow undefined sort', () => {
            const filter: FilterDialogFilter = {
                name: 'Unsorted Filter',
                modelName: 'Order',
                conditions: [],
                visibility: 'private',
            };

            expect(filter.sort).toBeUndefined();
        });
    });

    describe('API access configuration', () => {
        it('should support API enabled filter', () => {
            const filter: FilterDialogFilter = {
                name: 'API Filter',
                modelName: 'Order',
                conditions: [],
                visibility: 'public',
                apiEnabled: true,
                apiKey: 'abc-123-xyz',
            };

            expect(filter.apiEnabled).toBe(true);
            expect(filter.apiKey).toBe('abc-123-xyz');
        });

        it('should support API disabled filter', () => {
            const filter: FilterDialogFilter = {
                name: 'Private Filter',
                modelName: 'Order',
                conditions: [],
                visibility: 'private',
                apiEnabled: false,
            };

            expect(filter.apiEnabled).toBe(false);
            expect(filter.apiKey).toBeUndefined();
        });
    });

    describe('Group sharing', () => {
        it('should support sharing with multiple groups', () => {
            const filter: FilterDialogFilter = {
                name: 'Group Filter',
                modelName: 'Order',
                conditions: [],
                visibility: 'groups',
                sharedGroups: ['admin', 'sales', 'support'],
            };

            expect(filter.sharedGroups).toHaveLength(3);
            expect(filter.sharedGroups).toContain('admin');
            expect(filter.sharedGroups).toContain('sales');
            expect(filter.sharedGroups).toContain('support');
        });

        it('should support sharing with single group', () => {
            const filter: FilterDialogFilter = {
                name: 'Single Group Filter',
                modelName: 'Order',
                conditions: [],
                visibility: 'groups',
                sharedGroups: ['admin'],
            };

            expect(filter.sharedGroups).toHaveLength(1);
        });

        it('should support empty groups for non-group visibility', () => {
            const filter: FilterDialogFilter = {
                name: 'Public Filter',
                modelName: 'Order',
                conditions: [],
                visibility: 'public',
            };

            expect(filter.sharedGroups).toBeUndefined();
        });
    });

    describe('System filter support', () => {
        it('should support system filter flag', () => {
            const filter: FilterDialogFilter = {
                name: 'System Filter',
                modelName: 'Order',
                conditions: [],
                visibility: 'system',
                isSystemFilter: true,
            };

            expect(filter.isSystemFilter).toBe(true);
        });

        it('should default isSystemFilter to undefined', () => {
            const filter: FilterDialogFilter = {
                name: 'User Filter',
                modelName: 'Order',
                conditions: [],
                visibility: 'private',
            };

            expect(filter.isSystemFilter).toBeUndefined();
        });
    });

    describe('Pinned filter support', () => {
        it('should support pinned filter', () => {
            const filter: FilterDialogFilter = {
                name: 'Pinned Filter',
                modelName: 'Order',
                conditions: [],
                visibility: 'private',
                isPinned: true,
            };

            expect(filter.isPinned).toBe(true);
        });

        it('should support unpinned filter', () => {
            const filter: FilterDialogFilter = {
                name: 'Regular Filter',
                modelName: 'Order',
                conditions: [],
                visibility: 'private',
                isPinned: false,
            };

            expect(filter.isPinned).toBe(false);
        });
    });

    describe('Slug validation patterns', () => {
        it('should generate valid slugs from common names', () => {
            const testCases = [
                { input: 'Pending Orders', expected: 'pending-orders' },
                { input: 'High Value Customers', expected: 'high-value-customers' },
                { input: 'Q1 2024 Report', expected: 'q1-2024-report' },
                { input: 'active-users', expected: 'active-users' },
                { input: '  Trimmed  ', expected: 'trimmed' },
            ];

            for (const { input, expected } of testCases) {
                expect(generateSlug(input)).toBe(expected);
            }
        });

        it('should handle edge cases', () => {
            expect(generateSlug('   ')).toBe('');
            expect(generateSlug('___')).toBe('');
            expect(generateSlug('---')).toBe('');
            expect(generateSlug('a')).toBe('a');
            expect(generateSlug('123')).toBe('123');
        });
    });
});

describe('FilterDialog Component Behavior (Unit)', () => {
    describe('Initial state', () => {
        it('should define correct default labels', () => {
            expect(defaultFilterDialogLabels.title).toBe('Create Filter');
            expect(defaultFilterDialogLabels.titleEdit).toBe('Edit Filter');
            expect(defaultFilterDialogLabels.save).toBe('Save Filter');
        });
    });

    describe('Tab structure', () => {
        it('should have three tabs defined in labels', () => {
            expect(defaultFilterDialogLabels.tabConditions).toBe('Conditions');
            expect(defaultFilterDialogLabels.tabColumns).toBe('Columns');
            expect(defaultFilterDialogLabels.tabSettings).toBe('Settings');
        });
    });

    describe('Validation rules', () => {
        it('should have name required message', () => {
            expect(defaultFilterDialogLabels.nameRequired).toBe('Filter name is required');
        });
    });
});
