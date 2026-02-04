/**
 * Inline Edit Types
 */

export type InlineFieldType =
    | 'string'
    | 'text'
    | 'number'
    | 'integer'
    | 'float'
    | 'boolean'
    | 'select'
    | 'date'
    | 'datetime'
    | 'json';

export interface InlineEditConfig {
    fieldName: string;
    label: string;
    type: InlineFieldType;
    isEditable: boolean;
    validation?: InlineValidation;
    options?: SelectOption[];
}

export interface InlineValidation {
    required?: boolean;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    patternMessage?: string;
}

export interface SelectOption {
    value: string | number;
    label: string;
}

export interface InlineEditorProps {
    value: any;
    type: InlineFieldType;
    onChange: (value: any) => void;
    onSave: () => void;
    onCancel: () => void;
    validation?: InlineValidation;
    options?: SelectOption[];
    disabled?: boolean;
    autoFocus?: boolean;
    labels?: Partial<InlineEditLabels>;
}

export interface EditableCellProps {
    value: any;
    fieldName: string;
    recordId: string | number;
    config: InlineEditConfig;
    onSave: (fieldName: string, value: any) => Promise<void>;
    labels?: Partial<InlineEditLabels>;
}

export interface InlineEditLabels {
    save: string;
    cancel: string;
    edit: string;
    saving: string;
    error: string;
    required: string;
    minLength: string;
    maxLength: string;
    min: string;
    max: string;
    pattern: string;
}

export const defaultInlineEditLabels: InlineEditLabels = {
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    saving: 'Saving...',
    error: 'Error saving',
    required: 'This field is required',
    minLength: 'Minimum length is {min}',
    maxLength: 'Maximum length is {max}',
    min: 'Minimum value is {min}',
    max: 'Maximum value is {max}',
    pattern: 'Invalid format',
};

export interface ValidationError {
    field: string;
    message: string;
}

export function validateValue(
    value: any,
    validation: InlineValidation | undefined,
    labels: InlineEditLabels
): string | null {
    if (!validation) return null;

    // Required check
    if (validation.required && (value === null || value === undefined || value === '')) {
        return labels.required;
    }

    // String validations
    if (typeof value === 'string') {
        if (validation.minLength && value.length < validation.minLength) {
            return labels.minLength.replace('{min}', String(validation.minLength));
        }
        if (validation.maxLength && value.length > validation.maxLength) {
            return labels.maxLength.replace('{max}', String(validation.maxLength));
        }
        if (validation.pattern) {
            const regex = new RegExp(validation.pattern);
            if (!regex.test(value)) {
                return validation.patternMessage || labels.pattern;
            }
        }
    }

    // Number validations
    if (typeof value === 'number') {
        if (validation.min !== undefined && value < validation.min) {
            return labels.min.replace('{min}', String(validation.min));
        }
        if (validation.max !== undefined && value > validation.max) {
            return labels.max.replace('{max}', String(validation.max));
        }
    }

    return null;
}
