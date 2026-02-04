/**
 * FilterCounterWidget UI Component Tests
 */

import { describe, it, expect } from 'vitest';
import {
    FilterCounterWidgetProps,
    FilterCounterState,
    defaultFilterCounterWidgetLabels,
    sizeClasses,
    formatCount,
    formatLastUpdated,
} from '../src/assets/js/components/filter-counter-widget/types';

describe('FilterCounterWidget Types', () => {
    describe('FilterCounterWidgetProps', () => {
        it('should create valid props with required fields', () => {
            const props: FilterCounterWidgetProps = {
                filterId: 'test-filter',
                title: 'Test Widget',
            };

            expect(props.filterId).toBe('test-filter');
            expect(props.title).toBe('Test Widget');
        });

        it('should support all optional properties', () => {
            const props: FilterCounterWidgetProps = {
                filterId: 'test-filter',
                isSlug: true,
                title: 'Test Widget',
                description: 'Widget description',
                icon: 'shopping_cart',
                backgroundColor: '#ff9800',
                textColor: '#000000',
                link: '/admin/orders',
                linkTarget: '_blank',
                prefix: '$',
                suffix: ' items',
                zeroText: 'No items',
                errorText: 'Failed to load',
                refreshInterval: 60,
                apiEndpoint: '/api/custom/count',
                size: 'lg',
                className: 'custom-class',
            };

            expect(props.isSlug).toBe(true);
            expect(props.icon).toBe('shopping_cart');
            expect(props.refreshInterval).toBe(60);
            expect(props.size).toBe('lg');
        });
    });

    describe('FilterCounterState', () => {
        it('should represent loading state', () => {
            const state: FilterCounterState = {
                count: null,
                isLoading: true,
                error: null,
                lastUpdated: null,
            };

            expect(state.isLoading).toBe(true);
            expect(state.count).toBeNull();
        });

        it('should represent success state', () => {
            const state: FilterCounterState = {
                count: 42,
                isLoading: false,
                error: null,
                lastUpdated: new Date(),
            };

            expect(state.count).toBe(42);
            expect(state.isLoading).toBe(false);
            expect(state.lastUpdated).toBeDefined();
        });

        it('should represent error state', () => {
            const state: FilterCounterState = {
                count: null,
                isLoading: false,
                error: 'Network error',
                lastUpdated: null,
            };

            expect(state.error).toBe('Network error');
        });
    });

    describe('defaultFilterCounterWidgetLabels', () => {
        it('should have all required labels', () => {
            expect(defaultFilterCounterWidgetLabels.loading).toBeDefined();
            expect(defaultFilterCounterWidgetLabels.error).toBeDefined();
            expect(defaultFilterCounterWidgetLabels.retry).toBeDefined();
            expect(defaultFilterCounterWidgetLabels.lastUpdated).toBeDefined();
        });
    });

    describe('sizeClasses', () => {
        it('should have classes for all sizes', () => {
            expect(sizeClasses.sm).toBeDefined();
            expect(sizeClasses.md).toBeDefined();
            expect(sizeClasses.lg).toBeDefined();
        });

        it('should have all required class properties', () => {
            for (const size of ['sm', 'md', 'lg'] as const) {
                expect(sizeClasses[size].container).toBeDefined();
                expect(sizeClasses[size].icon).toBeDefined();
                expect(sizeClasses[size].count).toBeDefined();
                expect(sizeClasses[size].title).toBeDefined();
            }
        });
    });
});

describe('formatCount function', () => {
    it('should format small numbers as-is', () => {
        expect(formatCount(0)).toBe('0');
        expect(formatCount(42)).toBe('42');
        expect(formatCount(999)).toBe('999');
    });

    it('should format thousands with K suffix', () => {
        expect(formatCount(1000)).toBe('1.0K');
        expect(formatCount(1500)).toBe('1.5K');
        expect(formatCount(10000)).toBe('10.0K');
        expect(formatCount(999999)).toBe('1000.0K');
    });

    it('should format millions with M suffix', () => {
        expect(formatCount(1000000)).toBe('1.0M');
        expect(formatCount(1500000)).toBe('1.5M');
        expect(formatCount(10000000)).toBe('10.0M');
    });

    it('should handle edge cases', () => {
        expect(formatCount(1)).toBe('1');
        expect(formatCount(100)).toBe('100');
        expect(formatCount(1234)).toBe('1.2K');
        expect(formatCount(1234567)).toBe('1.2M');
    });
});

describe('formatLastUpdated function', () => {
    it('should format recent times as "just now"', () => {
        const now = new Date();
        expect(formatLastUpdated(now)).toBe('just now');

        const tenSecondsAgo = new Date(Date.now() - 10000);
        expect(formatLastUpdated(tenSecondsAgo)).toBe('just now');
    });

    it('should format minutes ago', () => {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        expect(formatLastUpdated(fiveMinutesAgo)).toBe('5m ago');

        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        expect(formatLastUpdated(thirtyMinutesAgo)).toBe('30m ago');
    });

    it('should format hours ago', () => {
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        expect(formatLastUpdated(twoHoursAgo)).toBe('2h ago');

        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
        expect(formatLastUpdated(twelveHoursAgo)).toBe('12h ago');
    });

    it('should format older times as locale time', () => {
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
        const result = formatLastUpdated(twoDaysAgo);
        // Should not contain "ago"
        expect(result).not.toContain('ago');
    });
});

describe('FilterCounterWidget Logic', () => {
    describe('API URL building', () => {
        it('should build URL for filter ID', () => {
            const buildUrl = (filterId: string, isSlug: boolean, routePrefix: string) => {
                if (isSlug) {
                    return `${routePrefix}/filters/by-slug/${filterId}/count`;
                }
                return `${routePrefix}/filters/${filterId}/count`;
            };

            expect(buildUrl('abc123', false, '/adminizer'))
                .toBe('/adminizer/filters/abc123/count');

            expect(buildUrl('pending-orders', true, '/adminizer'))
                .toBe('/adminizer/filters/by-slug/pending-orders/count');
        });

        it('should use custom endpoint when provided', () => {
            const getApiUrl = (apiEndpoint?: string, filterId?: string) => {
                if (apiEndpoint) return apiEndpoint;
                return `/adminizer/filters/${filterId}/count`;
            };

            expect(getApiUrl('/custom/api/count', 'abc'))
                .toBe('/custom/api/count');

            expect(getApiUrl(undefined, 'abc'))
                .toBe('/adminizer/filters/abc/count');
        });
    });

    describe('State management', () => {
        it('should transition from loading to success', () => {
            let state: FilterCounterState = {
                count: null,
                isLoading: true,
                error: null,
                lastUpdated: null,
            };

            // Simulate successful response
            state = {
                count: 42,
                isLoading: false,
                error: null,
                lastUpdated: new Date(),
            };

            expect(state.count).toBe(42);
            expect(state.isLoading).toBe(false);
        });

        it('should transition from loading to error', () => {
            let state: FilterCounterState = {
                count: null,
                isLoading: true,
                error: null,
                lastUpdated: null,
            };

            // Simulate error response
            state = {
                ...state,
                isLoading: false,
                error: 'Network error',
            };

            expect(state.error).toBe('Network error');
            expect(state.isLoading).toBe(false);
        });

        it('should preserve count during refresh', () => {
            let state: FilterCounterState = {
                count: 42,
                isLoading: false,
                error: null,
                lastUpdated: new Date(),
            };

            // Start refresh
            state = { ...state, isLoading: true };

            expect(state.count).toBe(42);
            expect(state.isLoading).toBe(true);
        });
    });

    describe('Display formatting', () => {
        it('should format count with prefix and suffix', () => {
            const formatDisplay = (count: number, prefix: string, suffix: string) => {
                return `${prefix}${formatCount(count)}${suffix}`;
            };

            expect(formatDisplay(100, '$', '')).toBe('$100');
            expect(formatDisplay(1000, '', ' items')).toBe('1.0K items');
            expect(formatDisplay(42, '~ ', ' records')).toBe('~ 42 records');
        });

        it('should show zeroText when count is 0', () => {
            const getDisplayValue = (count: number, zeroText?: string) => {
                if (count === 0 && zeroText) {
                    return zeroText;
                }
                return formatCount(count);
            };

            expect(getDisplayValue(0, 'No items')).toBe('No items');
            expect(getDisplayValue(0, undefined)).toBe('0');
            expect(getDisplayValue(5, 'No items')).toBe('5');
        });
    });

    describe('Link behavior', () => {
        it('should determine navigation target', () => {
            const getTarget = (linkTarget?: '_self' | '_blank') => {
                return linkTarget || '_self';
            };

            expect(getTarget()).toBe('_self');
            expect(getTarget('_self')).toBe('_self');
            expect(getTarget('_blank')).toBe('_blank');
        });

        it('should check if widget is clickable', () => {
            const isClickable = (link?: string) => !!link;

            expect(isClickable('/admin/orders')).toBe(true);
            expect(isClickable(undefined)).toBe(false);
            expect(isClickable('')).toBe(false);
        });
    });

    describe('Auto-refresh', () => {
        it('should calculate refresh interval in ms', () => {
            const getIntervalMs = (seconds: number) => seconds * 1000;

            expect(getIntervalMs(60)).toBe(60000);
            expect(getIntervalMs(30)).toBe(30000);
            expect(getIntervalMs(0)).toBe(0);
        });

        it('should check if refresh is enabled', () => {
            const isRefreshEnabled = (interval?: number) => {
                return interval !== undefined && interval > 0;
            };

            expect(isRefreshEnabled(60)).toBe(true);
            expect(isRefreshEnabled(0)).toBe(false);
            expect(isRefreshEnabled(undefined)).toBe(false);
        });
    });
});
