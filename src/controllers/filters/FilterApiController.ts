import { Adminizer } from '../../lib/Adminizer';
import { ModernQueryBuilder, QueryParams } from '../../lib/query-builder/ModernQueryBuilder';
import { DataAccessor } from '../../lib/DataAccessor';
import { ControllerHelper } from '../../helpers/controllerHelper';
import { FilterAP } from '../../models/FilterAP';
import { Entity } from '../../interfaces/types';

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
    windowMs: number;       // Time window in milliseconds
    maxRequests: number;    // Max requests per window
}

/**
 * Simple in-memory rate limiter
 */
class RateLimiter {
    private requests: Map<string, number[]> = new Map();
    private config: RateLimitConfig;

    constructor(config: RateLimitConfig) {
        this.config = config;
    }

    /**
     * Check if request is allowed
     */
    isAllowed(key: string): boolean {
        const now = Date.now();
        const windowStart = now - this.config.windowMs;

        // Get existing requests for this key
        let timestamps = this.requests.get(key) || [];

        // Filter out old requests
        timestamps = timestamps.filter(t => t > windowStart);

        // Check limit
        if (timestamps.length >= this.config.maxRequests) {
            return false;
        }

        // Add current request
        timestamps.push(now);
        this.requests.set(key, timestamps);

        return true;
    }

    /**
     * Get remaining requests
     */
    getRemaining(key: string): number {
        const now = Date.now();
        const windowStart = now - this.config.windowMs;
        const timestamps = (this.requests.get(key) || []).filter(t => t > windowStart);
        return Math.max(0, this.config.maxRequests - timestamps.length);
    }

    /**
     * Get reset time in seconds
     */
    getResetTime(key: string): number {
        const timestamps = this.requests.get(key) || [];
        if (timestamps.length === 0) return 0;
        const oldest = Math.min(...timestamps);
        return Math.ceil((oldest + this.config.windowMs - Date.now()) / 1000);
    }
}

// Default rate limiter: 100 requests per minute
const defaultRateLimiter = new RateLimiter({
    windowMs: 60000,
    maxRequests: 100
});

/**
 * API response formats
 */
export type ApiFormat = 'json' | 'atom' | 'rss';

/**
 * FilterApiController - Public API for filter data access
 *
 * Endpoints:
 * - GET /api/filter/:apiKey - JSON data
 * - GET /api/filter/:apiKey.json - JSON data (explicit)
 * - GET /api/filter/:apiKey.atom - Atom feed
 * - GET /api/filter/:apiKey.rss - RSS feed (alias for Atom)
 *
 * Authentication: via apiKey in URL
 * Rate limiting: 100 requests/minute per apiKey
 */
export class FilterApiController {
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
     * GET /api/filter/:apiKey
     * GET /api/filter/:apiKey.json
     * Main JSON API endpoint
     */
    static async getJSON(req: ReqType, res: ResType) {
        const format = FilterApiController.extractFormat(req.params.apiKey) || 'json';

        // Route to appropriate handler
        if (format === 'atom' || format === 'rss') {
            return FilterApiController.getAtom(req, res);
        }

        return FilterApiController.handleRequest(req, res, 'json');
    }

    /**
     * GET /api/filter/:apiKey.atom
     * GET /api/filter/:apiKey.rss
     * Atom/RSS feed endpoint
     */
    static async getAtom(req: ReqType, res: ResType) {
        return FilterApiController.handleRequest(req, res, 'atom');
    }

    /**
     * Common request handler
     */
    private static async handleRequest(req: ReqType, res: ResType, format: ApiFormat) {
        const apiKey = FilterApiController.extractApiKey(req.params.apiKey);

        // Rate limiting
        if (!defaultRateLimiter.isAllowed(apiKey)) {
            res.setHeader('X-RateLimit-Remaining', '0');
            res.setHeader('X-RateLimit-Reset', defaultRateLimiter.getResetTime(apiKey).toString());
            return res.status(429).json({
                success: false,
                error: 'Rate limit exceeded. Please try again later.'
            });
        }

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', '100');
        res.setHeader('X-RateLimit-Remaining', defaultRateLimiter.getRemaining(apiKey).toString());

        try {
            // Find filter by apiKey
            const filter = await FilterApiController.getFilterByApiKey(req.adminizer, apiKey);

            if (!filter) {
                return res.status(404).json({
                    success: false,
                    error: 'Filter not found or API access disabled'
                });
            }

            // Check if API is enabled for this filter
            if (!filter.apiEnabled) {
                return res.status(403).json({
                    success: false,
                    error: 'API access is disabled for this filter'
                });
            }

            // Get entity
            const entity = FilterApiController.getEntityByModelName(req, filter.modelName);
            if (!entity || !entity.model) {
                return res.status(404).json({
                    success: false,
                    error: `Model '${filter.modelName}' not found`
                });
            }

            // Parse pagination
            const page = Math.max(1, parseInt(req.query.page?.toString() || '1', 10));
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit?.toString() || '25', 10)));

            // Setup data accessor (no user context for public API)
            const dataAccessor = new DataAccessor(req.adminizer, null as any, entity, 'list');
            const fields = dataAccessor.getFieldsConfig();

            // Build query
            const queryParams: QueryParams = {
                page,
                limit,
                sort: filter.sortField || 'createdAt',
                sortDirection: filter.sortDirection || 'DESC',
                filters: filter.conditions || [],
                fields: Array.isArray(filter.selectedFields) && filter.selectedFields.length > 0
                    ? filter.selectedFields
                    : undefined
            };

            // Execute query
            const queryBuilder = new ModernQueryBuilder(entity.model, fields, dataAccessor);
            const result = await queryBuilder.execute(queryParams);

            // Format response
            if (format === 'atom') {
                return FilterApiController.sendAtomResponse(req, res, filter, result, page, limit);
            }

            return FilterApiController.sendJSONResponse(req, res, filter, result, page, limit);

        } catch (error) {
            Adminizer.log.error('FilterApiController error:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    /**
     * Send JSON response
     */
    private static sendJSONResponse(
        req: ReqType,
        res: ResType,
        filter: FilterAP,
        result: any,
        page: number,
        limit: number
    ) {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const apiUrl = `${baseUrl}${req.adminizer.config.routePrefix}/api/filter/${filter.apiKey}`;

        res.setHeader('Content-Type', 'application/json; charset=utf-8');

        return res.json({
            success: true,
            filter: {
                name: filter.name,
                description: filter.description,
                modelName: filter.modelName,
                updatedAt: filter.updatedAt
            },
            data: result.data,
            pagination: {
                page: result.page,
                limit,
                total: result.filtered,
                pages: result.pages,
                hasNext: result.page < result.pages,
                hasPrev: result.page > 1
            },
            links: {
                self: `${apiUrl}?page=${page}&limit=${limit}`,
                first: `${apiUrl}?page=1&limit=${limit}`,
                last: `${apiUrl}?page=${result.pages}&limit=${limit}`,
                next: result.page < result.pages ? `${apiUrl}?page=${page + 1}&limit=${limit}` : null,
                prev: result.page > 1 ? `${apiUrl}?page=${page - 1}&limit=${limit}` : null
            }
        });
    }

    /**
     * Send Atom/RSS response
     */
    private static sendAtomResponse(
        req: ReqType,
        res: ResType,
        filter: FilterAP,
        result: any,
        page: number,
        limit: number
    ) {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const apiUrl = `${baseUrl}${req.adminizer.config.routePrefix}/api/filter/${filter.apiKey}`;
        const feedUrl = `${apiUrl}.atom?page=${page}&limit=${limit}`;
        const listUrl = `${baseUrl}${req.adminizer.config.routePrefix}/model/${filter.modelName}?filterId=${filter.id}`;

        res.setHeader('Content-Type', 'application/atom+xml; charset=utf-8');

        const entries = result.data.map((item: any, index: number) => {
            const itemId = item.id || item[Object.keys(item)[0]] || index;
            const itemTitle = item.name || item.title || item.subject || `Item #${itemId}`;
            const itemUpdated = item.updatedAt || item.createdAt || new Date().toISOString();
            const itemUrl = `${baseUrl}${req.adminizer.config.routePrefix}/model/${filter.modelName}/view/${itemId}`;

            // Build content from all fields
            const contentParts = Object.entries(item)
                .filter(([key]) => !['id', 'createdAt', 'updatedAt'].includes(key))
                .map(([key, value]) => {
                    const displayValue = value === null || value === undefined ? '' :
                        typeof value === 'object' ? JSON.stringify(value) : String(value);
                    return `<p><strong>${FilterApiController.escapeXml(key)}:</strong> ${FilterApiController.escapeXml(displayValue)}</p>`;
                })
                .join('\n');

            return `
    <entry>
        <id>${FilterApiController.escapeXml(itemUrl)}</id>
        <title>${FilterApiController.escapeXml(String(itemTitle))}</title>
        <link href="${FilterApiController.escapeXml(itemUrl)}" rel="alternate"/>
        <updated>${new Date(itemUpdated).toISOString()}</updated>
        <content type="html"><![CDATA[${contentParts}]]></content>
    </entry>`;
        }).join('\n');

        const atom = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
    <id>${FilterApiController.escapeXml(feedUrl)}</id>
    <title>${FilterApiController.escapeXml(filter.name)}</title>
    <subtitle>${FilterApiController.escapeXml(filter.description || '')}</subtitle>
    <link href="${FilterApiController.escapeXml(feedUrl)}" rel="self" type="application/atom+xml"/>
    <link href="${FilterApiController.escapeXml(listUrl)}" rel="alternate" type="text/html"/>
    <updated>${new Date(filter.updatedAt).toISOString()}</updated>
    <generator>Adminizer Filter API</generator>
    <link href="${FilterApiController.escapeXml(apiUrl)}?page=1&amp;limit=${limit}" rel="first"/>
    <link href="${FilterApiController.escapeXml(apiUrl)}?page=${result.pages}&amp;limit=${limit}" rel="last"/>
    ${result.page < result.pages ? `<link href="${FilterApiController.escapeXml(apiUrl)}?page=${page + 1}&amp;limit=${limit}" rel="next"/>` : ''}
    ${result.page > 1 ? `<link href="${FilterApiController.escapeXml(apiUrl)}?page=${page - 1}&amp;limit=${limit}" rel="prev"/>` : ''}
${entries}
</feed>`;

        return res.send(atom);
    }

    /**
     * Get filter by API key
     */
    private static async getFilterByApiKey(adminizer: Adminizer, apiKey: string): Promise<FilterAP | null> {
        const filterModel = adminizer.modelHandler.model.get('filterap');

        if (!filterModel) {
            return null;
        }

        const filter = await filterModel["_findOne"]({
            apiKey,
            apiEnabled: true
        });

        return filter as FilterAP | null;
    }

    /**
     * Extract API key from param (remove format extension)
     */
    private static extractApiKey(param: string): string {
        return param.replace(/\.(json|atom|rss)$/i, '');
    }

    /**
     * Extract format from param
     */
    private static extractFormat(param: string): ApiFormat | null {
        const match = param.match(/\.(json|atom|rss)$/i);
        if (!match) return null;

        const ext = match[1].toLowerCase();
        if (ext === 'rss') return 'atom'; // RSS -> Atom
        return ext as ApiFormat;
    }

    /**
     * Escape XML special characters
     */
    private static escapeXml(str: string): string {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    /**
     * Generate API key for a filter
     */
    static generateApiKey(): string {
        return crypto.randomUUID();
    }
}

export default FilterApiController;
