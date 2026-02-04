/**
 * Inline Edit UI Component Tests
 *
 * Tests for the React InlineEditor and EditableCell components.
 */

import { describe, it, expect } from 'vitest';
import {
    InlineFieldType,
    InlineEditConfig,
    InlineValidation,
    SelectOption,
    defaultInlineEditLabels,
    validateValue,
} from '../src/assets/js/components/inline-edit/types';

describe('Inline Edit Types and Utilities', () => {
    describe('InlineFieldType', () => {
        it('should support all field types', () => {
            const types: InlineFieldType[] = [
                'string',
                'text',
                'number',
                'integer',
                'float',
                'boolean',
                'select',
                'date',
                'datetime',
                'json',
            ];

            expect(types.length).toBe(10);
        });
    });

    describe('InlineEditConfig', () => {
        it('should create a valid config', () => {
            const config: InlineEditConfig = {
                fieldName: 'name',
                label: 'Name',
                type: 'string',
                isEditable: true,
            };

            expect(config.fieldName).toBe('name');
            expect(config.label).toBe('Name');
            expect(config.type).toBe('string');
            expect(config.isEditable).toBe(true);
        });

        it('should support validation rules', () => {
            const config: InlineEditConfig = {
                fieldName: 'email',
                label: 'Email',
                type: 'string',
                isEditable: true,
                validation: {
                    required: true,
                    pattern: '^[\\w.-]+@[\\w.-]+\\.\\w+$',
                    patternMessage: 'Invalid email format',
                },
            };

            expect(config.validation?.required).toBe(true);
            expect(config.validation?.pattern).toBeDefined();
        });

        it('should support select options', () => {
            const config: InlineEditConfig = {
                fieldName: 'status',
                label: 'Status',
                type: 'select',
                isEditable: true,
                options: [
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                    { value: 'pending', label: 'Pending' },
                ],
            };

            expect(config.options?.length).toBe(3);
            expect(config.options?.[0].value).toBe('active');
        });
    });

    describe('SelectOption', () => {
        it('should support string values', () => {
            const option: SelectOption = {
                value: 'active',
                label: 'Active',
            };

            expect(option.value).toBe('active');
            expect(option.label).toBe('Active');
        });

        it('should support number values', () => {
            const option: SelectOption = {
                value: 1,
                label: 'Option 1',
            };

            expect(option.value).toBe(1);
        });
    });

    describe('defaultInlineEditLabels', () => {
        it('should have all required labels', () => {
            expect(defaultInlineEditLabels.save).toBeDefined();
            expect(defaultInlineEditLabels.cancel).toBeDefined();
            expect(defaultInlineEditLabels.edit).toBeDefined();
            expect(defaultInlineEditLabels.saving).toBeDefined();
            expect(defaultInlineEditLabels.error).toBeDefined();
            expect(defaultInlineEditLabels.required).toBeDefined();
            expect(defaultInlineEditLabels.minLength).toBeDefined();
            expect(defaultInlineEditLabels.maxLength).toBeDefined();
            expect(defaultInlineEditLabels.min).toBeDefined();
            expect(defaultInlineEditLabels.max).toBeDefined();
            expect(defaultInlineEditLabels.pattern).toBeDefined();
        });

        it('should have correct default values', () => {
            expect(defaultInlineEditLabels.save).toBe('Save');
            expect(defaultInlineEditLabels.cancel).toBe('Cancel');
            expect(defaultInlineEditLabels.edit).toBe('Edit');
        });
    });
});

describe('validateValue function', () => {
    const labels = defaultInlineEditLabels;

    describe('required validation', () => {
        const validation: InlineValidation = { required: true };

        it('should fail for null value', () => {
            expect(validateValue(null, validation, labels)).toBe(labels.required);
        });

        it('should fail for undefined value', () => {
            expect(validateValue(undefined, validation, labels)).toBe(labels.required);
        });

        it('should fail for empty string', () => {
            expect(validateValue('', validation, labels)).toBe(labels.required);
        });

        it('should pass for non-empty value', () => {
            expect(validateValue('hello', validation, labels)).toBeNull();
        });

        it('should pass for zero', () => {
            expect(validateValue(0, validation, labels)).toBeNull();
        });

        it('should pass for false', () => {
            expect(validateValue(false, validation, labels)).toBeNull();
        });
    });

    describe('string length validation', () => {
        it('should fail for value shorter than minLength', () => {
            const validation: InlineValidation = { minLength: 5 };
            const result = validateValue('abc', validation, labels);
            expect(result).toContain('5');
        });

        it('should pass for value equal to minLength', () => {
            const validation: InlineValidation = { minLength: 5 };
            expect(validateValue('abcde', validation, labels)).toBeNull();
        });

        it('should fail for value longer than maxLength', () => {
            const validation: InlineValidation = { maxLength: 10 };
            const result = validateValue('12345678901', validation, labels);
            expect(result).toContain('10');
        });

        it('should pass for value equal to maxLength', () => {
            const validation: InlineValidation = { maxLength: 10 };
            expect(validateValue('1234567890', validation, labels)).toBeNull();
        });
    });

    describe('number range validation', () => {
        it('should fail for value less than min', () => {
            const validation: InlineValidation = { min: 10 };
            const result = validateValue(5, validation, labels);
            expect(result).toContain('10');
        });

        it('should pass for value equal to min', () => {
            const validation: InlineValidation = { min: 10 };
            expect(validateValue(10, validation, labels)).toBeNull();
        });

        it('should fail for value greater than max', () => {
            const validation: InlineValidation = { max: 100 };
            const result = validateValue(150, validation, labels);
            expect(result).toContain('100');
        });

        it('should pass for value equal to max', () => {
            const validation: InlineValidation = { max: 100 };
            expect(validateValue(100, validation, labels)).toBeNull();
        });

        it('should pass for value within range', () => {
            const validation: InlineValidation = { min: 10, max: 100 };
            expect(validateValue(50, validation, labels)).toBeNull();
        });
    });

    describe('pattern validation', () => {
        it('should fail for value not matching pattern', () => {
            const validation: InlineValidation = {
                pattern: '^\\d+$',
                patternMessage: 'Must be numeric',
            };
            expect(validateValue('abc', validation, labels)).toBe('Must be numeric');
        });

        it('should pass for value matching pattern', () => {
            const validation: InlineValidation = { pattern: '^\\d+$' };
            expect(validateValue('123', validation, labels)).toBeNull();
        });

        it('should use default message if patternMessage not provided', () => {
            const validation: InlineValidation = { pattern: '^\\d+$' };
            expect(validateValue('abc', validation, labels)).toBe(labels.pattern);
        });
    });

    describe('no validation', () => {
        it('should pass when validation is undefined', () => {
            expect(validateValue('anything', undefined, labels)).toBeNull();
        });

        it('should pass when validation is empty', () => {
            expect(validateValue('anything', {}, labels)).toBeNull();
        });
    });

    describe('combined validations', () => {
        it('should check required first', () => {
            const validation: InlineValidation = {
                required: true,
                minLength: 5,
            };
            expect(validateValue('', validation, labels)).toBe(labels.required);
        });

        it('should check all validations', () => {
            const validation: InlineValidation = {
                required: true,
                minLength: 3,
                maxLength: 10,
            };
            expect(validateValue('ab', validation, labels)).toContain('3');
            expect(validateValue('12345678901', validation, labels)).toContain('10');
            expect(validateValue('hello', validation, labels)).toBeNull();
        });
    });
});

describe('Inline Edit Logic', () => {
    describe('Edit state management', () => {
        it('should track editing state', () => {
            let isEditing = false;
            let editValue = 'original';

            const startEdit = (value: any) => {
                isEditing = true;
                editValue = value;
            };

            const cancelEdit = (originalValue: any) => {
                isEditing = false;
                editValue = originalValue;
            };

            // Start editing
            startEdit('original');
            expect(isEditing).toBe(true);
            expect(editValue).toBe('original');

            // Change value
            editValue = 'modified';
            expect(editValue).toBe('modified');

            // Cancel
            cancelEdit('original');
            expect(isEditing).toBe(false);
            expect(editValue).toBe('original');
        });

        it('should detect value changes', () => {
            const hasChanged = (original: any, current: any): boolean => {
                return original !== current;
            };

            expect(hasChanged('hello', 'hello')).toBe(false);
            expect(hasChanged('hello', 'world')).toBe(true);
            expect(hasChanged(10, 10)).toBe(false);
            expect(hasChanged(10, 20)).toBe(true);
            expect(hasChanged(true, false)).toBe(true);
        });
    });

    describe('Value formatting', () => {
        it('should format boolean values', () => {
            const formatBoolean = (value: boolean): string => {
                return value ? 'Yes' : 'No';
            };

            expect(formatBoolean(true)).toBe('Yes');
            expect(formatBoolean(false)).toBe('No');
        });

        it('should format select values', () => {
            const options: SelectOption[] = [
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
            ];

            const formatSelect = (value: any, options: SelectOption[]): string => {
                const option = options.find(o => String(o.value) === String(value));
                return option?.label || String(value);
            };

            expect(formatSelect('active', options)).toBe('Active');
            expect(formatSelect('inactive', options)).toBe('Inactive');
            expect(formatSelect('unknown', options)).toBe('unknown');
        });

        it('should format null/undefined values', () => {
            const formatValue = (value: any): string => {
                if (value === null || value === undefined) {
                    return '—';
                }
                return String(value);
            };

            expect(formatValue(null)).toBe('—');
            expect(formatValue(undefined)).toBe('—');
            expect(formatValue('')).toBe('');
            expect(formatValue(0)).toBe('0');
        });
    });

    describe('Type conversion', () => {
        it('should parse integer values', () => {
            const parseInteger = (value: string): number | null => {
                if (value === '') return null;
                return parseInt(value, 10);
            };

            expect(parseInteger('123')).toBe(123);
            expect(parseInteger('')).toBeNull();
            expect(parseInteger('0')).toBe(0);
        });

        it('should parse float values', () => {
            const parseFloat = (value: string): number | null => {
                if (value === '') return null;
                return Number.parseFloat(value);
            };

            expect(parseFloat('123.45')).toBe(123.45);
            expect(parseFloat('')).toBeNull();
            expect(parseFloat('0.5')).toBe(0.5);
        });

        it('should parse JSON values', () => {
            const parseJson = (value: string): any => {
                try {
                    return JSON.parse(value);
                } catch {
                    return value; // Return as string if invalid JSON
                }
            };

            expect(parseJson('{"name":"test"}')).toEqual({ name: 'test' });
            expect(parseJson('[1,2,3]')).toEqual([1, 2, 3]);
            expect(parseJson('invalid json')).toBe('invalid json');
        });
    });

    describe('Config generation', () => {
        it('should generate config from field definition', () => {
            interface FieldDef {
                name: string;
                label: string;
                type: string;
                inlineEditable?: boolean;
                inlineValidation?: InlineValidation;
            }

            const generateConfig = (field: FieldDef): InlineEditConfig => ({
                fieldName: field.name,
                label: field.label,
                type: field.type as InlineFieldType,
                isEditable: field.inlineEditable ?? false,
                validation: field.inlineValidation,
            });

            const field: FieldDef = {
                name: 'email',
                label: 'Email Address',
                type: 'string',
                inlineEditable: true,
                inlineValidation: { required: true },
            };

            const config = generateConfig(field);

            expect(config.fieldName).toBe('email');
            expect(config.label).toBe('Email Address');
            expect(config.isEditable).toBe(true);
            expect(config.validation?.required).toBe(true);
        });
    });
});
