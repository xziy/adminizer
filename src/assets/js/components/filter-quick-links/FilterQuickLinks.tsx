import * as React from "react";
import { useMemo } from "react";
import {
    FilterIcon,
    ChevronRightIcon,
    LoaderIcon,
    StarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    FilterQuickLinksProps,
    FilterQuickLinksLabels,
    QuickLinkFilter,
    defaultFilterQuickLinksLabels,
    buildFilterUrl,
    formatResultCount,
    truncateFilterName,
    DEFAULT_MAX_LINKS,
    DEFAULT_ROUTE_PREFIX,
} from "./types";
import { cn } from "@/lib/utils";

/**
 * FilterQuickLinks - Quick access links to pinned/favorite filters
 *
 * Features:
 * - Displays pinned filters as navigation links
 * - Shows result counts (optional)
 * - Compact and full modes
 * - Active state indication
 *
 * @example
 * ```tsx
 * <FilterQuickLinks
 *   filters={pinnedFilters}
 *   activeFilterId={currentFilterId}
 *   onFilterClick={(filter) => navigateToFilter(filter)}
 *   showCounts={true}
 * />
 * ```
 */
export function FilterQuickLinks({
    filters,
    activeFilterId,
    onFilterClick,
    isLoading = false,
    routePrefix = DEFAULT_ROUTE_PREFIX,
    maxLinks = DEFAULT_MAX_LINKS,
    labels: customLabels,
    showCounts = false,
    compact = false,
    className,
}: FilterQuickLinksProps) {
    const labels: FilterQuickLinksLabels = useMemo(
        () => ({ ...defaultFilterQuickLinksLabels, ...customLabels }),
        [customLabels]
    );

    // Limit displayed filters
    const displayedFilters = useMemo(
        () => filters.slice(0, maxLinks),
        [filters, maxLinks]
    );

    const hasMore = filters.length > maxLinks;

    if (isLoading) {
        return (
            <div className={cn("filter-quick-links p-2", className)}>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <LoaderIcon className="size-4 animate-spin" />
                    {labels.loading}
                </div>
            </div>
        );
    }

    if (filters.length === 0) {
        return (
            <div className={cn("filter-quick-links p-2", className)}>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <StarIcon className="size-4 opacity-50" />
                    {labels.noLinks}
                </div>
            </div>
        );
    }

    // Compact mode - horizontal chips
    if (compact) {
        return (
            <div className={cn("filter-quick-links", className)}>
                <div className="flex flex-wrap gap-1.5">
                    {displayedFilters.map((filter) => (
                        <TooltipProvider key={filter.id}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={activeFilterId === filter.id ? "default" : "outline"}
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => onFilterClick(filter)}
                                    >
                                        <FilterIcon className="size-3 mr-1" />
                                        {truncateFilterName(filter.name, 15)}
                                        {showCounts && filter.resultCount !== undefined && (
                                            <Badge variant="secondary" className="ml-1 text-[10px] px-1">
                                                {formatResultCount(filter.resultCount)}
                                            </Badge>
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{filter.name}</p>
                                    <p className="text-xs text-muted-foreground">{filter.modelName}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ))}
                    {hasMore && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                            +{filters.length - maxLinks} more
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    // Full mode - vertical list
    return (
        <div className={cn("filter-quick-links", className)}>
            {/* Title */}
            <div className="px-2 py-1 text-xs font-medium text-muted-foreground flex items-center gap-1">
                <StarIcon className="size-3" />
                {labels.title}
            </div>

            {/* Links */}
            <div className="space-y-0.5">
                {displayedFilters.map((filter) => (
                    <QuickLinkItem
                        key={filter.id}
                        filter={filter}
                        isActive={activeFilterId === filter.id}
                        onClick={() => onFilterClick(filter)}
                        showCount={showCounts}
                    />
                ))}
            </div>

            {/* View all link */}
            {hasMore && (
                <div className="px-2 pt-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between h-7 text-xs"
                    >
                        {labels.viewAll}
                        <ChevronRightIcon className="size-3" />
                    </Button>
                </div>
            )}
        </div>
    );
}

interface QuickLinkItemProps {
    filter: QuickLinkFilter;
    isActive: boolean;
    onClick: () => void;
    showCount: boolean;
}

function QuickLinkItem({ filter, isActive, onClick, showCount }: QuickLinkItemProps) {
    return (
        <button
            className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm",
                "hover:bg-accent transition-colors text-left",
                isActive && "bg-accent font-medium"
            )}
            onClick={onClick}
        >
            <FilterIcon className={cn(
                "size-4 shrink-0",
                isActive ? "text-primary" : "text-muted-foreground"
            )} />

            <span className="flex-1 truncate">{filter.name}</span>

            {showCount && filter.resultCount !== undefined && (
                <Badge variant="secondary" className="text-xs shrink-0">
                    {formatResultCount(filter.resultCount)}
                </Badge>
            )}

            <ChevronRightIcon className="size-3 text-muted-foreground shrink-0" />
        </button>
    );
}

/**
 * Hook for fetching pinned filters
 *
 * @example
 * ```tsx
 * const { filters, isLoading, refetch } = usePinnedFilters(modelName);
 * ```
 */
export function usePinnedFilters(modelName?: string) {
    const [filters, setFilters] = React.useState<QuickLinkFilter[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    const fetchFilters = React.useCallback(async () => {
        setIsLoading(true);
        try {
            // This would typically be an API call
            // const response = await fetch('/adminizer/filters?pinned=true');
            // const data = await response.json();
            // setFilters(data.filters);
            setFilters([]);
        } catch (error) {
            console.error('Failed to fetch pinned filters:', error);
        } finally {
            setIsLoading(false);
        }
    }, [modelName]);

    React.useEffect(() => {
        fetchFilters();
    }, [fetchFilters]);

    return {
        filters,
        isLoading,
        refetch: fetchFilters,
    };
}

export default FilterQuickLinks;
