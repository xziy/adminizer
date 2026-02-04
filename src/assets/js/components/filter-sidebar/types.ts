/**
 * Filter Sidebar Types
 */

export type FilterVisibility = 'private' | 'public' | 'groups' | 'system';

export interface SavedFilter {
    id: string;
    name: string;
    description?: string;
    modelName: string;
    slug: string;
    visibility: FilterVisibility;
    isPinned: boolean;
    isSystemFilter: boolean;
    owner?: {
        id: number;
        login: string;
    };
    resultCount?: number;
    updatedAt: string;
    createdAt: string;
}

export interface FilterSidebarProps {
    filters: SavedFilter[];
    currentFilterId?: string;
    modelName: string;
    onSelectFilter: (filter: SavedFilter) => void;
    onCreateFilter?: () => void;
    onEditFilter?: (filter: SavedFilter) => void;
    onDeleteFilter?: (filter: SavedFilter) => void;
    onTogglePin?: (filter: SavedFilter) => void;
    onDuplicateFilter?: (filter: SavedFilter) => void;
    isLoading?: boolean;
    canCreate?: boolean;
    canEdit?: boolean;
    labels?: Partial<FilterSidebarLabels>;
}

export interface FilterSidebarLabels {
    title: string;
    myFilters: string;
    sharedFilters: string;
    systemFilters: string;
    createFilter: string;
    editFilter: string;
    deleteFilter: string;
    duplicateFilter: string;
    pinFilter: string;
    unpinFilter: string;
    noFilters: string;
    searchPlaceholder: string;
    confirmDelete: string;
    private: string;
    public: string;
    groups: string;
    system: string;
    results: string;
    lastUpdated: string;
}

export const defaultFilterSidebarLabels: FilterSidebarLabels = {
    title: 'Saved Filters',
    myFilters: 'My Filters',
    sharedFilters: 'Shared Filters',
    systemFilters: 'System Filters',
    createFilter: 'Create Filter',
    editFilter: 'Edit',
    deleteFilter: 'Delete',
    duplicateFilter: 'Duplicate',
    pinFilter: 'Pin to top',
    unpinFilter: 'Unpin',
    noFilters: 'No saved filters',
    searchPlaceholder: 'Search filters...',
    confirmDelete: 'Are you sure you want to delete this filter?',
    private: 'Private',
    public: 'Public',
    groups: 'Group',
    system: 'System',
    results: 'results',
    lastUpdated: 'Updated',
};

export interface FilterGroup {
    key: string;
    label: string;
    filters: SavedFilter[];
    collapsible?: boolean;
    defaultCollapsed?: boolean;
}

export function groupFilters(
    filters: SavedFilter[],
    currentUserId?: number,
    labels: FilterSidebarLabels = defaultFilterSidebarLabels
): FilterGroup[] {
    const groups: FilterGroup[] = [];

    // Pinned filters (across all categories)
    const pinned = filters.filter(f => f.isPinned);
    if (pinned.length > 0) {
        groups.push({
            key: 'pinned',
            label: '📌 Pinned',
            filters: pinned,
        });
    }

    // My filters (owned by current user, not pinned)
    const myFilters = filters.filter(
        f => !f.isPinned && !f.isSystemFilter && f.owner?.id === currentUserId
    );
    if (myFilters.length > 0) {
        groups.push({
            key: 'my',
            label: labels.myFilters,
            filters: myFilters,
        });
    }

    // Shared filters (public or group, not owned by current user, not pinned)
    const sharedFilters = filters.filter(
        f => !f.isPinned &&
             !f.isSystemFilter &&
             f.owner?.id !== currentUserId &&
             (f.visibility === 'public' || f.visibility === 'groups')
    );
    if (sharedFilters.length > 0) {
        groups.push({
            key: 'shared',
            label: labels.sharedFilters,
            filters: sharedFilters,
            collapsible: true,
            defaultCollapsed: sharedFilters.length > 5,
        });
    }

    // System filters (not pinned)
    const systemFilters = filters.filter(f => !f.isPinned && f.isSystemFilter);
    if (systemFilters.length > 0) {
        groups.push({
            key: 'system',
            label: labels.systemFilters,
            filters: systemFilters,
            collapsible: true,
            defaultCollapsed: true,
        });
    }

    return groups;
}

export function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
}
