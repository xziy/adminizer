import { Adminizer } from '../../lib/Adminizer';
import { FilterService } from '../../lib/filters/FilterService';
import { ConditionValidator } from '../../lib/filters/ConditionValidator';
import { ModernQueryBuilder, QueryParams } from '../../lib/query-builder/ModernQueryBuilder';
import { DataAccessor } from '../../lib/DataAccessor';
import { ControllerHelper } from '../../helpers/controllerHelper';
import { FilterAP, FilterCondition } from '../../models/FilterAP';
import { Entity } from '../../interfaces/types';

/**
 * FilterController - REST API for filter management
 *
 * Endpoints:
 * - GET /adminizer/filters - list filters for model
 * - GET /adminizer/filters/:id - get single filter
 * - POST /adminizer/filters - create filter
 * - PATCH /adminizer/filters/:id - update filter
 * - DELETE /adminizer/filters/:id - delete filter
 * - POST /adminizer/filters/preview - preview filter without saving
 * - GET /adminizer/filters/:id/count - get result count for widget
 * - GET /adminizer/filter/:id - direct link (redirect to list)
 */
export class FilterController {
    /**
     * Get Entity object by model name
     */
    private static getEntityByModelName(req: ReqType, modelName: string): Entity | null {
        const config = ControllerHelper.findModelConfig(req, modelName);
        if (!config) {
            return null;
        }

        const model = req.adminizer.modelHandler.model.get(config.model);
        if (!model) {
            return null;
        }

        return {
            name: modelName,
            config,
            model,
            uri: `${req.adminizer.config.routePrefix}/model/${modelName}`,
            type: 'model'
        };
    }

    /**
     * Check auth and return user or send error
     */
    private static checkAuth(req: ReqType, res: ResType): boolean {
        if (req.adminizer.config.auth?.enable && !req.user) {
            res.status(401).json({
                success: false,
                error: 'Unauthorized'
            });
            return false;
        }
        return true;
    }

    /**
     * GET /adminizer/filters
     * List filters for a model
     */
    static async list(req: ReqType, res: ResType): Promise<ResType | void> {
        if (!FilterController.checkAuth(req, res)) return;

        try {
            const filterService = new FilterService(req.adminizer);

            // Check if filters are globally enabled
            if (!filterService.isFiltersEnabled()) {
                return res.json({
                    success: true,
                    filtersEnabled: false,
                    data: [],
                    meta: { total: 0, page: 1, pages: 0 }
                });
            }

            const modelName = req.query.modelName?.toString();
            const includeSystem = req.query.includeSystem === 'true';
            const page = Math.max(1, parseInt(req.query.page?.toString() || '1', 10));
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit?.toString() || '50', 10)));

            // Check model-specific filters
            if (modelName && !filterService.isFiltersEnabledForModel(modelName)) {
                return res.json({
                    success: true,
                    filtersEnabled: false,
                    useLegacySearch: filterService.shouldUseLegacySearch(modelName),
                    data: [],
                    meta: { total: 0, page: 1, pages: 0 }
                });
            }

            const filters = await filterService.getFiltersForModel(
                modelName || '',
                req.user,
                {
                    includePublic: true,
                    includeSystem
                }
            );

            // Manual pagination
            const total = filters.length;
            const pages = Math.ceil(total / limit);
            const start = (page - 1) * limit;
            const paginatedFilters = filters.slice(start, start + limit);

            return res.json({
                success: true,
                filtersEnabled: true,
                data: paginatedFilters.map(f => ({
                    id: f.id,
                    name: f.name,
                    slug: f.slug,
                    description: f.description,
                    modelName: f.modelName,
                    icon: f.icon,
                    color: f.color,
                    isPinned: f.isPinned,
                    visibility: f.visibility,
                    isSystemFilter: f.isSystemFilter,
                    createdAt: f.createdAt,
                    updatedAt: f.updatedAt
                })),
                meta: {
                    total,
                    page,
                    limit,
                    pages
                }
            });
        } catch (error: any) {
            Adminizer.log.error('FilterController.list error:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * GET /adminizer/filters/:id
     * Get single filter by ID (UUID string)
     */
    static async get(req: ReqType, res: ResType): Promise<ResType | void> {
        if (!FilterController.checkAuth(req, res)) return;

        try {
            const filterService = new FilterService(req.adminizer);
            const filterId = req.params.id; // UUID string - don't parse!

            const filter = await filterService.getFilterById(filterId, req.user);

            if (!filter) {
                return res.status(404).json({
                    success: false,
                    error: 'Filter not found'
                });
            }

            // Check view access
            if (!filterService.canViewFilter(filter, req.user)) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied'
                });
            }

            return res.json({
                success: true,
                data: filter
            });
        } catch (error: any) {
            Adminizer.log.error('FilterController.get error:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * POST /adminizer/filters/preview
     * Preview filter results WITHOUT saving
     */
    static async preview(req: ReqType, res: ResType): Promise<ResType | void> {
        if (!FilterController.checkAuth(req, res)) return;

        try {
            const filterService = new FilterService(req.adminizer);
            const {
                modelName,
                conditions,
                page = 1,
                limit = 25,
                sort,
                sortDirection
            } = req.body;

            // Validate required fields
            if (!modelName) {
                return res.status(400).json({
                    success: false,
                    error: 'modelName is required'
                });
            }

            // Check if filters are enabled for model
            if (!filterService.isFiltersEnabledForModel(modelName)) {
                return res.status(403).json({
                    success: false,
                    error: `Filters are disabled for model ${modelName}`,
                    filtersEnabled: false,
                    useLegacySearch: filterService.shouldUseLegacySearch(modelName)
                });
            }

            // Get entity
            const entity = FilterController.getEntityByModelName(req, modelName);
            if (!entity || !entity.model) {
                return res.status(404).json({
                    success: false,
                    error: `Model '${modelName}' not found`
                });
            }

            // Validate conditions (including rawSQL protection)
            if (conditions && conditions.length > 0) {
                const dataAccessor = new DataAccessor(req.adminizer, req.user, entity, 'list');
                const fields = dataAccessor.getFieldsConfig();
                const fieldsConfig = Object.fromEntries(
                    Object.entries(fields).map(([key, field]: [string, any]) => [
                        key,
                        { type: field.model?.type || 'string' }
                    ])
                );

                const validator = new ConditionValidator(fieldsConfig);

                // Check for rawSQL in conditions (admin-only)
                const hasRawSQL = FilterController.checkRawSQL(conditions);
                if (hasRawSQL && !req.user?.isAdministrator) {
                    return res.status(403).json({
                        success: false,
                        error: 'Raw SQL conditions are only allowed for administrators'
                    });
                }

                const validation = validator.validate(conditions);
                if (!validation.valid) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid filter conditions',
                        validation
                    });
                }
            }

            // Execute query
            const dataAccessor = new DataAccessor(req.adminizer, req.user, entity, 'list');
            const fields = dataAccessor.getFieldsConfig();

            const queryParams: QueryParams = {
                page: Math.max(1, page),
                limit: Math.min(100, Math.max(1, limit)),
                sort: sort || undefined,
                sortDirection: sortDirection || 'DESC',
                filters: conditions || []
            };

            const queryBuilder = new ModernQueryBuilder(entity.model, fields, dataAccessor);
            const result = await queryBuilder.execute(queryParams);

            return res.json({
                success: true,
                data: result.data,
                meta: {
                    total: result.total,
                    filtered: result.filtered,
                    page: result.page,
                    pages: result.pages,
                    limit
                }
            });
        } catch (error: any) {
            Adminizer.log.error('FilterController.preview error:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * POST /adminizer/filters
     * Create new filter
     */
    static async create(req: ReqType, res: ResType): Promise<ResType | void> {
        if (!FilterController.checkAuth(req, res)) return;

        try {
            const filterService = new FilterService(req.adminizer);
            const {
                name,
                description,
                modelName,
                slug,
                conditions,
                sortField,
                sortDirection,
                visibility,
                groupIds,
                apiEnabled,
                icon,
                color,
                isPinned,
                isSystemFilter
            } = req.body;

            // Validate required fields
            if (!name || !modelName) {
                return res.status(400).json({
                    success: false,
                    error: 'name and modelName are required'
                });
            }

            // Check if filters are enabled for model
            if (!filterService.isFiltersEnabledForModel(modelName)) {
                return res.status(403).json({
                    success: false,
                    error: `Filters are disabled for model ${modelName}`,
                    filtersEnabled: false
                });
            }

            // Validate conditions
            if (conditions && conditions.length > 0) {
                // Check for rawSQL (admin-only)
                const hasRawSQL = FilterController.checkRawSQL(conditions);
                if (hasRawSQL && !req.user?.isAdministrator) {
                    return res.status(403).json({
                        success: false,
                        error: 'Raw SQL conditions are only allowed for administrators'
                    });
                }

                // Get entity for validation
                const entity = FilterController.getEntityByModelName(req, modelName);
                if (entity && entity.model) {
                    const dataAccessor = new DataAccessor(req.adminizer, req.user, entity, 'list');
                    const fields = dataAccessor.getFieldsConfig();
                    const fieldsConfig = Object.fromEntries(
                        Object.entries(fields).map(([key, field]: [string, any]) => [
                            key,
                            { type: field.model?.type || 'string' }
                        ])
                    );

                    const validator = new ConditionValidator(fieldsConfig);
                    const validation = validator.validate(conditions);

                    if (!validation.valid) {
                        return res.status(400).json({
                            success: false,
                            error: 'Invalid filter conditions',
                            validation
                        });
                    }
                }
            }

            // Generate slug if not provided
            let filterSlug = slug;
            if (!filterSlug) {
                filterSlug = await FilterController.generateSlug(name, filterService);
            }

            // Create filter
            const filter = await filterService.createFilter({
                name,
                description,
                modelName,
                slug: filterSlug,
                conditions: conditions || [],
                sortField,
                sortDirection,
                visibility: visibility || 'private',
                groupIds,
                apiEnabled: apiEnabled || false,
                icon,
                color,
                isPinned: isPinned || false,
                isSystemFilter: isSystemFilter || false
            }, req.user);

            // Build direct link
            const directLink = `${req.adminizer.config.routePrefix}/filter/${filter.id}`;

            return res.status(201).json({
                success: true,
                data: filter,
                directLink
            });
        } catch (error: any) {
            Adminizer.log.error('FilterController.create error:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * PATCH /adminizer/filters/:id
     * Update filter
     */
    static async update(req: ReqType, res: ResType): Promise<ResType | void> {
        if (!FilterController.checkAuth(req, res)) return;

        try {
            const filterService = new FilterService(req.adminizer);
            const filterId = req.params.id; // UUID string

            const {
                name,
                description,
                slug,
                conditions,
                sortField,
                sortDirection,
                visibility,
                groupIds,
                apiEnabled,
                icon,
                color,
                isPinned,
                isSystemFilter
            } = req.body;

            // Check filter exists
            const existingFilter = await filterService.getFilterById(filterId, req.user);
            if (!existingFilter) {
                return res.status(404).json({
                    success: false,
                    error: 'Filter not found'
                });
            }

            // Check edit access
            if (!filterService.canEditFilter(existingFilter, req.user)) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied'
                });
            }

            // Validate conditions if provided
            if (conditions && conditions.length > 0) {
                // Check for rawSQL (admin-only)
                const hasRawSQL = FilterController.checkRawSQL(conditions);
                if (hasRawSQL && !req.user?.isAdministrator) {
                    return res.status(403).json({
                        success: false,
                        error: 'Raw SQL conditions are only allowed for administrators'
                    });
                }
            }

            // Build update data
            const updateData: Partial<FilterAP> = {};
            if (name !== undefined) updateData.name = name;
            if (description !== undefined) updateData.description = description;
            if (slug !== undefined) updateData.slug = slug;
            if (conditions !== undefined) updateData.conditions = conditions;
            if (sortField !== undefined) updateData.sortField = sortField;
            if (sortDirection !== undefined) updateData.sortDirection = sortDirection;
            if (visibility !== undefined) updateData.visibility = visibility;
            if (groupIds !== undefined) updateData.groupIds = groupIds;
            if (apiEnabled !== undefined) updateData.apiEnabled = apiEnabled;
            if (icon !== undefined) updateData.icon = icon;
            if (color !== undefined) updateData.color = color;
            if (isPinned !== undefined) updateData.isPinned = isPinned;
            if (isSystemFilter !== undefined) updateData.isSystemFilter = isSystemFilter;

            const filter = await filterService.updateFilter(filterId, updateData, req.user);

            return res.json({
                success: true,
                data: filter
            });
        } catch (error: any) {
            Adminizer.log.error('FilterController.update error:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * DELETE /adminizer/filters/:id
     * Delete filter
     */
    static async remove(req: ReqType, res: ResType): Promise<ResType | void> {
        if (!FilterController.checkAuth(req, res)) return;

        try {
            const filterService = new FilterService(req.adminizer);
            const filterId = req.params.id; // UUID string

            // Check filter exists
            const existingFilter = await filterService.getFilterById(filterId, req.user);
            if (!existingFilter) {
                return res.status(404).json({
                    success: false,
                    error: 'Filter not found'
                });
            }

            // Check delete access
            if (!filterService.canDeleteFilter(existingFilter, req.user)) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied'
                });
            }

            await filterService.deleteFilter(filterId, req.user);

            return res.json({
                success: true
            });
        } catch (error: any) {
            Adminizer.log.error('FilterController.remove error:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * GET /adminizer/filters/:id/count
     * Get result count for dashboard widget
     */
    static async count(req: ReqType, res: ResType): Promise<ResType | void> {
        if (!FilterController.checkAuth(req, res)) return;

        try {
            const filterService = new FilterService(req.adminizer);
            const filterId = req.params.id; // UUID string

            const filter = await filterService.getFilterById(filterId, req.user);
            if (!filter) {
                return res.status(404).json({
                    success: false,
                    error: 'Filter not found'
                });
            }

            // Check view access
            if (!filterService.canViewFilter(filter, req.user)) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied'
                });
            }

            // Get entity
            const entity = FilterController.getEntityByModelName(req, filter.modelName);
            if (!entity || !entity.model) {
                return res.status(404).json({
                    success: false,
                    error: `Model '${filter.modelName}' not found`
                });
            }

            // Execute count query
            const dataAccessor = new DataAccessor(req.adminizer, req.user, entity, 'list');
            const fields = dataAccessor.getFieldsConfig();

            const queryParams: QueryParams = {
                page: 1,
                limit: 1, // We only need count
                filters: filter.conditions || []
            };

            const queryBuilder = new ModernQueryBuilder(entity.model, fields, dataAccessor);
            const result = await queryBuilder.execute(queryParams);

            return res.json({
                success: true,
                count: result.filtered
            });
        } catch (error: any) {
            Adminizer.log.error('FilterController.count error:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * GET /adminizer/filter/:id
     * Direct link - redirect to list with filter applied
     */
    static async directLink(req: ReqType, res: ResType): Promise<ResType | void> {
        if (!FilterController.checkAuth(req, res)) return;

        try {
            const filterService = new FilterService(req.adminizer);
            const filterId = req.params.id; // UUID string

            const filter = await filterService.getFilterById(filterId, req.user);
            if (!filter) {
                return res.status(404).json({
                    success: false,
                    error: 'Filter not found'
                });
            }

            // Check view access
            if (!filterService.canViewFilter(filter, req.user)) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied'
                });
            }

            // Redirect to list with filter applied
            const prefix = req.adminizer.config.routePrefix;
            return res.redirect(`${prefix}/model/${filter.modelName}?filterId=${filter.id}`);
        } catch (error: any) {
            Adminizer.log.error('FilterController.directLink error:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * GET /adminizer/filter/by-slug/:slug
     * Direct link by slug - redirect to list with filter applied
     */
    static async directLinkBySlug(req: ReqType, res: ResType): Promise<ResType | void> {
        if (!FilterController.checkAuth(req, res)) return;

        try {
            const filterService = new FilterService(req.adminizer);
            const slug = req.params.slug;

            const filter = await filterService.getFilterBySlug(slug);
            if (!filter) {
                return res.status(404).json({
                    success: false,
                    error: 'Filter not found'
                });
            }

            // Check view access
            if (!filterService.canViewFilter(filter, req.user)) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied'
                });
            }

            // Redirect to list with filter applied
            const prefix = req.adminizer.config.routePrefix;
            return res.redirect(`${prefix}/model/${filter.modelName}?filterId=${filter.id}`);
        } catch (error: any) {
            Adminizer.log.error('FilterController.directLinkBySlug error:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * GET /adminizer/filters/:id/columns
     * Get columns configuration for a filter
     */
    static async getColumns(req: ReqType, res: ResType): Promise<ResType | void> {
        if (!FilterController.checkAuth(req, res)) return;

        try {
            const filterService = new FilterService(req.adminizer);
            const filterId = req.params.id;

            const filter = await filterService.getFilterById(filterId, req.user);
            if (!filter) {
                return res.status(404).json({
                    success: false,
                    error: 'Filter not found'
                });
            }

            if (!filterService.canViewFilter(filter, req.user)) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied'
                });
            }

            const columns = await filterService.getFilterColumns(filterId);

            return res.json({
                success: true,
                data: columns
            });
        } catch (error: any) {
            Adminizer.log.error('FilterController.getColumns error:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * PUT /adminizer/filters/:id/columns
     * Update columns configuration for a filter (replaces all)
     */
    static async updateColumns(req: ReqType, res: ResType): Promise<ResType | void> {
        if (!FilterController.checkAuth(req, res)) return;

        try {
            const filterService = new FilterService(req.adminizer);
            const filterId = req.params.id;
            const { columns } = req.body;

            if (!Array.isArray(columns)) {
                return res.status(400).json({
                    success: false,
                    error: 'columns must be an array'
                });
            }

            // Validate column structure
            for (const col of columns) {
                if (!col.fieldName || typeof col.fieldName !== 'string') {
                    return res.status(400).json({
                        success: false,
                        error: 'Each column must have a fieldName'
                    });
                }
            }

            const updatedColumns = await filterService.updateFilterColumns(
                filterId,
                columns,
                req.user
            );

            return res.json({
                success: true,
                data: updatedColumns
            });
        } catch (error: any) {
            Adminizer.log.error('FilterController.updateColumns error:', error);

            if (error.message?.includes('not found') || error.message?.includes('Access denied')) {
                return res.status(error.message.includes('not found') ? 404 : 403).json({
                    success: false,
                    error: error.message
                });
            }

            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Check if conditions contain rawSQL (recursively)
     */
    private static checkRawSQL(conditions: FilterCondition[]): boolean {
        for (const condition of conditions) {
            if (condition.rawSQL) {
                return true;
            }
            if (condition.children && condition.children.length > 0) {
                if (FilterController.checkRawSQL(condition.children)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Generate unique slug with retry
     */
    private static async generateSlug(
        name: string,
        filterService: FilterService,
        maxRetries: number = 5
    ): Promise<string> {
        const base = name
            .toLowerCase()
            .replace(/[^a-z0-9а-яё]+/gi, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 100);

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            const slug = attempt === 0
                ? base
                : `${base}-${Date.now()}-${attempt}`;

            const existing = await filterService.getFilterBySlug(slug);
            if (!existing) {
                return slug;
            }
        }

        // Fallback: UUID-based slug
        return `${base}-${crypto.randomUUID().slice(0, 8)}`;
    }
}

export default FilterController;
