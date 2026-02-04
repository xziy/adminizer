import * as React from "react";
import { useState, useMemo, useCallback } from "react";
import {
    PlusIcon,
    SearchIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    LoaderIcon,
    FilterIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FilterListItem } from "./FilterListItem";
import {
    FilterSidebarProps,
    FilterSidebarLabels,
    defaultFilterSidebarLabels,
    groupFilters,
    SavedFilter,
} from "./types";
import { cn } from "@/lib/utils";

/**
 * FilterSidebar - Sidebar component for saved filters
 *
 * Features:
 * - Grouped filters (pinned, my, shared, system)
 * - Search/filter
 * - Collapsible groups
 * - Actions (edit, delete, duplicate, pin)
 * - Loading state
 *
 * @example
 * ```tsx
 * <FilterSidebar
 *   filters={filters}
 *   currentFilterId={activeFilterId}
 *   modelName="Order"
 *   onSelectFilter={(filter) => applyFilter(filter.id)}
 *   onCreateFilter={() => openCreateDialog()}
 *   onEditFilter={(filter) => openEditDialog(filter)}
 *   onDeleteFilter={(filter) => deleteFilter(filter.id)}
 *   onTogglePin={(filter) => togglePin(filter.id)}
 * />
 * ```
 */
export function FilterSidebar({
    filters,
    currentFilterId,
    modelName,
    onSelectFilter,
    onCreateFilter,
    onEditFilter,
    onDeleteFilter,
    onTogglePin,
    onDuplicateFilter,
    isLoading = false,
    canCreate = true,
    canEdit = true,
    labels: customLabels,
}: FilterSidebarProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

    const labels: FilterSidebarLabels = useMemo(
        () => ({ ...defaultFilterSidebarLabels, ...customLabels }),
        [customLabels]
    );

    // Filter by search term
    const filteredFilters = useMemo(() => {
        if (!searchTerm) return filters;
        const term = searchTerm.toLowerCase();
        return filters.filter(
            f =>
                f.name.toLowerCase().includes(term) ||
                f.description?.toLowerCase().includes(term)
        );
    }, [filters, searchTerm]);

    // Group filters
    const groups = useMemo(
        () => groupFilters(filteredFilters, undefined, labels),
        [filteredFilters, labels]
    );

    // Initialize collapsed state for groups with defaultCollapsed
    React.useEffect(() => {
        const defaultCollapsed = new Set<string>();
        groups.forEach(group => {
            if (group.defaultCollapsed) {
                defaultCollapsed.add(group.key);
            }
        });
        setCollapsedGroups(prev => {
            // Only set if not already set
            if (prev.size === 0 && defaultCollapsed.size > 0) {
                return defaultCollapsed;
            }
            return prev;
        });
    }, [groups]);

    // Toggle group collapse
    const toggleGroup = useCallback((key: string) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    }, []);

    // Check if user can edit a filter
    const canEditFilter = useCallback(
        (filter: SavedFilter) => {
            if (!canEdit) return false;
            // Can always edit own filters
            // System filters require admin
            if (filter.isSystemFilter) return false;
            return true;
        },
        [canEdit]
    );

    return (
        <div className="filter-sidebar flex flex-col h-full">
            {/* Header */}
            <div className="px-3 py-2 border-b">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                        <FilterIcon className="size-4" />
                        {labels.title}
                    </h3>
                    {canCreate && onCreateFilter && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={onCreateFilter}
                            title={labels.createFilter}
                        >
                            <PlusIcon className="size-4" />
                        </Button>
                    )}
                </div>

                {/* Search */}
                <div className="relative">
                    <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={labels.searchPlaceholder}
                        className="pl-8 h-8"
                    />
                </div>
            </div>

            {/* Filter list */}
            <ScrollArea className="flex-1">
                <div className="p-2">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8 text-muted-foreground">
                            <LoaderIcon className="size-5 animate-spin mr-2" />
                            Loading...
                        </div>
                    ) : groups.length === 0 ? (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                            {searchTerm ? (
                                <>No filters matching "{searchTerm}"</>
                            ) : (
                                labels.noFilters
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {groups.map((group) => (
                                <div key={group.key}>
                                    {group.collapsible ? (
                                        <Collapsible
                                            open={!collapsedGroups.has(group.key)}
                                            onOpenChange={() => toggleGroup(group.key)}
                                        >
                                            <CollapsibleTrigger asChild>
                                                <button className="flex items-center gap-1 w-full px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                                                    {collapsedGroups.has(group.key) ? (
                                                        <ChevronRightIcon className="size-3" />
                                                    ) : (
                                                        <ChevronDownIcon className="size-3" />
                                                    )}
                                                    {group.label}
                                                    <span className="ml-auto text-xs">
                                                        ({group.filters.length})
                                                    </span>
                                                </button>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent>
                                                <div className="mt-1 space-y-0.5">
                                                    {group.filters.map((filter) => (
                                                        <FilterListItem
                                                            key={filter.id}
                                                            filter={filter}
                                                            isActive={filter.id === currentFilterId}
                                                            labels={labels}
                                                            onSelect={() => onSelectFilter(filter)}
                                                            onEdit={onEditFilter ? () => onEditFilter(filter) : undefined}
                                                            onDelete={onDeleteFilter ? () => onDeleteFilter(filter) : undefined}
                                                            onDuplicate={onDuplicateFilter ? () => onDuplicateFilter(filter) : undefined}
                                                            onTogglePin={onTogglePin ? () => onTogglePin(filter) : undefined}
                                                            canEdit={canEditFilter(filter)}
                                                        />
                                                    ))}
                                                </div>
                                            </CollapsibleContent>
                                        </Collapsible>
                                    ) : (
                                        <>
                                            <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                                                {group.label}
                                            </div>
                                            <div className="mt-1 space-y-0.5">
                                                {group.filters.map((filter) => (
                                                    <FilterListItem
                                                        key={filter.id}
                                                        filter={filter}
                                                        isActive={filter.id === currentFilterId}
                                                        labels={labels}
                                                        onSelect={() => onSelectFilter(filter)}
                                                        onEdit={onEditFilter ? () => onEditFilter(filter) : undefined}
                                                        onDelete={onDeleteFilter ? () => onDeleteFilter(filter) : undefined}
                                                        onDuplicate={onDuplicateFilter ? () => onDuplicateFilter(filter) : undefined}
                                                        onTogglePin={onTogglePin ? () => onTogglePin(filter) : undefined}
                                                        canEdit={canEditFilter(filter)}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

export default FilterSidebar;
