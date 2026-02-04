/**
 * FilterSidebar UI Component Tests
 */

import { describe, it, expect } from 'vitest';
import {
    SavedFilter,
    FilterVisibility,
    FilterGroup,
    defaultFilterSidebarLabels,
    groupFilters,
    formatRelativeTime,
} from '../src/assets/js/components/filter-sidebar/types';

describe('FilterSidebar Types and Utilities', () => {
    describe('SavedFilter interface', () => {
        it('should create a valid saved filter', () => {
            const filter: SavedFilter = {
                id: '1',
                name: 'Active Orders',
                modelName: 'Order',
                slug: 'active-orders',
                visibility: 'private',
                isPinned: false,
                isSystemFilter: false,
                updatedAt: '2026-02-03T10:00:00Z',
                createdAt: '2026-02-01T10:00:00Z',
            };

            expect(filter.id).toBe('1');
            expect(filter.name).toBe('Active Orders');
            expect(filter.visibility).toBe('private');
        });

        it('should support optional properties', () => {
            const filter: SavedFilter = {
                id: '1',
                name: 'Test Filter',
                description: 'A test filter',
                modelName: 'Order',
                slug: 'test-filter',
                visibility: 'public',
                isPinned: true,
                isSystemFilter: false,
                owner: { id: 1, login: 'admin' },
                resultCount: 42,
                updatedAt: '2026-02-03T10:00:00Z',
                createdAt: '2026-02-01T10:00:00Z',
            };

            expect(filter.description).toBe('A test filter');
            expect(filter.owner?.login).toBe('admin');
            expect(filter.resultCount).toBe(42);
        });
    });

    describe('FilterVisibility', () => {
        it('should support all visibility types', () => {
            const visibilities: FilterVisibility[] = ['private', 'public', 'groups', 'system'];
            expect(visibilities.length).toBe(4);
        });
    });

    describe('defaultFilterSidebarLabels', () => {
        it('should have all required labels', () => {
            expect(defaultFilterSidebarLabels.title).toBeDefined();
            expect(defaultFilterSidebarLabels.myFilters).toBeDefined();
            expect(defaultFilterSidebarLabels.sharedFilters).toBeDefined();
            expect(defaultFilterSidebarLabels.systemFilters).toBeDefined();
            expect(defaultFilterSidebarLabels.createFilter).toBeDefined();
            expect(defaultFilterSidebarLabels.noFilters).toBeDefined();
        });

        it('should have correct default values', () => {
            expect(defaultFilterSidebarLabels.title).toBe('Saved Filters');
            expect(defaultFilterSidebarLabels.createFilter).toBe('Create Filter');
        });
    });
});

describe('groupFilters function', () => {
    const createFilter = (overrides: Partial<SavedFilter> = {}): SavedFilter => ({
        id: Math.random().toString(),
        name: 'Test Filter',
        modelName: 'Order',
        slug: 'test-filter',
        visibility: 'private',
        isPinned: false,
        isSystemFilter: false,
        updatedAt: '2026-02-03T10:00:00Z',
        createdAt: '2026-02-01T10:00:00Z',
        ...overrides,
    });

    it('should return empty array for empty filters', () => {
        const groups = groupFilters([]);
        expect(groups).toEqual([]);
    });

    it('should group pinned filters first', () => {
        const filters = [
            createFilter({ id: '1', name: 'Normal', isPinned: false }),
            createFilter({ id: '2', name: 'Pinned', isPinned: true }),
        ];

        const groups = groupFilters(filters, 1);

        expect(groups[0].key).toBe('pinned');
        expect(groups[0].filters[0].name).toBe('Pinned');
    });

    it('should group user own filters', () => {
        const filters = [
            createFilter({ id: '1', name: 'My Filter', owner: { id: 1, login: 'user1' } }),
            createFilter({ id: '2', name: 'Other Filter', owner: { id: 2, login: 'user2' } }),
        ];

        const groups = groupFilters(filters, 1);
        const myGroup = groups.find(g => g.key === 'my');

        expect(myGroup).toBeDefined();
        expect(myGroup?.filters.length).toBe(1);
        expect(myGroup?.filters[0].name).toBe('My Filter');
    });

    it('should group shared filters', () => {
        const filters = [
            createFilter({
                id: '1',
                name: 'Public Filter',
                visibility: 'public',
                owner: { id: 2, login: 'other' },
            }),
            createFilter({
                id: '2',
                name: 'Group Filter',
                visibility: 'groups',
                owner: { id: 2, login: 'other' },
            }),
        ];

        const groups = groupFilters(filters, 1);
        const sharedGroup = groups.find(g => g.key === 'shared');

        expect(sharedGroup).toBeDefined();
        expect(sharedGroup?.filters.length).toBe(2);
    });

    it('should group system filters', () => {
        const filters = [
            createFilter({ id: '1', name: 'System Filter', isSystemFilter: true }),
        ];

        const groups = groupFilters(filters);
        const systemGroup = groups.find(g => g.key === 'system');

        expect(systemGroup).toBeDefined();
        expect(systemGroup?.filters[0].name).toBe('System Filter');
    });

    it('should not duplicate pinned filters in other groups', () => {
        const filters = [
            createFilter({
                id: '1',
                name: 'Pinned Own',
                isPinned: true,
                owner: { id: 1, login: 'user1' },
            }),
        ];

        const groups = groupFilters(filters, 1);

        // Should only appear in pinned group
        expect(groups.length).toBe(1);
        expect(groups[0].key).toBe('pinned');
    });

    it('should mark shared group as collapsible', () => {
        const filters = [
            createFilter({
                id: '1',
                name: 'Shared',
                visibility: 'public',
                owner: { id: 2, login: 'other' },
            }),
        ];

        const groups = groupFilters(filters, 1);
        const sharedGroup = groups.find(g => g.key === 'shared');

        expect(sharedGroup?.collapsible).toBe(true);
    });

    it('should set defaultCollapsed for large shared groups', () => {
        const filters = Array.from({ length: 6 }, (_, i) =>
            createFilter({
                id: String(i),
                name: `Shared ${i}`,
                visibility: 'public',
                owner: { id: 2, login: 'other' },
            })
        );

        const groups = groupFilters(filters, 1);
        const sharedGroup = groups.find(g => g.key === 'shared');

        expect(sharedGroup?.defaultCollapsed).toBe(true);
    });

    it('should always collapse system group by default', () => {
        const filters = [
            createFilter({ id: '1', name: 'System', isSystemFilter: true }),
        ];

        const groups = groupFilters(filters);
        const systemGroup = groups.find(g => g.key === 'system');

        expect(systemGroup?.defaultCollapsed).toBe(true);
    });
});

describe('formatRelativeTime function', () => {
    it('should format time just now', () => {
        const now = new Date();
        expect(formatRelativeTime(now.toISOString())).toBe('just now');
    });

    it('should format time in minutes', () => {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        expect(formatRelativeTime(fiveMinutesAgo.toISOString())).toBe('5m ago');
    });

    it('should format time in hours', () => {
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        expect(formatRelativeTime(twoHoursAgo.toISOString())).toBe('2h ago');
    });

    it('should format time in days', () => {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        expect(formatRelativeTime(threeDaysAgo.toISOString())).toBe('3d ago');
    });

    it('should format old dates as locale date', () => {
        const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        const result = formatRelativeTime(twoWeeksAgo.toISOString());
        // Should be a date string, not relative
        expect(result).not.toContain('ago');
    });
});

describe('FilterSidebar Logic', () => {
    describe('Search filtering', () => {
        it('should filter by name', () => {
            const filters: SavedFilter[] = [
                {
                    id: '1',
                    name: 'Active Orders',
                    modelName: 'Order',
                    slug: 'active-orders',
                    visibility: 'private',
                    isPinned: false,
                    isSystemFilter: false,
                    updatedAt: '2026-02-03T10:00:00Z',
                    createdAt: '2026-02-01T10:00:00Z',
                },
                {
                    id: '2',
                    name: 'Pending Payments',
                    modelName: 'Payment',
                    slug: 'pending-payments',
                    visibility: 'private',
                    isPinned: false,
                    isSystemFilter: false,
                    updatedAt: '2026-02-03T10:00:00Z',
                    createdAt: '2026-02-01T10:00:00Z',
                },
            ];

            const searchFilter = (filters: SavedFilter[], term: string) => {
                if (!term) return filters;
                const lowerTerm = term.toLowerCase();
                return filters.filter(f =>
                    f.name.toLowerCase().includes(lowerTerm) ||
                    f.description?.toLowerCase().includes(lowerTerm)
                );
            };

            expect(searchFilter(filters, 'active').length).toBe(1);
            expect(searchFilter(filters, 'orders').length).toBe(1);
            expect(searchFilter(filters, 'payment').length).toBe(1);
            expect(searchFilter(filters, 'xyz').length).toBe(0);
            expect(searchFilter(filters, '').length).toBe(2);
        });

        it('should filter by description', () => {
            const filters: SavedFilter[] = [
                {
                    id: '1',
                    name: 'Filter One',
                    description: 'Orders from today',
                    modelName: 'Order',
                    slug: 'filter-one',
                    visibility: 'private',
                    isPinned: false,
                    isSystemFilter: false,
                    updatedAt: '2026-02-03T10:00:00Z',
                    createdAt: '2026-02-01T10:00:00Z',
                },
            ];

            const searchFilter = (filters: SavedFilter[], term: string) => {
                const lowerTerm = term.toLowerCase();
                return filters.filter(f =>
                    f.name.toLowerCase().includes(lowerTerm) ||
                    f.description?.toLowerCase().includes(lowerTerm)
                );
            };

            expect(searchFilter(filters, 'today').length).toBe(1);
        });
    });

    describe('Edit permissions', () => {
        it('should allow editing own filters', () => {
            const canEditFilter = (filter: SavedFilter, currentUserId: number, canEdit: boolean) => {
                if (!canEdit) return false;
                if (filter.isSystemFilter) return false;
                return true;
            };

            const ownFilter: SavedFilter = {
                id: '1',
                name: 'My Filter',
                modelName: 'Order',
                slug: 'my-filter',
                visibility: 'private',
                isPinned: false,
                isSystemFilter: false,
                owner: { id: 1, login: 'user' },
                updatedAt: '2026-02-03T10:00:00Z',
                createdAt: '2026-02-01T10:00:00Z',
            };

            expect(canEditFilter(ownFilter, 1, true)).toBe(true);
        });

        it('should not allow editing system filters', () => {
            const canEditFilter = (filter: SavedFilter, currentUserId: number, canEdit: boolean) => {
                if (!canEdit) return false;
                if (filter.isSystemFilter) return false;
                return true;
            };

            const systemFilter: SavedFilter = {
                id: '1',
                name: 'System Filter',
                modelName: 'Order',
                slug: 'system-filter',
                visibility: 'system',
                isPinned: false,
                isSystemFilter: true,
                updatedAt: '2026-02-03T10:00:00Z',
                createdAt: '2026-02-01T10:00:00Z',
            };

            expect(canEditFilter(systemFilter, 1, true)).toBe(false);
        });

        it('should respect canEdit prop', () => {
            const canEditFilter = (filter: SavedFilter, currentUserId: number, canEdit: boolean) => {
                if (!canEdit) return false;
                if (filter.isSystemFilter) return false;
                return true;
            };

            const filter: SavedFilter = {
                id: '1',
                name: 'Filter',
                modelName: 'Order',
                slug: 'filter',
                visibility: 'private',
                isPinned: false,
                isSystemFilter: false,
                updatedAt: '2026-02-03T10:00:00Z',
                createdAt: '2026-02-01T10:00:00Z',
            };

            expect(canEditFilter(filter, 1, false)).toBe(false);
        });
    });

    describe('Collapsed state', () => {
        it('should track collapsed groups', () => {
            const collapsedGroups = new Set<string>();

            const toggleGroup = (key: string) => {
                if (collapsedGroups.has(key)) {
                    collapsedGroups.delete(key);
                } else {
                    collapsedGroups.add(key);
                }
            };

            expect(collapsedGroups.has('shared')).toBe(false);

            toggleGroup('shared');
            expect(collapsedGroups.has('shared')).toBe(true);

            toggleGroup('shared');
            expect(collapsedGroups.has('shared')).toBe(false);
        });
    });
});
