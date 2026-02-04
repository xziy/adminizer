/**
 * FilterQuickLinks UI Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import {
    QuickLinkFilter,
    FilterQuickLinksProps,
    FilterQuickLinksLabels,
    defaultFilterQuickLinksLabels,
    buildFilterUrl,
    getFilterIcon,
    getFilterColor,
    formatResultCount,
    sortFiltersByName,
    groupFiltersByModel,
    truncateFilterName,
    DEFAULT_ROUTE_PREFIX,
    DEFAULT_MAX_LINKS,
} from '../src/assets/js/components/filter-quick-links/types';

describe('FilterQuickLinks Types', () => {
    describe('QuickLinkFilter', () => {
        it('should have required fields', () => {
            const filter: QuickLinkFilter = {
                id: '1',
                name: 'Active Orders',
                slug: 'active-orders',
                modelName: 'Order',
            };

            expect(filter.id).toBe('1');
            expect(filter.name).toBe('Active Orders');
            expect(filter.slug).toBe('active-orders');
            expect(filter.modelName).toBe('Order');
        });

        it('should support optional fields', () => {
            const filter: QuickLinkFilter = {
                id: '1',
                name: 'Active Orders',
                slug: 'active-orders',
                modelName: 'Order',
                icon: 'shopping_cart',
                color: '#ff9800',
                resultCount: 42,
            };

            expect(filter.icon).toBe('shopping_cart');
            expect(filter.color).toBe('#ff9800');
            expect(filter.resultCount).toBe(42);
        });
    });

    describe('FilterQuickLinksProps', () => {
        it('should accept required props', () => {
            const onFilterClick = vi.fn();
            const props: FilterQuickLinksProps = {
                filters: [],
                onFilterClick,
            };

            expect(props.filters).toEqual([]);
            expect(props.onFilterClick).toBe(onFilterClick);
        });

        it('should accept all optional props', () => {
            const props: FilterQuickLinksProps = {
                filters: [],
                activeFilterId: '1',
                onFilterClick: vi.fn(),
                isLoading: true,
                routePrefix: '/admin',
                maxLinks: 10,
                labels: { title: 'Custom Title' },
                showCounts: true,
                compact: true,
                className: 'custom-class',
            };

            expect(props.activeFilterId).toBe('1');
            expect(props.isLoading).toBe(true);
            expect(props.compact).toBe(true);
        });
    });

    describe('defaultFilterQuickLinksLabels', () => {
        it('should have all required labels', () => {
            expect(defaultFilterQuickLinksLabels.title).toBeDefined();
            expect(defaultFilterQuickLinksLabels.noLinks).toBeDefined();
            expect(defaultFilterQuickLinksLabels.viewAll).toBeDefined();
            expect(defaultFilterQuickLinksLabels.loading).toBeDefined();
        });

        it('should have correct default values', () => {
            expect(defaultFilterQuickLinksLabels.title).toBe('Quick Filters');
            expect(defaultFilterQuickLinksLabels.noLinks).toBe('No pinned filters');
        });
    });

    describe('Constants', () => {
        it('should have correct default route prefix', () => {
            expect(DEFAULT_ROUTE_PREFIX).toBe('/adminizer');
        });

        it('should have correct default max links', () => {
            expect(DEFAULT_MAX_LINKS).toBe(5);
        });
    });
});

describe('buildFilterUrl', () => {
    it('should build URL with slug when available', () => {
        const filter: QuickLinkFilter = {
            id: '1',
            name: 'Test',
            slug: 'test-filter',
            modelName: 'Order',
        };

        const url = buildFilterUrl(filter);
        expect(url).toBe('/adminizer/list/Order?filterSlug=test-filter');
    });

    it('should build URL with id when no slug', () => {
        const filter: QuickLinkFilter = {
            id: 'abc123',
            name: 'Test',
            slug: '',
            modelName: 'Order',
        };

        const url = buildFilterUrl(filter);
        expect(url).toBe('/adminizer/list/Order?filterId=abc123');
    });

    it('should use custom route prefix', () => {
        const filter: QuickLinkFilter = {
            id: '1',
            name: 'Test',
            slug: 'test',
            modelName: 'Order',
        };

        const url = buildFilterUrl(filter, '/admin');
        expect(url).toBe('/admin/list/Order?filterSlug=test');
    });
});

describe('getFilterIcon', () => {
    it('should return custom icon when set', () => {
        const filter: QuickLinkFilter = {
            id: '1',
            name: 'Test',
            slug: 'test',
            modelName: 'Order',
            icon: 'shopping_cart',
        };

        expect(getFilterIcon(filter)).toBe('shopping_cart');
    });

    it('should return default icon when not set', () => {
        const filter: QuickLinkFilter = {
            id: '1',
            name: 'Test',
            slug: 'test',
            modelName: 'Order',
        };

        expect(getFilterIcon(filter)).toBe('filter_list');
    });
});

describe('getFilterColor', () => {
    it('should return custom color when set', () => {
        const filter: QuickLinkFilter = {
            id: '1',
            name: 'Test',
            slug: 'test',
            modelName: 'Order',
            color: '#ff9800',
        };

        expect(getFilterColor(filter)).toBe('#ff9800');
    });

    it('should return default color when not set', () => {
        const filter: QuickLinkFilter = {
            id: '1',
            name: 'Test',
            slug: 'test',
            modelName: 'Order',
        };

        expect(getFilterColor(filter)).toBe('#6366f1');
    });
});

describe('formatResultCount', () => {
    it('should return empty string for undefined', () => {
        expect(formatResultCount(undefined)).toBe('');
    });

    it('should format small numbers as-is', () => {
        expect(formatResultCount(0)).toBe('0');
        expect(formatResultCount(42)).toBe('42');
        expect(formatResultCount(999)).toBe('999');
    });

    it('should format thousands with K suffix', () => {
        expect(formatResultCount(1000)).toBe('1.0K');
        expect(formatResultCount(1500)).toBe('1.5K');
        expect(formatResultCount(10000)).toBe('10.0K');
    });

    it('should format millions with M suffix', () => {
        expect(formatResultCount(1000000)).toBe('1.0M');
        expect(formatResultCount(1500000)).toBe('1.5M');
        expect(formatResultCount(10000000)).toBe('10.0M');
    });
});

describe('sortFiltersByName', () => {
    it('should sort filters alphabetically', () => {
        const filters: QuickLinkFilter[] = [
            { id: '1', name: 'Zebra', slug: 'z', modelName: 'Order' },
            { id: '2', name: 'Apple', slug: 'a', modelName: 'Order' },
            { id: '3', name: 'Banana', slug: 'b', modelName: 'Order' },
        ];

        const sorted = sortFiltersByName(filters);
        expect(sorted[0].name).toBe('Apple');
        expect(sorted[1].name).toBe('Banana');
        expect(sorted[2].name).toBe('Zebra');
    });

    it('should not mutate original array', () => {
        const filters: QuickLinkFilter[] = [
            { id: '1', name: 'Zebra', slug: 'z', modelName: 'Order' },
            { id: '2', name: 'Apple', slug: 'a', modelName: 'Order' },
        ];

        sortFiltersByName(filters);
        expect(filters[0].name).toBe('Zebra');
    });

    it('should handle empty array', () => {
        expect(sortFiltersByName([])).toEqual([]);
    });
});

describe('groupFiltersByModel', () => {
    it('should group filters by model name', () => {
        const filters: QuickLinkFilter[] = [
            { id: '1', name: 'Order 1', slug: 'o1', modelName: 'Order' },
            { id: '2', name: 'User 1', slug: 'u1', modelName: 'User' },
            { id: '3', name: 'Order 2', slug: 'o2', modelName: 'Order' },
        ];

        const groups = groupFiltersByModel(filters);

        expect(groups.get('Order')?.length).toBe(2);
        expect(groups.get('User')?.length).toBe(1);
    });

    it('should handle empty array', () => {
        const groups = groupFiltersByModel([]);
        expect(groups.size).toBe(0);
    });

    it('should handle single model', () => {
        const filters: QuickLinkFilter[] = [
            { id: '1', name: 'Filter 1', slug: 'f1', modelName: 'Order' },
            { id: '2', name: 'Filter 2', slug: 'f2', modelName: 'Order' },
        ];

        const groups = groupFiltersByModel(filters);
        expect(groups.size).toBe(1);
        expect(groups.get('Order')?.length).toBe(2);
    });
});

describe('truncateFilterName', () => {
    it('should not truncate short names', () => {
        expect(truncateFilterName('Short')).toBe('Short');
        expect(truncateFilterName('Exactly Twenty!!')).toBe('Exactly Twenty!!');
    });

    it('should truncate long names with ellipsis', () => {
        expect(truncateFilterName('This is a very long filter name')).toBe('This is a very lo...');
    });

    it('should respect custom max length', () => {
        expect(truncateFilterName('Hello World', 8)).toBe('Hello...');
    });

    it('should handle edge cases', () => {
        expect(truncateFilterName('')).toBe('');
        expect(truncateFilterName('a', 5)).toBe('a');
    });
});

describe('FilterQuickLinks Logic', () => {
    describe('URL building', () => {
        it('should prefer slug over id for cleaner URLs', () => {
            const filterWithSlug: QuickLinkFilter = {
                id: 'abc123-uuid',
                name: 'Test',
                slug: 'clean-slug',
                modelName: 'Order',
            };

            const url = buildFilterUrl(filterWithSlug);
            expect(url).toContain('filterSlug=clean-slug');
            expect(url).not.toContain('filterId');
        });

        it('should fallback to id when slug is empty', () => {
            const filterWithoutSlug: QuickLinkFilter = {
                id: 'abc123',
                name: 'Test',
                slug: '',
                modelName: 'Order',
            };

            const url = buildFilterUrl(filterWithoutSlug);
            expect(url).toContain('filterId=abc123');
        });
    });

    describe('Display limits', () => {
        it('should identify when there are more filters than max', () => {
            const filters: QuickLinkFilter[] = Array.from({ length: 10 }, (_, i) => ({
                id: String(i),
                name: `Filter ${i}`,
                slug: `filter-${i}`,
                modelName: 'Order',
            }));

            const maxLinks = 5;
            const hasMore = filters.length > maxLinks;

            expect(hasMore).toBe(true);
            expect(filters.slice(0, maxLinks).length).toBe(5);
        });
    });

    describe('Active state', () => {
        it('should identify active filter', () => {
            const filters: QuickLinkFilter[] = [
                { id: '1', name: 'F1', slug: 'f1', modelName: 'Order' },
                { id: '2', name: 'F2', slug: 'f2', modelName: 'Order' },
                { id: '3', name: 'F3', slug: 'f3', modelName: 'Order' },
            ];

            const activeFilterId = '2';
            const activeFilter = filters.find(f => f.id === activeFilterId);

            expect(activeFilter?.name).toBe('F2');
        });
    });

    describe('Grouping', () => {
        it('should create separate groups for each model', () => {
            const filters: QuickLinkFilter[] = [
                { id: '1', name: 'Order Filter', slug: 'of', modelName: 'Order' },
                { id: '2', name: 'User Filter', slug: 'uf', modelName: 'User' },
                { id: '3', name: 'Product Filter', slug: 'pf', modelName: 'Product' },
            ];

            const groups = groupFiltersByModel(filters);
            expect(groups.size).toBe(3);
        });
    });
});
