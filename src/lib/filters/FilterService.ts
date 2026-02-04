import { Adminizer } from '../Adminizer';
import { DataAccessor } from '../DataAccessor';
import { ModernQueryBuilder, QueryParams, QueryResult } from '../query-builder/ModernQueryBuilder';
import { FilterAP, FilterCondition, FilterOperator } from '../../models/FilterAP';
import { FilterColumnAP } from '../../models/FilterColumnAP';
import { UserAP } from '../../models/UserAP';
import { Fields, Field } from '../../helpers/fieldsHelper';
import { AbstractModel } from '../model/AbstractModel';
import { FilterMigrator, MigrationResult, CURRENT_FILTER_VERSION } from './FilterMigrator';
import { ValidationResult } from './ConditionValidator';
import { Entity } from '../../interfaces/types';
import { ModelConfig, ModelFiltersConfig } from '../../interfaces/adminpanelConfig';

/**
 * FilterService - manages filter operations
 *
 * Key responsibilities:
 * - Check if filters are enabled for a model
 * - Apply saved filters to queries
 * - Integrate with ModernQueryBuilder
 * - Handle filter access control
 */
export class FilterService {
    constructor(private adminizer: Adminizer) {}

    /**
     * Get Entity object by model name
     * Similar to ControllerHelper.findEntityObject but without req dependency
     */
    private getEntityByModelName(modelName: string): Entity | null {
        const models = this.adminizer.config.models;
        if (!models) {
            return null;
        }

        // Find config (case-insensitive)
        const foundKey = Object.keys(models).find(
            key => key.toLowerCase() === modelName.toLowerCase()
        );

        if (!foundKey) {
            return null;
        }

        const config = models[foundKey] as ModelConfig;
        if (!config || typeof config === 'boolean') {
            return null;
        }

        // Get AbstractModel
        const model = this.adminizer.modelHandler.model.get(config.model);
        if (!model) {
            return null;
        }

        return {
            name: foundKey,
            config,
            model,
            uri: `${this.adminizer.config.routePrefix}/model/${foundKey}`,
            type: 'model'
        };
    }

    /**
     * Check if filters are enabled globally
     */
    isFiltersEnabled(): boolean {
        const config = this.adminizer.config as any;
        return config.filters?.enabled !== false;
    }

    /**
     * Check if filters are enabled for a specific model
     */
    isFiltersEnabledForModel(modelName: string): boolean {
        // Check global setting first
        if (!this.isFiltersEnabled()) {
            // Check if model has explicit override
            const config = this.adminizer.config as any;
            const modelConfig = config.modelFilters?.[modelName];
            return modelConfig?.enabled === true;
        }

        // Check model-specific override
        const config = this.adminizer.config as any;
        const modelConfig = config.modelFilters?.[modelName];

        // If explicitly disabled for this model
        if (modelConfig?.enabled === false) {
            return false;
        }

        return true;
    }

    /**
     * Check if legacy search should be used for a model
     */
    shouldUseLegacySearch(modelName: string): boolean {
        const config = this.adminizer.config as any;
        const modelConfig = config.modelFilters?.[modelName];
        return modelConfig?.useLegacySearch === true;
    }

    /**
     * Apply a saved filter to a query
     * @param filterId - Filter ID
     * @param model - Model to query
     * @param fields - Fields configuration
     * @param dataAccessor - DataAccessor instance
     * @param user - Current user (for access control)
     * @param options - Additional query options
     */
    async applyFilter(
        filterId: string,
        model: AbstractModel<any>,
        fields: Fields,
        dataAccessor: DataAccessor,
        user: UserAP,
        options?: {
            page?: number;
            limit?: number;
            sort?: string;
            sortDirection?: 'ASC' | 'DESC';
        }
    ): Promise<QueryResult> {
        // 1. Load filter
        const filter = await this.getFilterById(filterId, user);

        if (!filter) {
            throw new Error(`Filter '${filterId}' not found`);
        }

        // 2. Check access
        if (!this.canViewFilter(filter, user)) {
            throw new Error('Access denied to this filter');
        }

        // 3. Convert to QueryParams
        const queryParams: QueryParams = {
            page: options?.page || 1,
            limit: options?.limit || 10,
            sort: options?.sort || filter.sortField || 'createdAt',
            sortDirection: options?.sortDirection || filter.sortDirection || 'DESC',
            filters: filter.conditions || []
        };

        // 4. Create QueryBuilder
        const queryBuilder = new ModernQueryBuilder(
            model,
            fields,
            dataAccessor
        );

        // 5. Execute query
        return await queryBuilder.execute(queryParams);
    }

    /**
     * Apply filter by slug
     */
    async applyFilterBySlug(
        slug: string,
        model: AbstractModel<any>,
        fields: Fields,
        dataAccessor: DataAccessor,
        user: UserAP,
        options?: {
            page?: number;
            limit?: number;
            sort?: string;
            sortDirection?: 'ASC' | 'DESC';
        }
    ): Promise<QueryResult> {
        const filter = await this.getFilterBySlug(slug);

        if (!filter) {
            throw new Error(`Filter '${slug}' not found`);
        }

        return this.applyFilter(filter.id, model, fields, dataAccessor, user, options);
    }

    /**
     * Get filter by ID with access control
     */
    async getFilterById(filterId: string, _user: UserAP): Promise<FilterAP | null> {
        const filterModel = this.adminizer.modelHandler.model.get('filterap');

        if (!filterModel) {
            throw new Error('FilterAP model not found');
        }

        const filter = await filterModel["_findOne"]({ id: filterId });

        return filter as FilterAP | null;
    }

    /**
     * Get filter by slug
     */
    async getFilterBySlug(slug: string): Promise<FilterAP | null> {
        const filterModel = this.adminizer.modelHandler.model.get('filterap');

        if (!filterModel) {
            throw new Error('FilterAP model not found');
        }

        const filter = await filterModel["_findOne"]({ slug });

        return filter as FilterAP | null;
    }

    /**
     * Get filters for a model accessible by user
     */
    async getFiltersForModel(
        modelName: string,
        user: UserAP,
        options?: {
            includePublic?: boolean;
            includeSystem?: boolean;
        }
    ): Promise<FilterAP[]> {
        const filterModel = this.adminizer.modelHandler.model.get('filterap');

        if (!filterModel) {
            throw new Error('FilterAP model not found');
        }

        const filters: FilterAP[] = [];

        // Build base criteria
        const baseCriteria: any = { modelName };
        if (!options?.includeSystem) {
            baseCriteria.isSystemFilter = false;
        }

        // 1. Get user's own filters
        const ownFilters = await filterModel["_find"]({
            ...baseCriteria,
            owner: user.id
        }) as FilterAP[];
        filters.push(...ownFilters);

        // 2. Get public filters (if requested)
        if (options?.includePublic !== false) {
            const publicFilters = await filterModel["_find"]({
                ...baseCriteria,
                visibility: 'public'
            }) as FilterAP[];

            // Deduplicate
            for (const filter of publicFilters) {
                if (!filters.find(f => f.id === filter.id)) {
                    filters.push(filter);
                }
            }
        }

        // 3. Get group filters if user has groups
        if (user.groups && user.groups.length > 0) {
            const groupIds = user.groups.map(g => g.id);

            const groupFilters = await filterModel["_find"]({
                ...baseCriteria,
                visibility: 'groups'
            }) as FilterAP[];

            // Check if user's groups intersect with filter's groups
            for (const filter of groupFilters) {
                if (filter.groupIds && filter.groupIds.some(gid => groupIds.includes(gid))) {
                    if (!filters.find(f => f.id === filter.id)) {
                        filters.push(filter);
                    }
                }
            }
        }

        // 4. Admin sees all filters
        if (user.isAdministrator) {
            const allFilters = await filterModel["_find"](baseCriteria) as FilterAP[];

            for (const filter of allFilters) {
                if (!filters.find(f => f.id === filter.id)) {
                    filters.push(filter);
                }
            }
        }

        return filters;
    }

    /**
     * Check if user can view a filter
     */
    canViewFilter(filter: FilterAP, user: UserAP): boolean {
        // Admin can view all
        if (user.isAdministrator) {
            return true;
        }

        // Owner can view
        const ownerId = typeof filter.owner === 'object' ? filter.owner.id : filter.owner;
        if (ownerId === user.id) {
            return true;
        }

        // Public filters
        if (filter.visibility === 'public') {
            return true;
        }

        // System filters (accessible via API)
        if (filter.visibility === 'system') {
            return true;
        }

        // Group filters
        if (filter.visibility === 'groups' && filter.groupIds && user.groups) {
            const userGroupIds = user.groups.map(g => g.id);
            return filter.groupIds.some(gid => userGroupIds.includes(gid));
        }

        return false;
    }

    /**
     * Check if user can edit a filter
     */
    canEditFilter(filter: FilterAP, user: UserAP): boolean {
        // Admin can edit all
        if (user.isAdministrator) {
            return true;
        }

        // Only owner can edit
        const ownerId = typeof filter.owner === 'object' ? filter.owner.id : filter.owner;
        return ownerId === user.id;
    }

    /**
     * Check if user can delete a filter
     */
    canDeleteFilter(filter: FilterAP, user: UserAP): boolean {
        return this.canEditFilter(filter, user);
    }

    /**
     * Count records matching a filter's conditions
     *
     * @param filter - Filter to count results for
     * @param user - User requesting the count (for access control)
     * @returns Number of matching records, or -1 on error
     */
    async countFilterResults(filter: FilterAP, user: UserAP): Promise<number> {
        try {
            const entity = this.getEntityByModelName(filter.modelName);
            if (!entity || !entity.model) {
                Adminizer.log.warn(`FilterService.countFilterResults: Model '${filter.modelName}' not found`);
                return -1;
            }

            const dataAccessor = new DataAccessor(this.adminizer, user, entity, 'list');
            const fields = dataAccessor.getFieldsConfig();

            const queryParams: QueryParams = {
                page: 1,
                limit: 1, // We only need count
                filters: filter.conditions || []
            };

            const queryBuilder = new ModernQueryBuilder(entity.model, fields, dataAccessor);
            const result = await queryBuilder.execute(queryParams);

            return result.filtered;
        } catch (error: any) {
            Adminizer.log.error(`FilterService.countFilterResults error for filter '${filter.id}':`, error);
            return -1;
        }
    }

    /**
     * Create a new filter
     */
    async createFilter(
        data: Partial<FilterAP>,
        user: UserAP
    ): Promise<FilterAP> {
        const filterModel = this.adminizer.modelHandler.model.get('filterap');

        if (!filterModel) {
            throw new Error('FilterAP model not found');
        }

        // Generate UUID if not provided
        if (!data.id) {
            data.id = crypto.randomUUID();
        }

        // Set owner
        data.owner = user.id;

        // Set defaults
        data.visibility = data.visibility || 'private';
        data.version = data.version || 1;
        data.apiEnabled = data.apiEnabled || false;
        data.isPinned = data.isPinned || false;
        data.isSystemFilter = data.isSystemFilter || false;
        data.conditions = data.conditions || [];

        const filter = await filterModel["_create"](data);
        return filter as FilterAP;
    }

    /**
     * Update a filter
     */
    async updateFilter(
        filterId: string,
        data: Partial<FilterAP>,
        user: UserAP
    ): Promise<FilterAP> {
        const filter = await this.getFilterById(filterId, user);

        if (!filter) {
            throw new Error(`Filter '${filterId}' not found`);
        }

        if (!this.canEditFilter(filter, user)) {
            throw new Error('Access denied');
        }

        const filterModel = this.adminizer.modelHandler.model.get('filterap');
        if (!filterModel) {
            throw new Error('FilterAP model not found');
        }

        // Don't allow changing owner
        delete data.owner;
        delete data.id;

        await filterModel["_updateOne"]({ id: filterId }, data);

        const updated = await this.getFilterById(filterId, user);
        if (!updated) {
            throw new Error(`Filter '${filterId}' not found after update`);
        }
        return updated;
    }

    /**
     * Delete a filter
     */
    async deleteFilter(filterId: string, user: UserAP): Promise<void> {
        const filter = await this.getFilterById(filterId, user);

        if (!filter) {
            throw new Error(`Filter '${filterId}' not found`);
        }

        if (!this.canDeleteFilter(filter, user)) {
            throw new Error('Access denied');
        }

        // Delete columns first
        const columnModel = this.adminizer.modelHandler.model.get('filtercolumnap');
        if (columnModel) {
            await columnModel["_destroy"]({ filter: filterId });
        }

        const filterModel = this.adminizer.modelHandler.model.get('filterap');
        if (filterModel) {
            await filterModel["_destroyOne"]({ id: filterId });
        }
    }

    /**
     * Get columns for a filter
     */
    async getFilterColumns(filterId: string): Promise<FilterColumnAP[]> {
        const columnModel = this.adminizer.modelHandler.model.get('filtercolumnap');

        if (!columnModel) {
            return [];
        }

        const columns = await columnModel["_find"]({ filter: filterId });

        // Sort by order
        return (columns as FilterColumnAP[]).sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    /**
     * Update columns for a filter (replace all)
     */
    async updateFilterColumns(
        filterId: string,
        columns: Partial<FilterColumnAP>[],
        user: UserAP
    ): Promise<FilterColumnAP[]> {
        const filter = await this.getFilterById(filterId, user);

        if (!filter) {
            throw new Error(`Filter '${filterId}' not found`);
        }

        if (!this.canEditFilter(filter, user)) {
            throw new Error('Access denied');
        }

        const columnModel = this.adminizer.modelHandler.model.get('filtercolumnap');

        if (!columnModel) {
            throw new Error('FilterColumnAP model not found');
        }

        // Delete existing columns
        await columnModel["_destroy"]({ filter: filterId });

        // Create new columns
        if (columns.length > 0) {
            for (let i = 0; i < columns.length; i++) {
                const col = columns[i];
                await columnModel["_create"]({
                    filter: filterId,
                    fieldName: col.fieldName,
                    order: col.order ?? i,
                    width: col.width,
                    isVisible: col.isVisible ?? true,
                    isEditable: col.isEditable ?? false
                });
            }
        }

        return this.getFilterColumns(filterId);
    }

    /**
     * Get filter with columns loaded
     */
    async getFilterWithColumns(filterId: string, user: UserAP): Promise<{
        filter: FilterAP | null;
        columns: FilterColumnAP[];
    }> {
        const filter = await this.getFilterById(filterId, user);

        if (!filter) {
            return { filter: null, columns: [] };
        }

        if (!this.canViewFilter(filter, user)) {
            return { filter: null, columns: [] };
        }

        const columns = await this.getFilterColumns(filterId);

        return { filter, columns };
    }

    /**
     * Load and validate a filter, applying migrations if needed
     *
     * @param filterId - Filter ID to load
     * @param user - Current user
     * @param options - Validation options
     * @returns Filter with validation/migration result
     */
    async loadFilterWithValidation(
        filterId: string,
        user: UserAP,
        options: {
            autoMigrate?: boolean;
            saveAfterMigration?: boolean;
            strictValidation?: boolean;
        } = {}
    ): Promise<{
        filter: FilterAP | null;
        migration: MigrationResult & { validation: ValidationResult } | null;
        error?: string;
    }> {
        const { autoMigrate = true, saveAfterMigration = true, strictValidation = false } = options;

        // 1. Load raw filter
        const filter = await this.getFilterById(filterId, user);

        if (!filter) {
            return { filter: null, migration: null, error: 'Filter not found' };
        }

        // 2. Check access
        if (!this.canViewFilter(filter, user)) {
            return { filter: null, migration: null, error: 'Access denied' };
        }

        // 3. Get fields config for the model
        const fieldsConfig = await this.getFieldsConfigForModel(filter.modelName);

        // 4. Validate and migrate
        const migrationResult = FilterMigrator.validateAndMigrate(filter, fieldsConfig, {
            autoMigrate,
            strictValidation
        });

        // 5. Save migrated filter if needed
        if (saveAfterMigration && migrationResult.migrated && this.canEditFilter(filter, user)) {
            try {
                await this.updateFilterRaw(filterId, {
                    conditions: migrationResult.filter.conditions,
                    version: CURRENT_FILTER_VERSION
                });
            } catch (error: any) {
                // Log but don't fail - migration save is best-effort
                Adminizer.log.warn(
                    `Failed to save migrated filter ${filterId}: ${error?.message || error}`
                );
            }
        }

        return {
            filter: migrationResult.filter,
            migration: migrationResult
        };
    }

    /**
     * Validate filter conditions without loading from DB
     *
     * @param conditions - Filter conditions to validate
     * @param modelName - Target model name
     * @returns Validation result
     */
    async validateConditions(
        conditions: FilterCondition[],
        modelName: string
    ): Promise<ValidationResult> {
        const fieldsConfig = await this.getFieldsConfigForModel(modelName);

        // Create a temporary filter for validation
        const tempFilter: FilterAP = {
            id: 'temp',
            name: 'temp',
            modelName,
            slug: 'temp',
            conditions,
            visibility: 'private',
            owner: 0,
            apiEnabled: false,
            version: CURRENT_FILTER_VERSION,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = FilterMigrator.validateAndMigrate(tempFilter, fieldsConfig);
        return result.validation;
    }

    /**
     * Get fields configuration for a model
     */
    private async getFieldsConfigForModel(modelName: string): Promise<Record<string, any> | undefined> {
        try {
            const entity = this.getEntityByModelName(modelName);
            if (!entity || !entity.model) {
                return undefined;
            }

            // Try to get fields from model configuration
            if (entity.config?.fields) {
                return entity.config.fields as Record<string, any>;
            }

            // Fallback: try to get from model attributes
            if (entity.model?.attributes) {
                return entity.model.attributes as Record<string, any>;
            }

            return undefined;
        } catch {
            return undefined;
        }
    }

    /**
     * Update filter without permission checks (internal use)
     */
    private async updateFilterRaw(
        filterId: string,
        data: Partial<FilterAP>
    ): Promise<void> {
        const filterModel = this.adminizer.modelHandler.model.get('filterap');
        if (!filterModel) {
            throw new Error('FilterAP model not found');
        }

        await filterModel["_updateOne"]({ id: filterId }, data);
    }

    /**
     * Check if filter needs migration
     */
    filterNeedsMigration(filter: FilterAP): boolean {
        return FilterMigrator.needsMigration(filter);
    }

    /**
     * Get current filter schema version
     */
    getCurrentFilterVersion(): number {
        return CURRENT_FILTER_VERSION;
    }

    /**
     * Sanitize filter conditions (remove invalid/dangerous)
     *
     * @param conditions - Conditions to sanitize
     * @param modelName - Target model name
     * @param options - Sanitization options
     */
    async sanitizeConditions(
        conditions: FilterCondition[],
        modelName: string,
        options: {
            removeInvalid?: boolean;
            removeRawSQL?: boolean;
        } = {}
    ): Promise<{ conditions: FilterCondition[]; removed: string[] }> {
        const fieldsConfig = await this.getFieldsConfigForModel(modelName);

        if (!fieldsConfig) {
            return { conditions, removed: [] };
        }

        return FilterMigrator.sanitizeConditions(conditions, fieldsConfig, options);
    }

    // ============================================
    // AUTO-GENERATE FILTERS
    // ============================================

    /**
     * Get model filter configuration
     */
    getModelFilterConfig(modelName: string): ModelFiltersConfig | undefined {
        const config = this.adminizer.config as any;
        return config.modelFilters?.[modelName];
    }

    /**
     * Check if auto-generate filters is enabled for a model
     */
    isAutoGenerateEnabled(modelName: string): boolean {
        const modelConfig = this.getModelFilterConfig(modelName);
        return modelConfig?.autoGenerateFilters === true;
    }

    /**
     * Check if a field should be included in auto-generated filters
     */
    private shouldIncludeField(
        fieldName: string,
        modelConfig: ModelFiltersConfig | undefined
    ): boolean {
        // If includeFields is specified, use whitelist mode
        if (modelConfig?.includeFields?.length) {
            return modelConfig.includeFields.includes(fieldName);
        }

        // Default excluded fields (sensitive data)
        const defaultExcluded = [
            'password', 'passwordHash', 'hash', 'salt',
            'apiKey', 'apiSecret', 'token', 'refreshToken',
            'secret', 'privateKey', 'encryptedPassword'
        ];

        // Check custom excludeFields
        const excluded = [
            ...defaultExcluded,
            ...(modelConfig?.excludeFields || [])
        ];

        return !excluded.includes(fieldName);
    }

    /**
     * Generate filter definitions based on model fields
     */
    private generateFilterDefinitions(
        modelName: string,
        fields: Fields,
        modelConfig: ModelFiltersConfig | undefined
    ): Array<{
        name: string;
        description: string;
        conditions: FilterCondition[];
        icon?: string;
        color?: string;
    }> {
        const definitions: Array<{
            name: string;
            description: string;
            conditions: FilterCondition[];
            icon?: string;
            color?: string;
        }> = [];

        const prefix = modelConfig?.autoFilterPrefix ?? 'Auto: ';
        const modelTitle = this.getModelTitle(modelName);

        // 1. "All" filter (no conditions)
        definitions.push({
            name: `${prefix}All ${modelTitle}`,
            description: `Show all records in ${modelTitle}`,
            conditions: [],
            icon: 'list',
            color: '#6366f1'
        });

        // 2. Generate field-specific filters
        for (const [fieldName, field] of Object.entries(fields)) {
            if (!this.shouldIncludeField(fieldName, modelConfig)) {
                continue;
            }

            const fieldConfig = field.config;
            const fieldType = typeof fieldConfig === 'object' ? fieldConfig.type : undefined;
            const fieldTitle = typeof fieldConfig === 'object' ? (fieldConfig.title || fieldName) : fieldName;

            // Generate filters based on field type
            const fieldFilters = this.generateFiltersForFieldType(
                fieldName,
                fieldTitle,
                fieldType,
                prefix,
                modelTitle
            );

            definitions.push(...fieldFilters);
        }

        return definitions;
    }

    /**
     * Generate filter definitions for a specific field type
     */
    private generateFiltersForFieldType(
        fieldName: string,
        fieldTitle: string,
        fieldType: string | undefined,
        prefix: string,
        modelTitle: string
    ): Array<{
        name: string;
        description: string;
        conditions: FilterCondition[];
        icon?: string;
        color?: string;
    }> {
        const filters: Array<{
            name: string;
            description: string;
            conditions: FilterCondition[];
            icon?: string;
            color?: string;
        }> = [];

        switch (fieldType) {
            case 'boolean':
                // True filter
                filters.push({
                    name: `${prefix}${fieldTitle} = Yes`,
                    description: `${modelTitle} where ${fieldTitle} is true`,
                    conditions: [{
                        id: crypto.randomUUID(),
                        field: fieldName,
                        operator: 'eq' as FilterOperator,
                        value: true
                    }],
                    icon: 'check_circle',
                    color: '#22c55e'
                });
                // False filter
                filters.push({
                    name: `${prefix}${fieldTitle} = No`,
                    description: `${modelTitle} where ${fieldTitle} is false`,
                    conditions: [{
                        id: crypto.randomUUID(),
                        field: fieldName,
                        operator: 'eq' as FilterOperator,
                        value: false
                    }],
                    icon: 'cancel',
                    color: '#ef4444'
                });
                break;

            case 'date':
            case 'datetime':
                // Today
                filters.push({
                    name: `${prefix}${fieldTitle} Today`,
                    description: `${modelTitle} where ${fieldTitle} is today`,
                    conditions: [{
                        id: crypto.randomUUID(),
                        field: fieldName,
                        operator: 'between' as FilterOperator,
                        value: { start: '$TODAY_START', end: '$TODAY_END' }
                    }],
                    icon: 'today',
                    color: '#3b82f6'
                });
                // This week
                filters.push({
                    name: `${prefix}${fieldTitle} This Week`,
                    description: `${modelTitle} where ${fieldTitle} is this week`,
                    conditions: [{
                        id: crypto.randomUUID(),
                        field: fieldName,
                        operator: 'between' as FilterOperator,
                        value: { start: '$WEEK_START', end: '$WEEK_END' }
                    }],
                    icon: 'date_range',
                    color: '#8b5cf6'
                });
                // This month
                filters.push({
                    name: `${prefix}${fieldTitle} This Month`,
                    description: `${modelTitle} where ${fieldTitle} is this month`,
                    conditions: [{
                        id: crypto.randomUUID(),
                        field: fieldName,
                        operator: 'between' as FilterOperator,
                        value: { start: '$MONTH_START', end: '$MONTH_END' }
                    }],
                    icon: 'calendar_month',
                    color: '#f59e0b'
                });
                break;

            case 'integer':
            case 'number':
            case 'float':
                // Is null
                filters.push({
                    name: `${prefix}${fieldTitle} Empty`,
                    description: `${modelTitle} where ${fieldTitle} is empty/null`,
                    conditions: [{
                        id: crypto.randomUUID(),
                        field: fieldName,
                        operator: 'isNull' as FilterOperator,
                        value: null
                    }],
                    icon: 'filter_alt_off',
                    color: '#64748b'
                });
                // Is not null
                filters.push({
                    name: `${prefix}${fieldTitle} Has Value`,
                    description: `${modelTitle} where ${fieldTitle} has a value`,
                    conditions: [{
                        id: crypto.randomUUID(),
                        field: fieldName,
                        operator: 'isNotNull' as FilterOperator,
                        value: null
                    }],
                    icon: 'filter_alt',
                    color: '#0ea5e9'
                });
                break;

            case 'string':
            case 'text':
            case 'longtext':
            case 'mediumtext':
            case 'email':
                // Not empty
                filters.push({
                    name: `${prefix}${fieldTitle} Not Empty`,
                    description: `${modelTitle} where ${fieldTitle} is not empty`,
                    conditions: [{
                        id: crypto.randomUUID(),
                        field: fieldName,
                        operator: 'isNotNull' as FilterOperator,
                        value: null
                    }],
                    icon: 'text_fields',
                    color: '#14b8a6'
                });
                // Empty
                filters.push({
                    name: `${prefix}${fieldTitle} Empty`,
                    description: `${modelTitle} where ${fieldTitle} is empty`,
                    conditions: [{
                        id: crypto.randomUUID(),
                        field: fieldName,
                        operator: 'isNull' as FilterOperator,
                        value: null
                    }],
                    icon: 'text_decrease',
                    color: '#64748b'
                });
                break;

            case 'select':
                // Generate a filter template for select fields
                // Actual values would need to be populated from field config
                filters.push({
                    name: `${prefix}${fieldTitle} Filter`,
                    description: `Filter ${modelTitle} by ${fieldTitle}`,
                    conditions: [{
                        id: crypto.randomUUID(),
                        field: fieldName,
                        operator: 'eq' as FilterOperator,
                        value: '' // Placeholder - user should set value
                    }],
                    icon: 'filter_list',
                    color: '#ec4899'
                });
                break;

            default:
                // For unknown types, create a basic isNotNull filter
                if (fieldType && !['password', 'binary', 'json', 'jsoneditor', 'object', 'array'].includes(fieldType)) {
                    filters.push({
                        name: `${prefix}${fieldTitle} Has Value`,
                        description: `${modelTitle} where ${fieldTitle} has a value`,
                        conditions: [{
                            id: crypto.randomUUID(),
                            field: fieldName,
                            operator: 'isNotNull' as FilterOperator,
                            value: null
                        }],
                        icon: 'filter_alt',
                        color: '#6b7280'
                    });
                }
                break;
        }

        return filters;
    }

    /**
     * Get model title from config or format model name
     */
    private getModelTitle(modelName: string): string {
        const entity = this.getEntityByModelName(modelName);
        if (entity?.config?.title) {
            return entity.config.title;
        }
        // Convert camelCase/PascalCase to title case
        return modelName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    /**
     * Generate and save auto-filters for a model
     *
     * @param modelName - Name of the model
     * @param systemUser - System user to own the filters
     * @param options - Generation options
     * @returns Created filters
     */
    async generateFiltersForModel(
        modelName: string,
        systemUser: UserAP,
        options: {
            force?: boolean; // Regenerate even if filters exist
            dryRun?: boolean; // Don't save, just return definitions
        } = {}
    ): Promise<{
        generated: FilterAP[];
        skipped: string[];
        errors: string[];
    }> {
        const result: {
            generated: FilterAP[];
            skipped: string[];
            errors: string[];
        } = {
            generated: [],
            skipped: [],
            errors: []
        };

        // Check if auto-generate is enabled
        if (!this.isAutoGenerateEnabled(modelName)) {
            result.errors.push(`Auto-generate filters is not enabled for model '${modelName}'`);
            return result;
        }

        // Get model entity and fields
        const entity = this.getEntityByModelName(modelName);
        if (!entity || !entity.model) {
            result.errors.push(`Model '${modelName}' not found`);
            return result;
        }

        // Create DataAccessor to get fields
        const dataAccessor = new DataAccessor(this.adminizer, systemUser, entity, 'list');
        const fields = dataAccessor.getFieldsConfig();

        if (!fields || Object.keys(fields).length === 0) {
            result.errors.push(`No fields found for model '${modelName}'`);
            return result;
        }

        // Get model filter config
        const modelConfig = this.getModelFilterConfig(modelName);

        // Generate filter definitions
        const definitions = this.generateFilterDefinitions(modelName, fields, modelConfig);

        if (options.dryRun) {
            // Return definitions without saving
            for (const def of definitions) {
                result.generated.push({
                    id: crypto.randomUUID(),
                    name: def.name,
                    description: def.description,
                    modelName,
                    slug: this.generateSlugFromName(def.name),
                    conditions: def.conditions,
                    visibility: 'system',
                    owner: systemUser.id,
                    isSystemFilter: true,
                    apiEnabled: false,
                    icon: def.icon,
                    color: def.color,
                    version: CURRENT_FILTER_VERSION,
                    createdAt: new Date(),
                    updatedAt: new Date()
                } as FilterAP);
            }
            return result;
        }

        // Check existing auto-generated filters
        const existingFilters = await this.getAutoGeneratedFilters(modelName);
        const existingNames = new Set(existingFilters.map(f => f.name));

        // Create filters
        for (const def of definitions) {
            try {
                // Skip if already exists (unless force)
                if (!options.force && existingNames.has(def.name)) {
                    result.skipped.push(def.name);
                    continue;
                }

                // Delete existing filter if force regenerate
                if (options.force) {
                    const existing = existingFilters.find(f => f.name === def.name);
                    if (existing) {
                        await this.deleteFilter(existing.id, systemUser);
                    }
                }

                // Create new filter
                const filter = await this.createFilter({
                    name: def.name,
                    description: def.description,
                    modelName,
                    slug: this.generateSlugFromName(def.name),
                    conditions: def.conditions,
                    visibility: 'system',
                    isSystemFilter: true,
                    apiEnabled: false,
                    icon: def.icon,
                    color: def.color,
                    version: CURRENT_FILTER_VERSION
                }, systemUser);

                result.generated.push(filter);
            } catch (error: any) {
                result.errors.push(`Failed to create filter '${def.name}': ${error?.message || error}`);
            }
        }

        return result;
    }

    /**
     * Get all auto-generated filters for a model
     */
    async getAutoGeneratedFilters(modelName: string): Promise<FilterAP[]> {
        const filterModel = this.adminizer.modelHandler.model.get('filterap');
        if (!filterModel) {
            return [];
        }

        const filters = await filterModel["_find"]({
            modelName,
            isSystemFilter: true,
            visibility: 'system'
        }) as FilterAP[];

        return filters;
    }

    /**
     * Generate slug from filter name
     */
    private generateSlugFromName(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 100);
    }

    /**
     * Ensure auto-generated filters exist for a model
     * Called when accessing filters for a model
     */
    async ensureAutoFiltersExist(
        modelName: string,
        systemUser: UserAP
    ): Promise<void> {
        if (!this.isAutoGenerateEnabled(modelName)) {
            return;
        }

        const existingFilters = await this.getAutoGeneratedFilters(modelName);

        // If no auto-filters exist, generate them
        if (existingFilters.length === 0) {
            try {
                await this.generateFiltersForModel(modelName, systemUser);
                Adminizer.log.info(`Auto-generated filters for model '${modelName}'`);
            } catch (error: any) {
                Adminizer.log.warn(
                    `Failed to auto-generate filters for model '${modelName}': ${error?.message || error}`
                );
            }
        }
    }

    /**
     * Delete all auto-generated filters for a model
     */
    async deleteAutoGeneratedFilters(
        modelName: string,
        systemUser: UserAP
    ): Promise<{ deleted: number; errors: string[] }> {
        const result = { deleted: 0, errors: [] as string[] };

        const filters = await this.getAutoGeneratedFilters(modelName);

        for (const filter of filters) {
            try {
                await this.deleteFilter(filter.id, systemUser);
                result.deleted++;
            } catch (error: any) {
                result.errors.push(`Failed to delete filter '${filter.name}': ${error?.message || error}`);
            }
        }

        return result;
    }

    /**
     * Regenerate all auto-filters for a model
     */
    async regenerateAutoFilters(
        modelName: string,
        systemUser: UserAP
    ): Promise<{
        generated: FilterAP[];
        skipped: string[];
        errors: string[];
    }> {
        return this.generateFiltersForModel(modelName, systemUser, { force: true });
    }
}

export default FilterService;
