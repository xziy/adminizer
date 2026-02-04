/**
 * Filter Quick Links Types
 *
 * Types for displaying quick links to pinned/favorite filters in navigation
 */

import { FilterVisibility } from '../filter-sidebar/types';

export interface QuickLinkFilter {
    id: string;
    name: string;
    slug: string;
    modelName: string;
    icon?: string;
    color?: string;
    resultCount?: number;
}

export interface FilterQuickLinksProps {
    /** List of pinned/quick link filters */
    filters: QuickLinkFilter[];
    /** Currently active filter ID */
    activeFilterId?: string;
    /** Called when a filter link is clicked */
    onFilterClick: (filter: QuickLinkFilter) => void;
    /** Whether links are loading */
    isLoading?: boolean;
    /** Route prefix for building URLs */
    routePrefix?: string;
    /** Maximum number of links to display */
    maxLinks?: number;
    /** Custom labels */
    labels?: Partial<FilterQuickLinksLabels>;
    /** Show result counts */
    showCounts?: boolean;
    /** Compact display mode */
    compact?: boolean;
    /** Custom class name */
    className?: string;
}

export interface FilterQuickLinksLabels {
    title: string;
    noLinks: string;
    viewAll: string;
    loading: string;
}

export const defaultFilterQuickLinksLabels: FilterQuickLinksLabels = {
    title: 'Quick Filters',
    noLinks: 'No pinned filters',
    viewAll: 'View all filters',
    loading: 'Loading...',
};

/** Default route prefix */
export const DEFAULT_ROUTE_PREFIX = '/adminizer';

/** Default max links to show */
export const DEFAULT_MAX_LINKS = 5;

/**
 * Build URL for a filter quick link
 */
export function buildFilterUrl(
    filter: QuickLinkFilter,
    routePrefix: string = DEFAULT_ROUTE_PREFIX
): string {
    // Use slug if available for cleaner URLs
    if (filter.slug) {
        return `${routePrefix}/list/${filter.modelName}?filterSlug=${filter.slug}`;
    }
    return `${routePrefix}/list/${filter.modelName}?filterId=${filter.id}`;
}

/**
 * Get icon for a filter (or default)
 */
export function getFilterIcon(filter: QuickLinkFilter): string {
    return filter.icon || 'filter_list';
}

/**
 * Get color for a filter (or default)
 */
export function getFilterColor(filter: QuickLinkFilter): string {
    return filter.color || '#6366f1'; // Default indigo
}

/**
 * Format result count for display
 */
export function formatResultCount(count: number | undefined): string {
    if (count === undefined) return '';
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toLocaleString();
}

/**
 * Sort filters by name
 */
export function sortFiltersByName(filters: QuickLinkFilter[]): QuickLinkFilter[] {
    return [...filters].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Group filters by model
 */
export function groupFiltersByModel(
    filters: QuickLinkFilter[]
): Map<string, QuickLinkFilter[]> {
    const groups = new Map<string, QuickLinkFilter[]>();

    for (const filter of filters) {
        const existing = groups.get(filter.modelName) || [];
        existing.push(filter);
        groups.set(filter.modelName, existing);
    }

    return groups;
}

/**
 * Truncate filter name if too long
 */
export function truncateFilterName(name: string, maxLength: number = 20): string {
    if (name.length <= maxLength) return name;
    return name.slice(0, maxLength - 3) + '...';
}
