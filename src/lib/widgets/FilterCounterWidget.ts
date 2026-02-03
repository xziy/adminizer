import { InfoBase } from './abstractInfo';
import { FilterService } from '../filters/FilterService';
import { Adminizer } from '../Adminizer';
import { UserAP } from '../../models/UserAP';
import { MaterialIcon } from '../../interfaces/MaaterialIcons';

/**
 * Configuration options for FilterCounterWidget
 */
export interface FilterCounterWidgetOptions {
    /** Unique widget ID */
    id: string;

    /** Widget display name */
    name: string;

    /** Widget description */
    description?: string;

    /** Filter ID or slug to count */
    filterId: string;

    /** Whether filterId is a slug (default: false, means UUID) */
    isSlug?: boolean;

    /** Widget icon (Material icon name) */
    icon?: MaterialIcon | string;

    /** Widget background CSS color */
    backgroundCSS?: string;

    /** Department for access rights */
    department?: string;

    /** Widget size */
    size?: { h: number; w: number };

    /** Link type when clicking on widget */
    linkType?: 'self' | 'blank';

    /** Format function for the count display */
    formatCount?: (count: number) => string;

    /** Prefix text before count */
    prefix?: string;

    /** Suffix text after count */
    suffix?: string;

    /** Show "0" when count is zero, or show custom text */
    zeroText?: string;

    /** Error text when filter not found */
    errorText?: string;
}

/**
 * FilterCounterWidget - Dashboard widget that displays count of records matching a filter
 *
 * Usage:
 * ```typescript
 * const widget = new FilterCounterWidget(adminizer, user, {
 *     id: 'pending-orders',
 *     name: 'Pending Orders',
 *     filterId: 'pending-orders-filter',
 *     isSlug: true,
 *     icon: 'shopping_cart',
 *     backgroundCSS: '#ff9800'
 * });
 *
 * adminizer.widgetHandler.add(widget);
 * ```
 */
export class FilterCounterWidget extends InfoBase {
    public readonly id: string;
    public readonly name: string;
    public readonly description: string;
    public readonly icon: MaterialIcon | string;
    public readonly department: string;
    public readonly backgroundCSS: string;
    public readonly size: { h: number; w: number } | null;
    public readonly link: string;
    public readonly linkType: 'self' | 'blank';

    private readonly adminizer: Adminizer;
    private readonly user: UserAP;
    private readonly filterId: string;
    private readonly isSlug: boolean;
    private readonly formatCount: (count: number) => string;
    private readonly prefix: string;
    private readonly suffix: string;
    private readonly zeroText: string;
    private readonly errorText: string;

    constructor(adminizer: Adminizer, user: UserAP, options: FilterCounterWidgetOptions) {
        super();

        this.adminizer = adminizer;
        this.user = user;

        this.id = options.id;
        this.name = options.name;
        this.description = options.description || `Count of records for filter: ${options.filterId}`;
        this.filterId = options.filterId;
        this.isSlug = options.isSlug ?? false;
        this.icon = options.icon || 'filter_list';
        this.backgroundCSS = options.backgroundCSS || '#2196F3';
        this.department = options.department || 'filters';
        this.size = options.size || { h: 1, w: 1 };
        this.linkType = options.linkType || 'self';

        // Build link to filter
        const filterParam = this.isSlug ? `filterSlug=${this.filterId}` : `filterId=${this.filterId}`;
        this.link = `${adminizer.config.routePrefix}/model?${filterParam}`;

        // Formatting options
        this.formatCount = options.formatCount || ((count) => count.toLocaleString());
        this.prefix = options.prefix || '';
        this.suffix = options.suffix || '';
        this.zeroText = options.zeroText || '0';
        this.errorText = options.errorText || '-';
    }

    /**
     * Get the count as formatted string for display
     */
    public async getInfo(): Promise<string> {
        try {
            const filterService = new FilterService(this.adminizer);

            let filter;
            if (this.isSlug) {
                filter = await filterService.getFilterBySlug(this.filterId);
            } else {
                filter = await filterService.getFilterById(this.filterId, this.user);
            }

            if (!filter) {
                Adminizer.log.warn(`FilterCounterWidget: Filter '${this.filterId}' not found`);
                return this.errorText;
            }

            // Check access
            if (!filterService.canViewFilter(filter, this.user)) {
                Adminizer.log.warn(`FilterCounterWidget: Access denied to filter '${this.filterId}'`);
                return this.errorText;
            }

            // Get count
            const count = await filterService.countFilterResults(filter, this.user);

            if (count === 0 && this.zeroText !== '0') {
                return this.zeroText;
            }

            const formatted = this.formatCount(count);
            return `${this.prefix}${formatted}${this.suffix}`;
        } catch (error: any) {
            Adminizer.log.error(`FilterCounterWidget error for '${this.filterId}':`, error);
            return this.errorText;
        }
    }

    /**
     * Get the raw count number (for programmatic access)
     */
    public async getCount(): Promise<number> {
        try {
            const filterService = new FilterService(this.adminizer);

            let filter;
            if (this.isSlug) {
                filter = await filterService.getFilterBySlug(this.filterId);
            } else {
                filter = await filterService.getFilterById(this.filterId, this.user);
            }

            if (!filter || !filterService.canViewFilter(filter, this.user)) {
                return -1;
            }

            return await filterService.countFilterResults(filter, this.user);
        } catch {
            return -1;
        }
    }
}

/**
 * Factory function to create multiple filter counter widgets from config
 */
export function createFilterCounterWidgets(
    adminizer: Adminizer,
    user: UserAP,
    configs: FilterCounterWidgetOptions[]
): FilterCounterWidget[] {
    return configs.map(config => new FilterCounterWidget(adminizer, user, config));
}
