/**
 * Filter Builder Types
 */

export type FilterOperator =
    | 'eq'           // =
    | 'neq'          // !=
    | 'gt'           // >
    | 'gte'          // >=
    | 'lt'           // <
    | 'lte'          // <=
    | 'like'         // LIKE %value%
    | 'ilike'        // ILIKE %value% (case-insensitive)
    | 'startsWith'   // LIKE value%
    | 'endsWith'     // LIKE %value
    | 'in'           // IN (array)
    | 'notIn'        // NOT IN
    | 'between'      // BETWEEN
    | 'isNull'       // IS NULL
    | 'isNotNull'    // IS NOT NULL
    | 'regex'        // Regular expression
    | 'custom';      // Custom handler

export interface FilterCondition {
    id: string;
    field?: string;
    operator?: FilterOperator;
    value?: any;
    logic?: 'AND' | 'OR' | 'NOT';
    children?: FilterCondition[];
    relation?: string;
    relationField?: string;
    customHandler?: string;
    customHandlerParams?: any;
    rawSQL?: string;
    rawSQLParams?: any[];
}

export interface FieldConfig {
    name: string;
    label: string;
    type: string;
    operators?: FilterOperator[];
    options?: { value: string; label: string }[];
    relation?: string;
}

export interface FilterBuilderProps {
    conditions: FilterCondition[];
    fields: FieldConfig[];
    onChange: (conditions: FilterCondition[]) => void;
    maxDepth?: number;
    allowRawSQL?: boolean;
    isAdmin?: boolean;
    labels?: Partial<FilterBuilderLabels>;
}

export interface FilterBuilderLabels {
    addCondition: string;
    addGroup: string;
    removeCondition: string;
    removeGroup: string;
    field: string;
    operator: string;
    value: string;
    and: string;
    or: string;
    not: string;
    selectField: string;
    selectOperator: string;
    enterValue: string;
    noFieldsAvailable: string;
}

export const defaultLabels: FilterBuilderLabels = {
    addCondition: 'Add condition',
    addGroup: 'Add group',
    removeCondition: 'Remove',
    removeGroup: 'Remove group',
    field: 'Field',
    operator: 'Operator',
    value: 'Value',
    and: 'AND',
    or: 'OR',
    not: 'NOT',
    selectField: 'Select field...',
    selectOperator: 'Select operator...',
    enterValue: 'Enter value...',
    noFieldsAvailable: 'No fields available',
};

export const operatorsByType: Record<string, FilterOperator[]> = {
    string: ['eq', 'neq', 'like', 'ilike', 'startsWith', 'endsWith', 'in', 'notIn', 'isNull', 'isNotNull', 'regex'],
    text: ['eq', 'neq', 'like', 'ilike', 'startsWith', 'endsWith', 'isNull', 'isNotNull'],
    number: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'in', 'notIn', 'isNull', 'isNotNull'],
    integer: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'in', 'notIn', 'isNull', 'isNotNull'],
    float: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'in', 'notIn', 'isNull', 'isNotNull'],
    boolean: ['eq', 'neq', 'isNull', 'isNotNull'],
    date: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'isNull', 'isNotNull'],
    datetime: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'isNull', 'isNotNull'],
    json: ['isNull', 'isNotNull', 'custom'],
    default: ['eq', 'neq', 'like', 'isNull', 'isNotNull'],
};

export const operatorLabels: Record<FilterOperator, string> = {
    eq: 'equals',
    neq: 'not equals',
    gt: 'greater than',
    gte: 'greater or equal',
    lt: 'less than',
    lte: 'less or equal',
    like: 'contains',
    ilike: 'contains (case-insensitive)',
    startsWith: 'starts with',
    endsWith: 'ends with',
    in: 'is one of',
    notIn: 'is not one of',
    between: 'between',
    isNull: 'is empty',
    isNotNull: 'is not empty',
    regex: 'matches pattern',
    custom: 'custom',
};

export function generateConditionId(): string {
    return crypto.randomUUID();
}

export function createEmptyCondition(): FilterCondition {
    return {
        id: generateConditionId(),
        field: '',
        operator: 'eq',
        value: '',
    };
}

export function createConditionGroup(logic: 'AND' | 'OR' = 'AND'): FilterCondition {
    return {
        id: generateConditionId(),
        logic,
        children: [createEmptyCondition()],
    };
}
