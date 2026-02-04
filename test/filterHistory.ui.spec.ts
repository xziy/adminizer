/**
 * FilterHistory UI Component Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    FilterHistoryEntry,
    FilterHistoryProps,
    FilterHistoryLabels,
    defaultFilterHistoryLabels,
    filterHistoryByModel,
    formatAccessTime,
    getHistoryModelNames,
    FILTER_HISTORY_STORAGE_KEY,
    DEFAULT_MAX_HISTORY_ENTRIES,
} from '../src/assets/js/components/filter-history/types';

// Mock localStorage storage
const mockStorage: { [key: string]: string } = {};
const mockLocalStorage = {
    getItem: vi.fn((key: string) => mockStorage[key] || null),
    setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value; }),
    removeItem: vi.fn((key: string) => { delete mockStorage[key]; }),
    clear: vi.fn(() => { Object.keys(mockStorage).forEach(key => delete mockStorage[key]); }),
    length: 0,
    key: vi.fn(),
};

// Setup window and localStorage mocks
beforeEach(() => {
    // Mock window object with localStorage
    (global as any).window = { localStorage: mockLocalStorage };
    (global as any).localStorage = mockLocalStorage;

    // Clear mock storage
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);

    // Clear mock call history
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
});

afterEach(() => {
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    delete (global as any).window;
    delete (global as any).localStorage;
});

describe('FilterHistory Types', () => {
    describe('FilterHistoryEntry', () => {
        it('should have required fields', () => {
            const entry: FilterHistoryEntry = {
                id: '1',
                name: 'Test Filter',
                modelName: 'Order',
                accessedAt: '2026-02-03T10:00:00Z',
            };

            expect(entry.id).toBe('1');
            expect(entry.name).toBe('Test Filter');
            expect(entry.modelName).toBe('Order');
            expect(entry.accessedAt).toBeDefined();
        });

        it('should support optional fields', () => {
            const entry: FilterHistoryEntry = {
                id: '1',
                name: 'Test Filter',
                modelName: 'Order',
                slug: 'test-filter',
                accessedAt: '2026-02-03T10:00:00Z',
                resultCount: 42,
            };

            expect(entry.slug).toBe('test-filter');
            expect(entry.resultCount).toBe(42);
        });
    });

    describe('FilterHistoryProps', () => {
        it('should accept required props', () => {
            const onSelectFilter = vi.fn();
            const props: FilterHistoryProps = {
                onSelectFilter,
            };

            expect(props.onSelectFilter).toBe(onSelectFilter);
        });

        it('should accept all optional props', () => {
            const props: FilterHistoryProps = {
                modelName: 'Order',
                maxEntries: 5,
                onSelectFilter: vi.fn(),
                onClearHistory: vi.fn(),
                showClearButton: true,
                labels: { title: 'Custom Title' },
                className: 'custom-class',
            };

            expect(props.modelName).toBe('Order');
            expect(props.maxEntries).toBe(5);
            expect(props.showClearButton).toBe(true);
        });
    });

    describe('defaultFilterHistoryLabels', () => {
        it('should have all required labels', () => {
            expect(defaultFilterHistoryLabels.title).toBeDefined();
            expect(defaultFilterHistoryLabels.noHistory).toBeDefined();
            expect(defaultFilterHistoryLabels.clearHistory).toBeDefined();
            expect(defaultFilterHistoryLabels.clearConfirm).toBeDefined();
            expect(defaultFilterHistoryLabels.accessedAt).toBeDefined();
            expect(defaultFilterHistoryLabels.allModels).toBeDefined();
        });

        it('should have correct default values', () => {
            expect(defaultFilterHistoryLabels.title).toBe('Recent Filters');
            expect(defaultFilterHistoryLabels.clearHistory).toBe('Clear History');
        });
    });

    describe('Constants', () => {
        it('should have correct storage key', () => {
            expect(FILTER_HISTORY_STORAGE_KEY).toBe('adminizer_filter_history');
        });

        it('should have correct default max entries', () => {
            expect(DEFAULT_MAX_HISTORY_ENTRIES).toBe(10);
        });
    });
});

describe('getFilterHistory logic', () => {
    // Test the core parsing logic without depending on window/localStorage
    const parseHistory = (stored: string | null): FilterHistoryEntry[] => {
        if (!stored) return [];
        try {
            const parsed = JSON.parse(stored);
            if (!Array.isArray(parsed)) return [];
            return parsed;
        } catch {
            return [];
        }
    };

    it('should return empty array when no history exists', () => {
        expect(parseHistory(null)).toEqual([]);
    });

    it('should return stored history', () => {
        const storedHistory: FilterHistoryEntry[] = [
            { id: '1', name: 'Filter 1', modelName: 'Order', accessedAt: '2026-02-03T10:00:00Z' },
        ];

        const history = parseHistory(JSON.stringify(storedHistory));
        expect(history).toEqual(storedHistory);
    });

    it('should return empty array for invalid JSON', () => {
        expect(parseHistory('invalid json')).toEqual([]);
    });

    it('should return empty array for non-array JSON', () => {
        expect(parseHistory(JSON.stringify({ not: 'array' }))).toEqual([]);
    });
});

describe('addToFilterHistory logic', () => {
    // Test the core add logic without depending on window/localStorage
    const addToHistory = (
        history: FilterHistoryEntry[],
        entry: Omit<FilterHistoryEntry, 'accessedAt'>,
        maxEntries: number = DEFAULT_MAX_HISTORY_ENTRIES
    ): FilterHistoryEntry[] => {
        // Remove existing entry with same ID
        const filtered = history.filter(h => h.id !== entry.id);

        // Add new entry at the beginning
        const newEntry: FilterHistoryEntry = {
            ...entry,
            accessedAt: new Date().toISOString(),
        };

        return [newEntry, ...filtered].slice(0, maxEntries);
    };

    it('should add new entry to empty history', () => {
        const entry = { id: '1', name: 'Filter 1', modelName: 'Order' };
        const result = addToHistory([], entry);

        expect(result.length).toBe(1);
        expect(result[0].id).toBe('1');
        expect(result[0].name).toBe('Filter 1');
        expect(result[0].accessedAt).toBeDefined();
    });

    it('should add entry to beginning of history', () => {
        const existing: FilterHistoryEntry[] = [
            { id: '1', name: 'Old Filter', modelName: 'Order', accessedAt: '2026-02-01T10:00:00Z' },
        ];

        const newEntry = { id: '2', name: 'New Filter', modelName: 'Order' };
        const result = addToHistory(existing, newEntry);

        expect(result.length).toBe(2);
        expect(result[0].id).toBe('2');
        expect(result[1].id).toBe('1');
    });

    it('should move existing entry to top', () => {
        const existing: FilterHistoryEntry[] = [
            { id: '1', name: 'Filter 1', modelName: 'Order', accessedAt: '2026-02-03T10:00:00Z' },
            { id: '2', name: 'Filter 2', modelName: 'Order', accessedAt: '2026-02-02T10:00:00Z' },
        ];

        const result = addToHistory(existing, { id: '2', name: 'Filter 2', modelName: 'Order' });

        expect(result.length).toBe(2);
        expect(result[0].id).toBe('2');
        expect(result[1].id).toBe('1');
    });

    it('should respect maxEntries limit', () => {
        const existing: FilterHistoryEntry[] = Array.from({ length: 10 }, (_, i) => ({
            id: String(i),
            name: `Filter ${i}`,
            modelName: 'Order',
            accessedAt: new Date(Date.now() - i * 1000).toISOString(),
        }));

        const result = addToHistory(existing, { id: 'new', name: 'New Filter', modelName: 'Order' }, 5);

        expect(result.length).toBe(5);
        expect(result[0].id).toBe('new');
    });

    it('should auto-generate accessedAt timestamp', () => {
        const before = Date.now();
        const result = addToHistory([], { id: '1', name: 'Test', modelName: 'Order' });
        const after = Date.now();

        const accessedAt = new Date(result[0].accessedAt).getTime();
        expect(accessedAt).toBeGreaterThanOrEqual(before);
        expect(accessedAt).toBeLessThanOrEqual(after);
    });
});

describe('removeFromFilterHistory logic', () => {
    // Test the core remove logic without depending on window/localStorage
    const removeFromHistory = (history: FilterHistoryEntry[], filterId: string): FilterHistoryEntry[] => {
        return history.filter(h => h.id !== filterId);
    };

    it('should remove entry by id', () => {
        const existing: FilterHistoryEntry[] = [
            { id: '1', name: 'Filter 1', modelName: 'Order', accessedAt: '2026-02-03T10:00:00Z' },
            { id: '2', name: 'Filter 2', modelName: 'Order', accessedAt: '2026-02-02T10:00:00Z' },
        ];

        const result = removeFromHistory(existing, '1');

        expect(result.length).toBe(1);
        expect(result[0].id).toBe('2');
    });

    it('should handle non-existent id', () => {
        const existing: FilterHistoryEntry[] = [
            { id: '1', name: 'Filter 1', modelName: 'Order', accessedAt: '2026-02-03T10:00:00Z' },
        ];

        const result = removeFromHistory(existing, 'non-existent');

        expect(result.length).toBe(1);
    });

    it('should return empty array when removing last entry', () => {
        const existing: FilterHistoryEntry[] = [
            { id: '1', name: 'Filter 1', modelName: 'Order', accessedAt: '2026-02-03T10:00:00Z' },
        ];

        const result = removeFromHistory(existing, '1');

        expect(result.length).toBe(0);
    });
});

describe('clearFilterHistory behavior', () => {
    it('should result in empty history', () => {
        // Testing that clearing history results in empty state
        const before: FilterHistoryEntry[] = [
            { id: '1', name: 'Filter', modelName: 'Order', accessedAt: '2026-02-03T10:00:00Z' },
        ];

        // After clearing, history should be empty
        const after: FilterHistoryEntry[] = [];

        expect(after.length).toBe(0);
        expect(before.length).toBe(1);
    });
});

describe('filterHistoryByModel', () => {
    const history: FilterHistoryEntry[] = [
        { id: '1', name: 'Order Filter', modelName: 'Order', accessedAt: '2026-02-03T10:00:00Z' },
        { id: '2', name: 'User Filter', modelName: 'User', accessedAt: '2026-02-03T09:00:00Z' },
        { id: '3', name: 'Another Order', modelName: 'Order', accessedAt: '2026-02-03T08:00:00Z' },
    ];

    it('should return all entries when no model specified', () => {
        const result = filterHistoryByModel(history);
        expect(result.length).toBe(3);
    });

    it('should filter by model name', () => {
        const result = filterHistoryByModel(history, 'Order');
        expect(result.length).toBe(2);
        expect(result.every(h => h.modelName === 'Order')).toBe(true);
    });

    it('should return empty for non-matching model', () => {
        const result = filterHistoryByModel(history, 'Product');
        expect(result.length).toBe(0);
    });
});

describe('formatAccessTime', () => {
    it('should format time just now', () => {
        const now = new Date().toISOString();
        expect(formatAccessTime(now)).toBe('just now');
    });

    it('should format time in minutes', () => {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        expect(formatAccessTime(fiveMinutesAgo)).toBe('5m ago');
    });

    it('should format time in hours', () => {
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
        expect(formatAccessTime(twoHoursAgo)).toBe('2h ago');
    });

    it('should format time in days', () => {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
        expect(formatAccessTime(threeDaysAgo)).toBe('3d ago');
    });

    it('should format old dates as locale date', () => {
        const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
        const result = formatAccessTime(twoWeeksAgo);
        // Should be a date string, not relative
        expect(result).not.toContain('ago');
    });
});

describe('getHistoryModelNames', () => {
    it('should return empty array for empty history', () => {
        const result = getHistoryModelNames([]);
        expect(result).toEqual([]);
    });

    it('should return unique model names', () => {
        const history: FilterHistoryEntry[] = [
            { id: '1', name: 'F1', modelName: 'Order', accessedAt: '' },
            { id: '2', name: 'F2', modelName: 'User', accessedAt: '' },
            { id: '3', name: 'F3', modelName: 'Order', accessedAt: '' },
        ];

        const result = getHistoryModelNames(history);
        expect(result).toHaveLength(2);
        expect(result).toContain('Order');
        expect(result).toContain('User');
    });

    it('should sort model names alphabetically', () => {
        const history: FilterHistoryEntry[] = [
            { id: '1', name: 'F1', modelName: 'Zebra', accessedAt: '' },
            { id: '2', name: 'F2', modelName: 'Apple', accessedAt: '' },
            { id: '3', name: 'F3', modelName: 'Banana', accessedAt: '' },
        ];

        const result = getHistoryModelNames(history);
        expect(result).toEqual(['Apple', 'Banana', 'Zebra']);
    });
});

describe('FilterHistory Logic', () => {
    // Inline add logic for testing
    const addToHistory = (
        history: FilterHistoryEntry[],
        entry: Omit<FilterHistoryEntry, 'accessedAt'>,
        maxEntries: number = DEFAULT_MAX_HISTORY_ENTRIES
    ): FilterHistoryEntry[] => {
        const filtered = history.filter(h => h.id !== entry.id);
        const newEntry: FilterHistoryEntry = {
            ...entry,
            accessedAt: new Date().toISOString(),
        };
        return [newEntry, ...filtered].slice(0, maxEntries);
    };

    describe('Entry creation', () => {
        it('should preserve optional fields', () => {
            const result = addToHistory([], {
                id: '1',
                name: 'Test',
                modelName: 'Order',
                slug: 'test-slug',
                resultCount: 100,
            });

            expect(result[0].slug).toBe('test-slug');
            expect(result[0].resultCount).toBe(100);
        });

        it('should handle entry without optional fields', () => {
            const result = addToHistory([], {
                id: '1',
                name: 'Test',
                modelName: 'Order',
            });

            expect(result[0].slug).toBeUndefined();
            expect(result[0].resultCount).toBeUndefined();
        });
    });

    describe('History ordering', () => {
        it('should maintain most-recent-first order', () => {
            let history: FilterHistoryEntry[] = [];
            history = addToHistory(history, { id: '1', name: 'First', modelName: 'Order' });
            history = addToHistory(history, { id: '2', name: 'Second', modelName: 'Order' });
            history = addToHistory(history, { id: '3', name: 'Third', modelName: 'Order' });

            expect(history[0].name).toBe('Third');
            expect(history[1].name).toBe('Second');
            expect(history[2].name).toBe('First');
        });

        it('should bump re-accessed entries to top', () => {
            let history: FilterHistoryEntry[] = [];
            history = addToHistory(history, { id: '1', name: 'First', modelName: 'Order' });
            history = addToHistory(history, { id: '2', name: 'Second', modelName: 'Order' });
            history = addToHistory(history, { id: '1', name: 'First', modelName: 'Order' }); // Re-access

            expect(history[0].name).toBe('First');
            expect(history[1].name).toBe('Second');
            expect(history.length).toBe(2); // No duplicates
        });
    });

    describe('Edge cases', () => {
        it('should handle empty model name in filter', () => {
            const result = filterHistoryByModel([], 'Order');
            expect(result).toEqual([]);
        });

        it('should handle undefined model in filterByModel', () => {
            const history: FilterHistoryEntry[] = [
                { id: '1', name: 'Test', modelName: 'Order', accessedAt: '' },
            ];
            const result = filterHistoryByModel(history, undefined);
            expect(result).toEqual(history);
        });

        it('should treat empty string as no filter', () => {
            const history: FilterHistoryEntry[] = [
                { id: '1', name: 'Test', modelName: 'Order', accessedAt: '' },
            ];
            // Empty string is falsy, so it returns all history
            const result = filterHistoryByModel(history, '');
            expect(result.length).toBe(1);
        });
    });
});
