import { FilterCondition, FilterOperator } from '../../models/FilterAP';
import { FILTER_SECURITY_LIMITS } from '../query-builder/ModernQueryBuilder';

/**
 * Security event types for logging suspicious filter attempts
 */
export type SecurityEventType =
    | 'MAX_DEPTH_EXCEEDED'
    | 'TOO_MANY_CONDITIONS'
    | 'DANGEROUS_SQL'
    | 'TOO_MANY_IN_VALUES'
    | 'STRING_TOO_LONG';

/**
 * Security event details for logging
 */
export interface SecurityEvent {
    type: SecurityEventType;
    conditionId: string;
    details: string;
    timestamp: Date;
    value?: any;
}

/**
 * Logger interface for security events
 */
export interface SecurityLogger {
    warn: (...args: any[]) => void;
}

/**
 * Validation result
 */
export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    securityEvents?: SecurityEvent[];
}

/**
 * Validation error
 */
export interface ValidationError {
    conditionId: string;
    field?: string;
    message: string;
    code: string;
}

/**
 * Field configuration for validation
 */
export interface FieldConfig {
    type: string;
    required?: boolean;
    maxLength?: number;
    min?: number;
    max?: number;
}

/**
 * ConditionValidator - validates filter conditions
 *
 * Validates:
 * - Field existence
 * - Operator validity for field type
 * - Value type and format
 * - Security limits (depth, array size, etc.)
 *
 * Security logging:
 * Set ConditionValidator.logger to enable logging of suspicious attempts
 */
export class ConditionValidator {
    /**
     * Static logger for security events
     * Set this to enable logging of suspicious filter attempts
     */
    static logger: SecurityLogger | null = null;

    /**
     * Collected security events during validation
     */
    private securityEvents: SecurityEvent[] = [];

    constructor(
        private fieldsConfig: Record<string, FieldConfig>,
        private allowedFields?: string[]
    ) {}

    /**
     * Validate array of conditions
     */
    validate(conditions: FilterCondition[]): ValidationResult {
        const errors: ValidationError[] = [];
        this.securityEvents = []; // Reset for new validation

        for (const condition of conditions) {
            this.validateCondition(condition, errors, 0);
        }

        return {
            valid: errors.length === 0,
            errors,
            securityEvents: this.securityEvents.length > 0 ? this.securityEvents : undefined
        };
    }

    /**
     * Log a security event (suspicious filter attempt)
     */
    private logSecurityEvent(
        type: SecurityEventType,
        conditionId: string,
        details: string,
        value?: any
    ): void {
        const event: SecurityEvent = {
            type,
            conditionId,
            details,
            timestamp: new Date(),
            value
        };

        this.securityEvents.push(event);

        // Log to external logger if configured
        if (ConditionValidator.logger) {
            ConditionValidator.logger.warn(
                `[SECURITY] Filter validation: ${type} - ${details}` +
                (value !== undefined ? ` (value: ${JSON.stringify(value).substring(0, 100)})` : '')
            );
        }
    }

    /**
     * Validate single condition recursively
     */
    private validateCondition(
        condition: FilterCondition,
        errors: ValidationError[],
        depth: number
    ): void {
        // Check depth limit
        if (depth > FILTER_SECURITY_LIMITS.MAX_DEPTH) {
            this.logSecurityEvent(
                'MAX_DEPTH_EXCEEDED',
                condition.id,
                `Attempted nesting depth ${depth} exceeds max ${FILTER_SECURITY_LIMITS.MAX_DEPTH}`,
                depth
            );
            errors.push({
                conditionId: condition.id,
                message: `Maximum nesting depth exceeded (max ${FILTER_SECURITY_LIMITS.MAX_DEPTH})`,
                code: 'MAX_DEPTH_EXCEEDED'
            });
            return;
        }

        // Group with children
        if (condition.children && condition.children.length > 0) {
            // Check conditions count
            if (condition.children.length > FILTER_SECURITY_LIMITS.MAX_CONDITIONS_PER_GROUP) {
                this.logSecurityEvent(
                    'TOO_MANY_CONDITIONS',
                    condition.id,
                    `Attempted ${condition.children.length} conditions in group, max ${FILTER_SECURITY_LIMITS.MAX_CONDITIONS_PER_GROUP}`,
                    condition.children.length
                );
                errors.push({
                    conditionId: condition.id,
                    message: `Too many conditions in group (max ${FILTER_SECURITY_LIMITS.MAX_CONDITIONS_PER_GROUP})`,
                    code: 'TOO_MANY_CONDITIONS'
                });
                return;
            }

            // Validate logic operator
            if (condition.logic && !['AND', 'OR', 'NOT'].includes(condition.logic)) {
                errors.push({
                    conditionId: condition.id,
                    message: `Invalid logic operator: ${condition.logic}`,
                    code: 'INVALID_LOGIC'
                });
            }

            // NOT requires exactly one child
            if (condition.logic === 'NOT' && condition.children.length !== 1) {
                errors.push({
                    conditionId: condition.id,
                    message: 'NOT operator requires exactly one condition',
                    code: 'NOT_REQUIRES_ONE'
                });
            }

            // Validate children
            for (const child of condition.children) {
                this.validateCondition(child, errors, depth + 1);
            }
            return;
        }

        // Skip validation for custom handlers and raw SQL (they have their own validation)
        if (condition.customHandler || condition.rawSQL) {
            // Just validate that rawSQL doesn't have obvious injection attempts
            if (condition.rawSQL) {
                this.validateRawSQL(condition, errors);
            }
            return;
        }

        // Check field presence
        if (!condition.field) {
            errors.push({
                conditionId: condition.id,
                message: 'Field is required',
                code: 'FIELD_REQUIRED'
            });
            return;
        }

        // Check field is allowed
        if (this.allowedFields && !this.allowedFields.includes(condition.field)) {
            errors.push({
                conditionId: condition.id,
                field: condition.field,
                message: `Field '${condition.field}' is not allowed for filtering`,
                code: 'FIELD_NOT_ALLOWED'
            });
            return;
        }

        // Check field exists in config
        const fieldConfig = this.fieldsConfig[condition.field];
        if (!fieldConfig) {
            errors.push({
                conditionId: condition.id,
                field: condition.field,
                message: `Unknown field: ${condition.field}`,
                code: 'UNKNOWN_FIELD'
            });
            return;
        }

        // Check operator presence
        if (!condition.operator) {
            errors.push({
                conditionId: condition.id,
                field: condition.field,
                message: 'Operator is required',
                code: 'OPERATOR_REQUIRED'
            });
            return;
        }

        // Check operator validity for field type
        if (!this.isOperatorValidForType(condition.operator, fieldConfig.type)) {
            errors.push({
                conditionId: condition.id,
                field: condition.field,
                message: `Operator '${condition.operator}' is not valid for field type '${fieldConfig.type}'`,
                code: 'INVALID_OPERATOR'
            });
        }

        // Check value
        const valueError = this.validateValue(
            condition.value,
            condition.operator,
            fieldConfig
        );
        if (valueError) {
            // Log security events for specific value errors
            if (valueError.includes('Too many values')) {
                this.logSecurityEvent(
                    'TOO_MANY_IN_VALUES',
                    condition.id,
                    `IN operator with ${Array.isArray(condition.value) ? condition.value.length : 0} values exceeds limit`,
                    Array.isArray(condition.value) ? condition.value.length : 0
                );
            } else if (valueError.includes('String too long')) {
                this.logSecurityEvent(
                    'STRING_TOO_LONG',
                    condition.id,
                    `String value length ${typeof condition.value === 'string' ? condition.value.length : 0} exceeds limit`,
                    typeof condition.value === 'string' ? condition.value.length : 0
                );
            }
            errors.push({
                conditionId: condition.id,
                field: condition.field,
                message: valueError,
                code: 'INVALID_VALUE'
            });
        }
    }

    /**
     * Check if operator is valid for field type
     */
    private isOperatorValidForType(operator: FilterOperator, fieldType: string): boolean {
        const operatorsByType: Record<string, FilterOperator[]> = {
            string: ['eq', 'neq', 'like', 'ilike', 'startsWith', 'endsWith', 'in', 'notIn', 'isNull', 'isNotNull', 'regex'],
            text: ['eq', 'neq', 'like', 'ilike', 'startsWith', 'endsWith', 'isNull', 'isNotNull'],
            number: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'in', 'notIn', 'isNull', 'isNotNull'],
            integer: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'in', 'notIn', 'isNull', 'isNotNull'],
            float: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'in', 'notIn', 'isNull', 'isNotNull'],
            boolean: ['eq', 'neq', 'isNull', 'isNotNull'],
            date: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'isNull', 'isNotNull'],
            datetime: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'isNull', 'isNotNull'],
            select: ['eq', 'neq', 'in', 'notIn', 'isNull', 'isNotNull'],
            json: ['isNull', 'isNotNull', 'custom'],
            association: ['eq', 'neq', 'in', 'notIn', 'isNull', 'isNotNull'],
            'association-many': ['in', 'notIn', 'isNull', 'isNotNull']
        };

        const allowed = operatorsByType[fieldType] || operatorsByType.string;
        return allowed.includes(operator);
    }

    /**
     * Validate value for operator and field type
     */
    private validateValue(
        value: any,
        operator: FilterOperator,
        fieldConfig: FieldConfig
    ): string | null {
        // isNull/isNotNull don't require value
        if (operator === 'isNull' || operator === 'isNotNull') {
            return null;
        }

        // Check value presence
        if (value === undefined || value === null || value === '') {
            return 'Value is required';
        }

        // between requires array of 2 elements
        if (operator === 'between') {
            if (!Array.isArray(value)) {
                return 'BETWEEN requires array value';
            }
            if (value.length !== 2) {
                return 'BETWEEN requires array of 2 values';
            }
        }

        // in/notIn require array
        if (operator === 'in' || operator === 'notIn') {
            if (!Array.isArray(value)) {
                return 'IN/NOT IN requires array of values';
            }
            if (value.length === 0) {
                return 'IN/NOT IN requires at least one value';
            }
            if (value.length > FILTER_SECURITY_LIMITS.MAX_IN_VALUES) {
                // Note: We can't call logSecurityEvent from validateValue since it returns string
                // Security logging for this is handled in validateCondition
                return `Too many values (max ${FILTER_SECURITY_LIMITS.MAX_IN_VALUES})`;
            }
        }

        // regex requires valid pattern
        if (operator === 'regex') {
            if (typeof value !== 'string') {
                return 'Regex requires string pattern';
            }
            try {
                new RegExp(value);
            } catch (e: any) {
                return `Invalid regex pattern: ${e?.message || e}`;
            }
        }

        // String length check
        if (typeof value === 'string') {
            if (value.length > FILTER_SECURITY_LIMITS.MAX_STRING_LENGTH) {
                return `String too long (max ${FILTER_SECURITY_LIMITS.MAX_STRING_LENGTH} characters)`;
            }

            if (fieldConfig.maxLength && value.length > fieldConfig.maxLength) {
                return `String exceeds field max length of ${fieldConfig.maxLength}`;
            }
        }

        // Number range check
        if (typeof value === 'number') {
            if (fieldConfig.min !== undefined && value < fieldConfig.min) {
                return `Value must be at least ${fieldConfig.min}`;
            }
            if (fieldConfig.max !== undefined && value > fieldConfig.max) {
                return `Value must be at most ${fieldConfig.max}`;
            }
        }

        // Type validation for specific field types
        if (fieldConfig.type === 'boolean') {
            if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
                return 'Value must be boolean';
            }
        }

        if (fieldConfig.type === 'number' || fieldConfig.type === 'integer' || fieldConfig.type === 'float') {
            if (typeof value !== 'number' && isNaN(parseFloat(value))) {
                return 'Value must be a number';
            }
        }

        return null;
    }

    /**
     * Validate raw SQL for obvious injection attempts
     */
    private validateRawSQL(condition: FilterCondition, errors: ValidationError[]): void {
        const sql = condition.rawSQL;

        if (!sql) return;

        // Check for dangerous patterns
        const dangerousPatterns = [
            /;\s*drop\s+/i,
            /;\s*delete\s+/i,
            /;\s*update\s+/i,
            /;\s*insert\s+/i,
            /;\s*alter\s+/i,
            /;\s*create\s+/i,
            /;\s*truncate\s+/i,
            /union\s+select/i,
            /--\s*$/m,
            /\/\*.*\*\//s
        ];

        for (const pattern of dangerousPatterns) {
            if (pattern.test(sql)) {
                this.logSecurityEvent(
                    'DANGEROUS_SQL',
                    condition.id,
                    `SQL injection attempt detected: pattern ${pattern.toString()} matched`,
                    sql.substring(0, 200)
                );
                errors.push({
                    conditionId: condition.id,
                    message: 'Raw SQL contains potentially dangerous pattern',
                    code: 'DANGEROUS_SQL'
                });
                return;
            }
        }

        // Check that params placeholders match params count
        if (condition.rawSQLParams) {
            const placeholderCount = (sql.match(/\$\d+|\?/g) || []).length;
            if (placeholderCount !== condition.rawSQLParams.length) {
                errors.push({
                    conditionId: condition.id,
                    message: `Placeholder count (${placeholderCount}) doesn't match params count (${condition.rawSQLParams.length})`,
                    code: 'PARAM_MISMATCH'
                });
            }
        }
    }

    /**
     * Get list of allowed operators for a field
     */
    getOperatorsForField(fieldName: string): FilterOperator[] {
        const fieldConfig = this.fieldsConfig[fieldName];
        if (!fieldConfig) {
            return [];
        }

        return this.getOperatorsForType(fieldConfig.type);
    }

    /**
     * Get list of allowed operators for a field type
     */
    getOperatorsForType(fieldType: string): FilterOperator[] {
        const operatorsByType: Record<string, FilterOperator[]> = {
            string: ['eq', 'neq', 'like', 'ilike', 'startsWith', 'endsWith', 'in', 'notIn', 'isNull', 'isNotNull', 'regex'],
            text: ['eq', 'neq', 'like', 'ilike', 'startsWith', 'endsWith', 'isNull', 'isNotNull'],
            number: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'in', 'notIn', 'isNull', 'isNotNull'],
            integer: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'in', 'notIn', 'isNull', 'isNotNull'],
            float: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'in', 'notIn', 'isNull', 'isNotNull'],
            boolean: ['eq', 'neq', 'isNull', 'isNotNull'],
            date: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'isNull', 'isNotNull'],
            datetime: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'isNull', 'isNotNull'],
            select: ['eq', 'neq', 'in', 'notIn', 'isNull', 'isNotNull'],
            json: ['isNull', 'isNotNull', 'custom'],
            association: ['eq', 'neq', 'in', 'notIn', 'isNull', 'isNotNull'],
            'association-many': ['in', 'notIn', 'isNull', 'isNotNull']
        };

        return operatorsByType[fieldType] || operatorsByType.string;
    }
}

export default ConditionValidator;
