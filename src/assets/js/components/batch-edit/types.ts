/**
 * Batch Edit Types
 *
 * Types and utilities for batch editing multiple records
 */

import { InlineEditConfig, InlineFieldType, InlineValidation, SelectOption } from '../inline-edit/types';

export interface BatchEditProps {
    /** Selected record IDs */
    selectedIds: (string | number)[];
    /** Model name */
    modelName: string;
    /** Available fields for editing */
    fields: InlineEditConfig[];
    /** Called when batch edit is submitted */
    onSubmit: (fieldName: string, value: any) => Promise<BatchEditResult>;
    /** Called when dialog is closed */
    onClose: () => void;
    /** Whether dialog is open */
    open: boolean;
    /** Custom labels */
    labels?: Partial<BatchEditLabels>;
}

export interface BatchEditResult {
    success: boolean;
    updatedCount: number;
    errors?: BatchEditError[];
}

export interface BatchEditError {
    recordId: string | number;
    message: string;
}

export interface BatchEditLabels {
    title: string;
    selectField: string;
    selectFieldPlaceholder: string;
    newValue: string;
    selectedRecords: string;
    apply: string;
    cancel: string;
    applying: string;
    success: string;
    partialSuccess: string;
    error: string;
    noFieldsAvailable: string;
    confirmTitle: string;
    confirmDescription: string;
    confirm: string;
}

export const defaultBatchEditLabels: BatchEditLabels = {
    title: 'Batch Edit',
    selectField: 'Select Field',
    selectFieldPlaceholder: 'Choose a field to edit...',
    newValue: 'New Value',
    selectedRecords: '{count} records selected',
    apply: 'Apply Changes',
    cancel: 'Cancel',
    applying: 'Applying changes...',
    success: 'Successfully updated {count} records',
    partialSuccess: 'Updated {success} of {total} records. {failed} failed.',
    error: 'Failed to update records',
    noFieldsAvailable: 'No editable fields available',
    confirmTitle: 'Confirm Batch Edit',
    confirmDescription: 'Are you sure you want to update {count} records? This action cannot be undone.',
    confirm: 'Yes, update all',
};

export interface BatchEditState {
    selectedField: string | null;
    value: any;
    isSubmitting: boolean;
    result: BatchEditResult | null;
    showConfirm: boolean;
}

export const initialBatchEditState: BatchEditState = {
    selectedField: null,
    value: null,
    isSubmitting: false,
    result: null,
    showConfirm: false,
};

/**
 * Get default value for a field type
 */
export function getDefaultValue(type: InlineFieldType): any {
    switch (type) {
        case 'string':
        case 'text':
            return '';
        case 'number':
        case 'integer':
        case 'float':
            return 0;
        case 'boolean':
            return false;
        case 'date':
        case 'datetime':
            return null;
        case 'select':
            return '';
        case 'json':
            return {};
        default:
            return null;
    }
}

/**
 * Format the selected records message
 */
export function formatSelectedMessage(count: number, labels: BatchEditLabels): string {
    return labels.selectedRecords.replace('{count}', String(count));
}

/**
 * Format success message
 */
export function formatSuccessMessage(count: number, labels: BatchEditLabels): string {
    return labels.success.replace('{count}', String(count));
}

/**
 * Format partial success message
 */
export function formatPartialSuccessMessage(
    success: number,
    failed: number,
    labels: BatchEditLabels
): string {
    return labels.partialSuccess
        .replace('{success}', String(success))
        .replace('{total}', String(success + failed))
        .replace('{failed}', String(failed));
}

/**
 * Format confirm description
 */
export function formatConfirmDescription(count: number, labels: BatchEditLabels): string {
    return labels.confirmDescription.replace('{count}', String(count));
}

/**
 * Check if a field is suitable for batch editing
 */
export function isBatchEditable(field: InlineEditConfig): boolean {
    // Only allow editable fields
    if (!field.isEditable) return false;

    // Allow most types for batch edit
    return true;
}

/**
 * Get editable fields for batch editing
 */
export function getBatchEditableFields(fields: InlineEditConfig[]): InlineEditConfig[] {
    return fields.filter(isBatchEditable);
}

/**
 * Validate batch edit value
 */
export function validateBatchValue(
    value: any,
    field: InlineEditConfig
): { valid: boolean; error?: string } {
    const validation = field.validation;

    if (!validation) {
        return { valid: true };
    }

    // Required check
    if (validation.required && (value === null || value === undefined || value === '')) {
        return { valid: false, error: 'This field is required' };
    }

    // String validations
    if (typeof value === 'string') {
        if (validation.minLength && value.length < validation.minLength) {
            return { valid: false, error: `Minimum length is ${validation.minLength}` };
        }
        if (validation.maxLength && value.length > validation.maxLength) {
            return { valid: false, error: `Maximum length is ${validation.maxLength}` };
        }
        if (validation.pattern) {
            const regex = new RegExp(validation.pattern);
            if (!regex.test(value)) {
                return { valid: false, error: validation.patternMessage || 'Invalid format' };
            }
        }
    }

    // Number validations
    if (typeof value === 'number') {
        if (validation.min !== undefined && value < validation.min) {
            return { valid: false, error: `Minimum value is ${validation.min}` };
        }
        if (validation.max !== undefined && value > validation.max) {
            return { valid: false, error: `Maximum value is ${validation.max}` };
        }
    }

    return { valid: true };
}
