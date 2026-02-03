import { Fields } from '../../helpers/fieldsHelper';
import { AbstractModel } from '../model/AbstractModel';
import { DataAccessor } from '../DataAccessor';
import { BaseFieldConfig } from '../../interfaces/adminpanelConfig';
import { FilterCondition, FilterOperator } from '../../models/FilterAP';

/**
 * Security limits for filter conditions
 */
export const FILTER_SECURITY_LIMITS = {
    MAX_DEPTH: 10,                  // Maximum nesting depth
    MAX_IN_VALUES: 1000,            // Maximum elements in IN operator
    MAX_CONDITIONS_PER_GROUP: 100,  // Maximum conditions in one group
    MAX_STRING_LENGTH: 10000        // Maximum string length in filter value
};

/**
 * Modern query parameters interface
 * Replaces legacy DataTables.js format
 */
export interface QueryParams {
    page: number;
    limit: number;
    sort?: string;
    sortDirection?: 'ASC' | 'DESC';
    filters?: FilterCondition[];
    globalSearch?: string;
    fields?: string[];
}

/**
 * Query result interface
 */
export interface QueryResult<T = any> {
    data: T[];
    total: number;
    filtered: number;
    page: number;
    limit: number;
    pages: number;
}

/**
 * Custom field condition result
 */
export interface CustomFieldCondition {
    rawSQL?: string;
    params?: any[];
    inMemory?: (record: any) => boolean;
    criteria?: Record<string, any>;
}

/**
 * ModernQueryBuilder - replaces legacy NodeTable
 *
 * Key improvements:
 * - Promise-based API (no callbacks)
 * - Clean interface without DataTables.js format
 * - Direct integration with FilterCondition
 * - Support for CustomFieldHandler
 * - TypeScript type safety
 * - Full operator support (eq, neq, gt, gte, lt, lte, like, ilike, in, between, isNull, regex, custom)
 * - Nested AND/OR/NOT groups
 */
export class ModernQueryBuilder {
    private fieldsArray: string[] = ['actions'];
    private dialect: string = 'waterline';

    constructor(
        private model: AbstractModel<any>,
        private fields: Fields,
        private dataAccessor: DataAccessor
    ) {
        this.fieldsArray = this.fieldsArray.concat(Object.keys(this.fields));
        // Try to detect dialect from dataAccessor if available
        if (dataAccessor && typeof (dataAccessor as any).getDialect === 'function') {
            this.dialect = (dataAccessor as any).getDialect();
        }
    }

    /**
     * Execute query with Promise API
     */
    async execute(params: QueryParams): Promise<QueryResult> {
        const whereClause = this.buildWhere(params);
        const orderClause = this.buildOrder(params);
        const offset = (params.page - 1) * params.limit;

        // Execute queries in parallel
        const [data, total, filtered] = await Promise.all([
            this.model.find({
                where: whereClause,
                sort: orderClause,
                limit: params.limit,
                skip: offset
            }, this.dataAccessor),
            this.model.count({}, this.dataAccessor),
            this.model.count(whereClause, this.dataAccessor)
        ]);

        return {
            data: this.mapData(data),
            total,
            filtered,
            page: params.page,
            limit: params.limit,
            pages: Math.ceil(filtered / params.limit)
        };
    }

    /**
     * Build WHERE clause from FilterCondition[]
     * Supports nested AND/OR/NOT groups
     */
    private buildWhere(params: QueryParams): any {
        const conditions: any[] = [];

        // 1. Filters from FilterCondition
        if (params.filters && params.filters.length > 0) {
            const filterCondition = this.buildConditionGroup(params.filters, 'AND');
            if (Object.keys(filterCondition).length > 0) {
                conditions.push(filterCondition);
            }
        }

        // 2. Global search (for compatibility)
        if (params.globalSearch) {
            const searchConditions = this.buildGlobalSearch(params.globalSearch);
            if (searchConditions && Object.keys(searchConditions).length > 0) {
                conditions.push(searchConditions);
            }
        }

        // Combine with AND
        if (conditions.length === 0) {
            return {};
        }

        if (conditions.length === 1) {
            return conditions[0];
        }

        return { and: conditions };
    }

    /**
     * Recursive condition group builder
     * Key method for complex filter support
     */
    private buildConditionGroup(
        conditions: FilterCondition[],
        logic: 'AND' | 'OR' | 'NOT' = 'AND',
        depth: number = 0
    ): Record<string, any> {
        // Security: check depth
        if (depth > FILTER_SECURITY_LIMITS.MAX_DEPTH) {
            throw new Error(`Filter nesting too deep (max ${FILTER_SECURITY_LIMITS.MAX_DEPTH})`);
        }

        // Security: check conditions count
        if (conditions.length > FILTER_SECURITY_LIMITS.MAX_CONDITIONS_PER_GROUP) {
            throw new Error(`Too many conditions in group (max ${FILTER_SECURITY_LIMITS.MAX_CONDITIONS_PER_GROUP})`);
        }

        const clauses = conditions
            .filter(cond => this.isValidCondition(cond, depth))
            .map(cond => {
                // Recursion for nested groups
                if (cond.children && cond.children.length > 0) {
                    return this.buildConditionGroup(
                        cond.children,
                        cond.logic || 'AND',
                        depth + 1
                    );
                }

                // Simple condition
                return this.buildSingleCondition(cond);
            })
            .filter(c => c && Object.keys(c).length > 0);

        if (clauses.length === 0) {
            return {};
        }

        if (clauses.length === 1) {
            // NOT operator
            if (logic === 'NOT') {
                return { not: clauses[0] };
            }
            return clauses[0];
        }

        // NOT operator requires exactly one condition
        if (logic === 'NOT') {
            throw new Error('NOT operator requires exactly one condition');
        }

        return logic === 'OR'
            ? { or: clauses }
            : { and: clauses };
    }

    /**
     * Validate condition
     */
    private isValidCondition(cond: FilterCondition, _depth: number = 0): boolean {
        // Group with children
        if (cond.children && cond.children.length > 0) {
            return true;
        }

        // Regular condition
        if (!cond.field && !cond.customHandler && !cond.rawSQL) {
            return false;
        }

        if (!cond.operator) {
            return false;
        }

        // isNull/isNotNull don't require value
        if (cond.operator === 'isNull' || cond.operator === 'isNotNull') {
            return true;
        }

        // Custom handlers may have their own validation
        if (cond.customHandler || cond.rawSQL) {
            return true;
        }

        // Others require value
        return cond.value !== undefined && cond.value !== '';
    }

    /**
     * Build single condition
     */
    private buildSingleCondition(cond: FilterCondition): Record<string, any> {
        // 1. Raw SQL (highest priority)
        if (cond.rawSQL) {
            return {
                __rawSQL: {
                    sql: cond.rawSQL,
                    params: cond.rawSQLParams || []
                }
            };
        }

        // 2. Custom handler
        if (cond.customHandler) {
            return this.handleCustomCondition(cond);
        }

        // 3. Relation condition
        if (cond.relation && cond.relationField) {
            return this.buildRelationCondition(cond);
        }

        // 4. Standard field condition
        const { field, operator, value } = cond;

        // Ensure field and operator exist
        if (!field || !operator) {
            return {};
        }

        // Validate operator-value combination
        this.validateOperatorValue(operator, value);

        // Map operator to ORM condition
        const condition = this.mapOperatorToCondition(operator, value);

        return { [field]: condition };
    }

    /**
     * Map filter operators to ORM format
     */
    private mapOperatorToCondition(operator: FilterOperator, value: any): any {
        switch (operator) {
            case 'eq':
                return value;

            case 'neq':
                return { '!=': value };

            case 'gt':
                return { '>': value };

            case 'gte':
                return { '>=': value };

            case 'lt':
                return { '<': value };

            case 'lte':
                return { '<=': value };

            case 'like':
                return { contains: value };

            case 'ilike':
                // For PostgreSQL - native ILIKE
                if (this.dialect === 'postgres' || this.dialect === 'postgresql') {
                    return { ilike: `%${value}%` };
                }
                // For others - emulate with lower()
                return { contains: String(value).toLowerCase() };

            case 'startsWith':
                return { startsWith: value };

            case 'endsWith':
                return { endsWith: value };

            case 'regex':
                return { regexp: value };

            case 'in':
                return { in: Array.isArray(value) ? value : [value] };

            case 'notIn':
                return { '!': Array.isArray(value) ? value : [value] };

            case 'between':
                if (Array.isArray(value) && value.length === 2) {
                    return { '>=': value[0], '<=': value[1] };
                }
                return value;

            case 'isNull':
                return null;

            case 'isNotNull':
                return { '!=': null };

            case 'custom':
                // Custom conditions are handled separately
                return value;

            default:
                return value;
        }
    }

    /**
     * Validate operator-value combination
     */
    private validateOperatorValue(operator: FilterOperator, value: any): void {
        switch (operator) {
            case 'in':
            case 'notIn':
                if (!Array.isArray(value)) {
                    throw new Error(`Operator '${operator}' requires array value`);
                }
                if (value.length > FILTER_SECURITY_LIMITS.MAX_IN_VALUES) {
                    throw new Error(`Too many values in IN operator (max ${FILTER_SECURITY_LIMITS.MAX_IN_VALUES})`);
                }
                break;

            case 'between':
                if (!Array.isArray(value) || value.length !== 2) {
                    throw new Error('BETWEEN operator requires array of 2 values');
                }
                break;

            case 'regex':
                if (typeof value !== 'string') {
                    throw new Error('Regex operator requires string pattern');
                }
                try {
                    new RegExp(value);
                } catch (e) {
                    throw new Error(`Invalid regex pattern: ${value}`);
                }
                break;

            case 'like':
            case 'ilike':
            case 'startsWith':
            case 'endsWith':
                if (typeof value === 'string' && value.length > FILTER_SECURITY_LIMITS.MAX_STRING_LENGTH) {
                    throw new Error(`String value too long (max ${FILTER_SECURITY_LIMITS.MAX_STRING_LENGTH})`);
                }
                break;
        }
    }

    /**
     * Build relation condition
     */
    private buildRelationCondition(cond: FilterCondition): Record<string, any> {
        const { relation, relationField, operator, value } = cond;

        // Ensure operator exists
        if (!operator) {
            return {};
        }

        // Format depends on ORM adapter
        // Sequelize: use include with where
        // Waterline: use populate with criteria

        return {
            _relation: {
                name: relation,
                field: relationField,
                condition: this.mapOperatorToCondition(operator, value)
            }
        };
    }

    /**
     * Handle custom condition
     */
    private handleCustomCondition(cond: FilterCondition): Record<string, any> {
        // Import CustomFieldHandler dynamically to avoid circular dependencies
        try {
            const { CustomFieldHandler } = require('../filters/CustomFieldHandler');
            const handler = CustomFieldHandler.get(cond.customHandler);

            if (handler) {
                const condition = handler.buildCondition(
                    cond.operator,
                    cond.value,
                    this.dialect,
                    cond.customHandlerParams
                );

                // rawSQL returned
                if (condition.rawSQL) {
                    return {
                        __rawSQL: {
                            sql: condition.rawSQL,
                            params: condition.params || []
                        }
                    };
                }

                // in-memory function returned
                if (condition.inMemory) {
                    return {
                        __inMemory: condition.inMemory
                    };
                }

                // Standard criteria returned
                if (condition.criteria) {
                    return condition.criteria;
                }

                return condition;
            }
        } catch (e) {
            // CustomFieldHandler not available - skip
        }

        return {};
    }

    /**
     * Build global search condition
     */
    private buildGlobalSearch(searchStr: string): any {
        if (!searchStr || searchStr.trim() === '') {
            return null;
        }

        const searchConditions: any[] = [];

        for (const [fieldName, fieldConfig] of Object.entries(this.fields)) {
            const fieldType = fieldConfig.model?.type as string;

            // Only search in searchable text fields
            if (fieldType === 'string' || fieldType === 'text' || fieldType === 'email') {
                searchConditions.push({
                    [fieldName]: { contains: searchStr }
                });
            } else if (fieldType === 'number' || fieldType === 'integer' || fieldType === 'float') {
                // For numbers, try to parse and match exactly
                const numValue = parseFloat(searchStr);
                if (!isNaN(numValue)) {
                    searchConditions.push({
                        [fieldName]: numValue
                    });
                }
            }
        }

        if (searchConditions.length === 0) {
            return null;
        }

        if (searchConditions.length === 1) {
            return searchConditions[0];
        }

        return { or: searchConditions };
    }

    /**
     * Build ORDER clause
     */
    private buildOrder(params: QueryParams): string {
        const sortField = params.sort || 'createdAt';
        const sortDirection = params.sortDirection || 'DESC';

        // Validate sort field exists
        if (sortField !== 'createdAt' && sortField !== 'updatedAt') {
            const fieldExists = sortField in this.fields ||
                sortField === this.model.primaryKey ||
                sortField === 'id';

            if (!fieldExists) {
                // Fallback to createdAt if field doesn't exist
                return 'createdAt DESC';
            }
        }

        return `${sortField} ${sortDirection}`;
    }

    /**
     * Map data for output
     */
    private mapData(data: any[]): any[] {
        const out: any[] = [];

        data.forEach((elem: any) => {
            const row: any = {};

            // Add primary key first
            const pk = this.model.primaryKey ?? 'id';
            row[pk] = elem[pk];

            // Process each field
            Object.keys(this.fields).forEach((key: string) => {
                const fieldConfig = this.fields[key].config as BaseFieldConfig;
                const fieldModel = this.fields[key].model;
                const modelConfig = this.fields[key].modelConfig;

                const displayField = modelConfig?.titleField ??
                    (typeof elem['title'] !== 'undefined' ? 'title' :
                        typeof elem['name'] !== 'undefined' ? 'name' :
                            modelConfig?.identifierField ?? 'id');

                if (fieldConfig.displayModifier) {
                    // Custom display modifier
                    row[key] = fieldConfig.displayModifier(elem[key]);
                } else if (fieldModel && fieldModel.model) {
                    // Handle "belongsTo" relationships
                    if (!elem[key]) {
                        row[key] = null;
                    } else {
                        row[key] = elem[key][displayField];
                    }
                } else if (fieldModel?.type === 'association-many' || fieldModel?.type === 'association') {
                    // Handle "hasMany" relationships
                    if (!elem[key] || elem[key].length === 0) {
                        row[key] = null;
                    } else {
                        const displayValues: string[] = [];
                        elem[key].forEach((item: any) => {
                            if (item[displayField]) {
                                displayValues.push(item[displayField]);
                            } else if (fieldConfig.identifierField && item[fieldConfig.identifierField]) {
                                displayValues.push(item[fieldConfig.identifierField]);
                            }
                        });
                        row[key] = displayValues.join(', ');
                    }
                } else if (fieldModel?.type === 'json') {
                    // Handle JSON fields
                    const str = JSON.stringify(elem[key]);
                    row[key] = str === '{}' ? '' : str;
                } else {
                    // Regular field
                    row[key] = elem[key];
                }
            });

            out.push(row);
        });

        return out;
    }

    /**
     * Get allowed operators for field type
     */
    static getOperatorsForFieldType(fieldType: string): FilterOperator[] {
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
