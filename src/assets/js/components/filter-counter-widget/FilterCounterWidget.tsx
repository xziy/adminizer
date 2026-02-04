import * as React from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCwIcon, AlertCircleIcon, ExternalLinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import MaterialIcon from "@/components/material-icon";
import {
    FilterCounterWidgetProps,
    FilterCounterWidgetLabels,
    FilterCounterState,
    CountResponse,
    defaultFilterCounterWidgetLabels,
    sizeClasses,
    formatCount,
    formatLastUpdated,
} from "./types";
import { cn } from "@/lib/utils";
import axios from "axios";

/**
 * FilterCounterWidget - Dashboard widget showing filter result count
 *
 * Features:
 * - Fetches count from filter API
 * - Auto-refresh support
 * - Loading/error states
 * - Customizable appearance
 * - Click to navigate to filter
 *
 * @example
 * ```tsx
 * <FilterCounterWidget
 *   filterId="pending-orders"
 *   isSlug={true}
 *   title="Pending Orders"
 *   icon="shopping_cart"
 *   backgroundColor="#ff9800"
 *   suffix=" orders"
 *   refreshInterval={60}
 *   link="/admin/model/Order?filterId=xxx"
 * />
 * ```
 */
export function FilterCounterWidget({
    filterId,
    isSlug = false,
    title,
    description,
    icon = "filter_list",
    backgroundColor = "#3b82f6",
    textColor = "#ffffff",
    link,
    linkTarget = "_self",
    prefix = "",
    suffix = "",
    zeroText,
    errorText,
    refreshInterval = 0,
    apiEndpoint,
    size = "md",
    className,
    labels: customLabels,
}: FilterCounterWidgetProps) {
    const [state, setState] = useState<FilterCounterState>({
        count: null,
        isLoading: true,
        error: null,
        lastUpdated: null,
    });

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const mountedRef = useRef(true);

    const labels: FilterCounterWidgetLabels = React.useMemo(
        () => ({ ...defaultFilterCounterWidgetLabels, ...customLabels }),
        [customLabels]
    );

    const sizeClass = sizeClasses[size];

    // Build API URL
    const getApiUrl = useCallback(() => {
        if (apiEndpoint) return apiEndpoint;

        const routePrefix = window.routePrefix || '/adminizer';
        if (isSlug) {
            return `${routePrefix}/filters/by-slug/${filterId}/count`;
        }
        return `${routePrefix}/filters/${filterId}/count`;
    }, [filterId, isSlug, apiEndpoint]);

    // Fetch count from API
    const fetchCount = useCallback(async () => {
        if (!mountedRef.current) return;

        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const response = await axios.get<CountResponse>(getApiUrl());

            if (!mountedRef.current) return;

            if (response.data.success && response.data.count !== undefined) {
                setState({
                    count: response.data.count,
                    isLoading: false,
                    error: null,
                    lastUpdated: new Date(),
                });
            } else {
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    error: response.data.error || labels.error,
                }));
            }
        } catch (err: any) {
            if (!mountedRef.current) return;

            setState(prev => ({
                ...prev,
                isLoading: false,
                error: err?.response?.data?.error || err?.message || labels.error,
            }));
        }
    }, [getApiUrl, labels.error]);

    // Initial fetch and auto-refresh
    useEffect(() => {
        mountedRef.current = true;
        fetchCount();

        if (refreshInterval > 0) {
            intervalRef.current = setInterval(fetchCount, refreshInterval * 1000);
        }

        return () => {
            mountedRef.current = false;
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [fetchCount, refreshInterval]);

    // Handle click
    const handleClick = useCallback(() => {
        if (!link) return;

        if (linkTarget === "_blank") {
            window.open(link, "_blank");
        } else {
            window.location.href = link;
        }
    }, [link, linkTarget]);

    // Render count display
    const renderCount = () => {
        if (state.isLoading && state.count === null) {
            return <Skeleton className="h-8 w-16 bg-white/20" />;
        }

        if (state.error) {
            return (
                <div className="flex items-center gap-2 text-sm opacity-90">
                    <AlertCircleIcon className="size-4" />
                    <span>{errorText || state.error}</span>
                </div>
            );
        }

        if (state.count === 0 && zeroText) {
            return <span className={sizeClass.count}>{zeroText}</span>;
        }

        return (
            <span className={cn("font-bold", sizeClass.count)}>
                {prefix}
                {state.count !== null ? formatCount(state.count) : "—"}
                {suffix}
            </span>
        );
    };

    const content = (
        <>
            {/* Icon */}
            <div className={cn("mb-2", sizeClass.icon)}>
                <MaterialIcon name={icon} />
            </div>

            {/* Count */}
            <div className="mb-1">{renderCount()}</div>

            {/* Title */}
            <div className={cn("font-medium", sizeClass.title)}>{title}</div>

            {/* Description */}
            {description && (
                <div className="text-sm opacity-80 mt-1">{description}</div>
            )}

            {/* Last updated */}
            {state.lastUpdated && !state.error && (
                <div className="text-xs opacity-60 mt-2 flex items-center gap-1">
                    {state.isLoading && (
                        <RefreshCwIcon className="size-3 animate-spin" />
                    )}
                    {labels.lastUpdated}: {formatLastUpdated(state.lastUpdated)}
                </div>
            )}

            {/* External link indicator */}
            {link && linkTarget === "_blank" && (
                <ExternalLinkIcon className="absolute top-2 right-2 size-4 opacity-50" />
            )}

            {/* Retry button on error */}
            {state.error && (
                <Button
                    variant="secondary"
                    size="sm"
                    className="mt-2 bg-white/20 hover:bg-white/30"
                    onClick={(e) => {
                        e.stopPropagation();
                        fetchCount();
                    }}
                >
                    <RefreshCwIcon className="size-3 mr-1" />
                    {labels.retry}
                </Button>
            )}
        </>
    );

    return (
        <div
            className={cn(
                "filter-counter-widget relative rounded-lg text-center transition-all",
                sizeClass.container,
                link && "cursor-pointer hover:opacity-90 hover:scale-[1.02]",
                className
            )}
            style={{
                backgroundColor,
                color: textColor,
            }}
            onClick={link ? handleClick : undefined}
            role={link ? "button" : undefined}
            tabIndex={link ? 0 : undefined}
            onKeyDown={link ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleClick();
                }
            } : undefined}
        >
            {content}
        </div>
    );
}

/**
 * Hook for managing filter counter state externally
 */
export function useFilterCounter(filterId: string, options?: {
    isSlug?: boolean;
    refreshInterval?: number;
    apiEndpoint?: string;
}) {
    const [state, setState] = useState<FilterCounterState>({
        count: null,
        isLoading: true,
        error: null,
        lastUpdated: null,
    });

    const refresh = useCallback(async () => {
        setState(prev => ({ ...prev, isLoading: true }));

        try {
            const routePrefix = window.routePrefix || '/adminizer';
            const url = options?.apiEndpoint ||
                (options?.isSlug
                    ? `${routePrefix}/filters/by-slug/${filterId}/count`
                    : `${routePrefix}/filters/${filterId}/count`);

            const response = await axios.get<CountResponse>(url);

            if (response.data.success && response.data.count !== undefined) {
                setState({
                    count: response.data.count,
                    isLoading: false,
                    error: null,
                    lastUpdated: new Date(),
                });
            } else {
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    error: response.data.error || 'Error',
                }));
            }
        } catch (err: any) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: err?.message || 'Error',
            }));
        }
    }, [filterId, options?.isSlug, options?.apiEndpoint]);

    useEffect(() => {
        refresh();

        if (options?.refreshInterval && options.refreshInterval > 0) {
            const interval = setInterval(refresh, options.refreshInterval * 1000);
            return () => clearInterval(interval);
        }
    }, [refresh, options?.refreshInterval]);

    return { ...state, refresh };
}

export default FilterCounterWidget;
