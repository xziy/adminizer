/**
 * Filter History Types
 *
 * Types and utilities for tracking recently used filters
 */

export interface FilterHistoryEntry {
    id: string;
    name: string;
    modelName: string;
    slug?: string;
    accessedAt: string;
    resultCount?: number;
}

export interface FilterHistoryProps {
    /** Current model name to filter history for specific model */
    modelName?: string;
    /** Maximum entries to display */
    maxEntries?: number;
    /** Called when a filter is selected from history */
    onSelectFilter: (entry: FilterHistoryEntry) => void;
    /** Called when history is cleared */
    onClearHistory?: () => void;
    /** Whether to show the clear button */
    showClearButton?: boolean;
    /** Custom labels */
    labels?: Partial<FilterHistoryLabels>;
    /** Custom class name */
    className?: string;
}

export interface FilterHistoryLabels {
    title: string;
    noHistory: string;
    clearHistory: string;
    clearConfirm: string;
    accessedAt: string;
    allModels: string;
}

export const defaultFilterHistoryLabels: FilterHistoryLabels = {
    title: 'Recent Filters',
    noHistory: 'No recent filters',
    clearHistory: 'Clear History',
    clearConfirm: 'Clear filter history?',
    accessedAt: 'Accessed',
    allModels: 'All models',
};

/** Storage key for filter history in localStorage */
export const FILTER_HISTORY_STORAGE_KEY = 'adminizer_filter_history';

/** Default max history entries */
export const DEFAULT_MAX_HISTORY_ENTRIES = 10;

/**
 * Get filter history from localStorage
 */
export function getFilterHistory(): FilterHistoryEntry[] {
    if (typeof window === 'undefined') return [];

    try {
        const stored = localStorage.getItem(FILTER_HISTORY_STORAGE_KEY);
        if (!stored) return [];
        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed)) return [];
        return parsed;
    } catch {
        return [];
    }
}

/**
 * Add a filter to history
 */
export function addToFilterHistory(
    entry: Omit<FilterHistoryEntry, 'accessedAt'>,
    maxEntries: number = DEFAULT_MAX_HISTORY_ENTRIES
): FilterHistoryEntry[] {
    if (typeof window === 'undefined') return [];

    const history = getFilterHistory();

    // Remove existing entry with same ID
    const filtered = history.filter(h => h.id !== entry.id);

    // Add new entry at the beginning
    const newEntry: FilterHistoryEntry = {
        ...entry,
        accessedAt: new Date().toISOString(),
    };

    const updated = [newEntry, ...filtered].slice(0, maxEntries);

    try {
        localStorage.setItem(FILTER_HISTORY_STORAGE_KEY, JSON.stringify(updated));
    } catch {
        // localStorage might be full or disabled
    }

    return updated;
}

/**
 * Remove a specific entry from history
 */
export function removeFromFilterHistory(filterId: string): FilterHistoryEntry[] {
    if (typeof window === 'undefined') return [];

    const history = getFilterHistory();
    const updated = history.filter(h => h.id !== filterId);

    try {
        localStorage.setItem(FILTER_HISTORY_STORAGE_KEY, JSON.stringify(updated));
    } catch {
        // Ignore errors
    }

    return updated;
}

/**
 * Clear all filter history
 */
export function clearFilterHistory(): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.removeItem(FILTER_HISTORY_STORAGE_KEY);
    } catch {
        // Ignore errors
    }
}

/**
 * Filter history entries by model name
 */
export function filterHistoryByModel(
    history: FilterHistoryEntry[],
    modelName?: string
): FilterHistoryEntry[] {
    if (!modelName) return history;
    return history.filter(h => h.modelName === modelName);
}

/**
 * Format access time for display
 */
export function formatAccessTime(dateString: string): string {
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

    // Show time for entries from today
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    }

    // Show date for older entries
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Get unique model names from history
 */
export function getHistoryModelNames(history: FilterHistoryEntry[]): string[] {
    const models = new Set(history.map(h => h.modelName));
    return Array.from(models).sort();
}
