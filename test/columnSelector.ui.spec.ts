/**
 * ColumnSelector UI Component Tests
 *
 * Tests for the React ColumnSelector component and related utilities.
 */

import { describe, it, expect } from 'vitest';
import {
    ColumnConfig,
    FieldDefinition,
    defaultColumnSelectorLabels,
    ItemTypes,
} from '../src/assets/js/components/column-selector/types';

describe('ColumnSelector Types and Utilities', () => {
    describe('ColumnConfig interface', () => {
        it('should create a valid column config', () => {
            const column: ColumnConfig = {
                fieldName: 'name',
                label: 'Name',
                order: 0,
                isVisible: true,
            };

            expect(column.fieldName).toBe('name');
            expect(column.label).toBe('Name');
            expect(column.order).toBe(0);
            expect(column.isVisible).toBe(true);
        });

        it('should support optional properties', () => {
            const column: ColumnConfig = {
                fieldName: 'email',
                label: 'Email Address',
                order: 1,
                width: 200,
                isVisible: true,
                isEditable: true,
                type: 'string',
            };

            expect(column.width).toBe(200);
            expect(column.isEditable).toBe(true);
            expect(column.type).toBe('string');
        });

        it('should allow hidden columns', () => {
            const column: ColumnConfig = {
                fieldName: 'id',
                label: 'ID',
                order: 0,
                isVisible: false,
            };

            expect(column.isVisible).toBe(false);
        });
    });

    describe('FieldDefinition interface', () => {
        it('should create a valid field definition', () => {
            const field: FieldDefinition = {
                name: 'status',
                label: 'Status',
            };

            expect(field.name).toBe('status');
            expect(field.label).toBe('Status');
        });

        it('should support optional type', () => {
            const field: FieldDefinition = {
                name: 'age',
                label: 'Age',
                type: 'number',
            };

            expect(field.type).toBe('number');
        });

        it('should support required flag', () => {
            const field: FieldDefinition = {
                name: 'name',
                label: 'Name',
                required: true,
            };

            expect(field.required).toBe(true);
        });
    });

    describe('defaultColumnSelectorLabels', () => {
        it('should have all required labels', () => {
            expect(defaultColumnSelectorLabels.title).toBeDefined();
            expect(defaultColumnSelectorLabels.availableColumns).toBeDefined();
            expect(defaultColumnSelectorLabels.selectedColumns).toBeDefined();
            expect(defaultColumnSelectorLabels.addColumn).toBeDefined();
            expect(defaultColumnSelectorLabels.removeColumn).toBeDefined();
            expect(defaultColumnSelectorLabels.dragToReorder).toBeDefined();
            expect(defaultColumnSelectorLabels.noColumnsSelected).toBeDefined();
            expect(defaultColumnSelectorLabels.allColumnsAdded).toBeDefined();
            expect(defaultColumnSelectorLabels.visible).toBeDefined();
            expect(defaultColumnSelectorLabels.editable).toBeDefined();
            expect(defaultColumnSelectorLabels.width).toBeDefined();
            expect(defaultColumnSelectorLabels.searchPlaceholder).toBeDefined();
        });

        it('should have correct default values', () => {
            expect(defaultColumnSelectorLabels.title).toBe('Configure Columns');
            expect(defaultColumnSelectorLabels.addColumn).toBe('Add');
            expect(defaultColumnSelectorLabels.removeColumn).toBe('Remove');
        });
    });

    describe('ItemTypes', () => {
        it('should have COLUMN type defined', () => {
            expect(ItemTypes.COLUMN).toBe('column');
        });
    });
});

describe('ColumnSelector Logic', () => {
    describe('Column ordering', () => {
        it('should maintain order when adding columns', () => {
            const columns: ColumnConfig[] = [];

            const addColumn = (fieldName: string, label: string): ColumnConfig => ({
                fieldName,
                label,
                order: columns.length,
                isVisible: true,
            });

            columns.push(addColumn('id', 'ID'));
            columns.push(addColumn('name', 'Name'));
            columns.push(addColumn('email', 'Email'));

            expect(columns[0].order).toBe(0);
            expect(columns[1].order).toBe(1);
            expect(columns[2].order).toBe(2);
        });

        it('should reorder columns correctly when moving', () => {
            const columns: ColumnConfig[] = [
                { fieldName: 'id', label: 'ID', order: 0, isVisible: true },
                { fieldName: 'name', label: 'Name', order: 1, isVisible: true },
                { fieldName: 'email', label: 'Email', order: 2, isVisible: true },
            ];

            // Move email from index 2 to index 0
            const moveColumn = (arr: ColumnConfig[], from: number, to: number): ColumnConfig[] => {
                const result = [...arr];
                const [moved] = result.splice(from, 1);
                result.splice(to, 0, moved);
                return result.map((c, i) => ({ ...c, order: i }));
            };

            const reordered = moveColumn(columns, 2, 0);

            expect(reordered[0].fieldName).toBe('email');
            expect(reordered[0].order).toBe(0);
            expect(reordered[1].fieldName).toBe('id');
            expect(reordered[1].order).toBe(1);
            expect(reordered[2].fieldName).toBe('name');
            expect(reordered[2].order).toBe(2);
        });

        it('should update order after removing a column', () => {
            const columns: ColumnConfig[] = [
                { fieldName: 'id', label: 'ID', order: 0, isVisible: true },
                { fieldName: 'name', label: 'Name', order: 1, isVisible: true },
                { fieldName: 'email', label: 'Email', order: 2, isVisible: true },
            ];

            // Remove 'name' at index 1
            const removeColumn = (arr: ColumnConfig[], index: number): ColumnConfig[] => {
                return arr
                    .filter((_, i) => i !== index)
                    .map((c, i) => ({ ...c, order: i }));
            };

            const result = removeColumn(columns, 1);

            expect(result.length).toBe(2);
            expect(result[0].fieldName).toBe('id');
            expect(result[0].order).toBe(0);
            expect(result[1].fieldName).toBe('email');
            expect(result[1].order).toBe(1);
        });
    });

    describe('Available fields filtering', () => {
        it('should filter out already selected fields', () => {
            const availableFields: FieldDefinition[] = [
                { name: 'id', label: 'ID' },
                { name: 'name', label: 'Name' },
                { name: 'email', label: 'Email' },
                { name: 'phone', label: 'Phone' },
            ];

            const selectedColumns: ColumnConfig[] = [
                { fieldName: 'id', label: 'ID', order: 0, isVisible: true },
                { fieldName: 'email', label: 'Email', order: 1, isVisible: true },
            ];

            const getAvailable = (fields: FieldDefinition[], columns: ColumnConfig[]): FieldDefinition[] => {
                const selectedNames = new Set(columns.map(c => c.fieldName));
                return fields.filter(f => !selectedNames.has(f.name));
            };

            const available = getAvailable(availableFields, selectedColumns);

            expect(available.length).toBe(2);
            expect(available.map(f => f.name)).toEqual(['name', 'phone']);
        });

        it('should filter fields by search term', () => {
            const fields: FieldDefinition[] = [
                { name: 'id', label: 'ID' },
                { name: 'firstName', label: 'First Name' },
                { name: 'lastName', label: 'Last Name' },
                { name: 'email', label: 'Email Address' },
            ];

            const filterBySearch = (fields: FieldDefinition[], term: string): FieldDefinition[] => {
                if (!term) return fields;
                const lowerTerm = term.toLowerCase();
                return fields.filter(
                    f => f.name.toLowerCase().includes(lowerTerm) ||
                        f.label.toLowerCase().includes(lowerTerm)
                );
            };

            expect(filterBySearch(fields, 'name').length).toBe(2);
            expect(filterBySearch(fields, 'email').length).toBe(1);
            expect(filterBySearch(fields, 'id').length).toBe(1);
            expect(filterBySearch(fields, 'xyz').length).toBe(0);
            expect(filterBySearch(fields, '').length).toBe(4);
        });
    });

    describe('Column visibility', () => {
        it('should toggle visibility', () => {
            const column: ColumnConfig = {
                fieldName: 'name',
                label: 'Name',
                order: 0,
                isVisible: true,
            };

            const toggled: ColumnConfig = { ...column, isVisible: !column.isVisible };

            expect(toggled.isVisible).toBe(false);
        });

        it('should filter visible columns', () => {
            const columns: ColumnConfig[] = [
                { fieldName: 'id', label: 'ID', order: 0, isVisible: false },
                { fieldName: 'name', label: 'Name', order: 1, isVisible: true },
                { fieldName: 'email', label: 'Email', order: 2, isVisible: true },
                { fieldName: 'phone', label: 'Phone', order: 3, isVisible: false },
            ];

            const visibleColumns = columns.filter(c => c.isVisible);

            expect(visibleColumns.length).toBe(2);
            expect(visibleColumns.map(c => c.fieldName)).toEqual(['name', 'email']);
        });
    });

    describe('Column editability', () => {
        it('should toggle editable status', () => {
            const column: ColumnConfig = {
                fieldName: 'name',
                label: 'Name',
                order: 0,
                isVisible: true,
                isEditable: false,
            };

            const toggled: ColumnConfig = { ...column, isEditable: !column.isEditable };

            expect(toggled.isEditable).toBe(true);
        });

        it('should get editable columns', () => {
            const columns: ColumnConfig[] = [
                { fieldName: 'id', label: 'ID', order: 0, isVisible: true, isEditable: false },
                { fieldName: 'name', label: 'Name', order: 1, isVisible: true, isEditable: true },
                { fieldName: 'status', label: 'Status', order: 2, isVisible: true, isEditable: true },
            ];

            const editableColumns = columns.filter(c => c.isEditable);

            expect(editableColumns.length).toBe(2);
            expect(editableColumns.map(c => c.fieldName)).toEqual(['name', 'status']);
        });
    });

    describe('Changes detection', () => {
        it('should detect when columns changed', () => {
            const initial: ColumnConfig[] = [
                { fieldName: 'id', label: 'ID', order: 0, isVisible: true },
                { fieldName: 'name', label: 'Name', order: 1, isVisible: true },
            ];

            const hasChanges = (current: ColumnConfig[], initial: ColumnConfig[]): boolean => {
                if (current.length !== initial.length) return true;
                return current.some((c, i) => {
                    const init = initial[i];
                    return (
                        c.fieldName !== init?.fieldName ||
                        c.order !== init?.order ||
                        c.isVisible !== init?.isVisible ||
                        c.isEditable !== init?.isEditable ||
                        c.width !== init?.width
                    );
                });
            };

            // Same
            expect(hasChanges(initial, initial)).toBe(false);

            // Length changed
            expect(hasChanges([initial[0]], initial)).toBe(true);

            // Order changed
            const reordered = [initial[1], initial[0]].map((c, i) => ({ ...c, order: i }));
            expect(hasChanges(reordered, initial)).toBe(true);

            // Visibility changed
            const hidden = initial.map((c, i) => i === 0 ? { ...c, isVisible: false } : c);
            expect(hasChanges(hidden, initial)).toBe(true);
        });
    });

    describe('Max columns limit', () => {
        it('should respect max columns limit', () => {
            const maxColumns = 3;
            const columns: ColumnConfig[] = [
                { fieldName: 'id', label: 'ID', order: 0, isVisible: true },
                { fieldName: 'name', label: 'Name', order: 1, isVisible: true },
            ];

            const canAddMore = columns.length < maxColumns;
            expect(canAddMore).toBe(true);

            // Add one more
            columns.push({ fieldName: 'email', label: 'Email', order: 2, isVisible: true });

            const canAddEvenMore = columns.length < maxColumns;
            expect(canAddEvenMore).toBe(false);
        });
    });
});
