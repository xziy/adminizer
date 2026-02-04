/**
 * Filter Counter Widget Types
 */

export interface FilterCounterWidgetProps {
    /** Filter ID or slug */
    filterId: string;
    /** Whether filterId is a slug */
    isSlug?: boolean;
    /** Widget title */
    title: string;
    /** Optional description */
    description?: string;
    /** Material icon name */
    icon?: string;
    /** Background CSS color */
    backgroundColor?: string;
    /** Text color */
    textColor?: string;
    /** Link to navigate on click */
    link?: string;
    /** Link target */
    linkTarget?: '_self' | '_blank';
    /** Prefix text before count */
    prefix?: string;
    /** Suffix text after count */
    suffix?: string;
    /** Text to show when count is 0 */
    zeroText?: string;
    /** Text to show on error */
    errorText?: string;
    /** Auto-refresh interval in seconds (0 = disabled) */
    refreshInterval?: number;
    /** API endpoint to fetch count */
    apiEndpoint?: string;
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Custom class name */
    className?: string;
    /** Labels for i18n */
    labels?: Partial<FilterCounterWidgetLabels>;
}

export interface FilterCounterWidgetLabels {
    loading: string;
    error: string;
    retry: string;
    lastUpdated: string;
}

export const defaultFilterCounterWidgetLabels: FilterCounterWidgetLabels = {
    loading: 'Loading...',
    error: 'Error loading data',
    retry: 'Retry',
    lastUpdated: 'Updated',
};

export interface FilterCounterState {
    count: number | null;
    isLoading: boolean;
    error: string | null;
    lastUpdated: Date | null;
}

export interface CountResponse {
    success: boolean;
    count?: number;
    error?: string;
}

export const sizeClasses = {
    sm: {
        container: 'p-3',
        icon: 'text-2xl',
        count: 'text-2xl',
        title: 'text-sm',
    },
    md: {
        container: 'p-4',
        icon: 'text-3xl',
        count: 'text-3xl',
        title: 'text-base',
    },
    lg: {
        container: 'p-6',
        icon: 'text-4xl',
        count: 'text-4xl',
        title: 'text-lg',
    },
};

export function formatCount(count: number): string {
    if (count >= 1_000_000) {
        return `${(count / 1_000_000).toFixed(1)}M`;
    }
    if (count >= 1_000) {
        return `${(count / 1_000).toFixed(1)}K`;
    }
    return count.toLocaleString();
}

export function formatLastUpdated(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);

    if (diffSecs < 60) return 'just now';
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
    if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;

    return date.toLocaleTimeString();
}
