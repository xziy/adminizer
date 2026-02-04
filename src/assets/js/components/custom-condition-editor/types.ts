/**
 * Custom Condition Editor Types
 */

export interface CustomHandler {
    id: string;
    name: string;
    description?: string;
    fieldName: string;
    modelName: string;
    parameterSchema?: ParameterSchema[];
}

export interface ParameterSchema {
    name: string;
    label: string;
    type: 'string' | 'number' | 'boolean' | 'select' | 'date' | 'json';
    required?: boolean;
    defaultValue?: any;
    placeholder?: string;
    options?: { value: string; label: string }[];
    validation?: {
        min?: number;
        max?: number;
        pattern?: string;
        message?: string;
    };
}

export interface CustomConditionValue {
    handlerId: string;
    operator: string;
    value: any;
    params?: Record<string, any>;
}

export interface CustomConditionEditorProps {
    modelName: string;
    handlers: CustomHandler[];
    value: CustomConditionValue | null;
    onChange: (value: CustomConditionValue | null) => void;
    operators?: CustomOperatorOption[];
    labels?: Partial<CustomConditionEditorLabels>;
    disabled?: boolean;
}

export interface CustomOperatorOption {
    value: string;
    label: string;
}

export interface CustomConditionEditorLabels {
    selectHandler: string;
    selectOperator: string;
    enterValue: string;
    noHandlersAvailable: string;
    handlerLabel: string;
    operatorLabel: string;
    valueLabel: string;
    parametersLabel: string;
    clearSelection: string;
}

export const defaultCustomConditionEditorLabels: CustomConditionEditorLabels = {
    selectHandler: 'Select custom handler...',
    selectOperator: 'Select operator...',
    enterValue: 'Enter value...',
    noHandlersAvailable: 'No custom handlers available',
    handlerLabel: 'Custom Field',
    operatorLabel: 'Operator',
    valueLabel: 'Value',
    parametersLabel: 'Parameters',
    clearSelection: 'Clear',
};

export const defaultCustomOperators: CustomOperatorOption[] = [
    { value: 'eq', label: 'equals' },
    { value: 'neq', label: 'not equals' },
    { value: 'like', label: 'contains' },
    { value: 'gt', label: 'greater than' },
    { value: 'gte', label: 'greater or equal' },
    { value: 'lt', label: 'less than' },
    { value: 'lte', label: 'less or equal' },
    { value: 'in', label: 'is one of' },
    { value: 'isNull', label: 'is empty' },
    { value: 'isNotNull', label: 'is not empty' },
];

export function createEmptyCustomCondition(): CustomConditionValue {
    return {
        handlerId: '',
        operator: 'eq',
        value: '',
        params: {},
    };
}

export function isValidCustomCondition(condition: CustomConditionValue | null): boolean {
    if (!condition) return false;
    if (!condition.handlerId) return false;
    if (!condition.operator) return false;
    // isNull and isNotNull don't require value
    if (['isNull', 'isNotNull'].includes(condition.operator)) return true;
    return condition.value !== undefined && condition.value !== '';
}
