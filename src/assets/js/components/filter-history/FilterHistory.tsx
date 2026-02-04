import * as React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
    HistoryIcon,
    XIcon,
    Trash2Icon,
    FilterIcon,
    ChevronDownIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
    FilterHistoryProps,
    FilterHistoryEntry,
    FilterHistoryLabels,
    defaultFilterHistoryLabels,
    getFilterHistory,
    clearFilterHistory,
    removeFromFilterHistory,
    filterHistoryByModel,
    formatAccessTime,
    getHistoryModelNames,
    DEFAULT_MAX_HISTORY_ENTRIES,
} from "./types";
import { cn } from "@/lib/utils";

/**
 * FilterHistory - Component showing recently accessed filters
 *
 * Features:
 * - Persists history in localStorage
 * - Filter by model name
 * - Clear history option
 * - Remove individual entries
 *
 * @example
 * ```tsx
 * <FilterHistory
 *   modelName="Order"
 *   onSelectFilter={(entry) => navigateToFilter(entry.id)}
 *   onClearHistory={() => console.log('History cleared')}
 * />
 * ```
 */
export function FilterHistory({
    modelName,
    maxEntries = DEFAULT_MAX_HISTORY_ENTRIES,
    onSelectFilter,
    onClearHistory,
    showClearButton = true,
    labels: customLabels,
    className,
}: FilterHistoryProps) {
    const [history, setHistory] = useState<FilterHistoryEntry[]>([]);
    const [selectedModel, setSelectedModel] = useState<string | undefined>(modelName);

    const labels: FilterHistoryLabels = useMemo(
        () => ({ ...defaultFilterHistoryLabels, ...customLabels }),
        [customLabels]
    );

    // Load history from localStorage on mount
    useEffect(() => {
        setHistory(getFilterHistory());
    }, []);

    // Update selectedModel if modelName prop changes
    useEffect(() => {
        setSelectedModel(modelName);
    }, [modelName]);

    // Filter history by selected model
    const filteredHistory = useMemo(
        () => filterHistoryByModel(history, selectedModel).slice(0, maxEntries),
        [history, selectedModel, maxEntries]
    );

    // Get unique model names for filter dropdown
    const modelNames = useMemo(
        () => getHistoryModelNames(history),
        [history]
    );

    // Handle clear history
    const handleClearHistory = useCallback(() => {
        clearFilterHistory();
        setHistory([]);
        onClearHistory?.();
    }, [onClearHistory]);

    // Handle remove single entry
    const handleRemoveEntry = useCallback((filterId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updated = removeFromFilterHistory(filterId);
        setHistory(updated);
    }, []);

    // Handle select filter
    const handleSelectFilter = useCallback((entry: FilterHistoryEntry) => {
        onSelectFilter(entry);
    }, [onSelectFilter]);

    if (history.length === 0) {
        return (
            <div className={cn("filter-history p-4 text-center text-muted-foreground", className)}>
                <HistoryIcon className="size-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{labels.noHistory}</p>
            </div>
        );
    }

    return (
        <div className={cn("filter-history", className)}>
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b">
                <h4 className="text-sm font-medium flex items-center gap-2">
                    <HistoryIcon className="size-4" />
                    {labels.title}
                </h4>

                <div className="flex items-center gap-1">
                    {/* Model filter dropdown (only if not pre-filtered) */}
                    {!modelName && modelNames.length > 1 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 text-xs">
                                    {selectedModel || labels.allModels}
                                    <ChevronDownIcon className="size-3 ml-1" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setSelectedModel(undefined)}>
                                    {labels.allModels}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {modelNames.map((model) => (
                                    <DropdownMenuItem
                                        key={model}
                                        onClick={() => setSelectedModel(model)}
                                    >
                                        {model}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    {/* Clear history button */}
                    {showClearButton && history.length > 0 && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    title={labels.clearHistory}
                                >
                                    <Trash2Icon className="size-3.5" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>{labels.clearHistory}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {labels.clearConfirm}
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleClearHistory}>
                                        Clear
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
            </div>

            {/* History list */}
            <ScrollArea className="max-h-64">
                <div className="p-2 space-y-0.5">
                    {filteredHistory.length === 0 ? (
                        <div className="text-center py-4 text-sm text-muted-foreground">
                            {labels.noHistory}
                        </div>
                    ) : (
                        filteredHistory.map((entry) => (
                            <div
                                key={entry.id}
                                className={cn(
                                    "group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer",
                                    "hover:bg-accent transition-colors"
                                )}
                                onClick={() => handleSelectFilter(entry)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handleSelectFilter(entry);
                                    }
                                }}
                            >
                                <FilterIcon className="size-4 shrink-0 text-muted-foreground" />

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-sm truncate">{entry.name}</span>
                                        {!selectedModel && (
                                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                                                {entry.modelName}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span>{formatAccessTime(entry.accessedAt)}</span>
                                        {entry.resultCount !== undefined && (
                                            <span>• {entry.resultCount} results</span>
                                        )}
                                    </div>
                                </div>

                                {/* Remove button */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                                    onClick={(e) => handleRemoveEntry(entry.id, e)}
                                    title="Remove from history"
                                >
                                    <XIcon className="size-3.5" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

/**
 * Hook for managing filter history
 *
 * @example
 * ```tsx
 * const { history, addEntry, removeEntry, clearHistory } = useFilterHistory('Order');
 *
 * // Add filter to history when selected
 * const handleSelectFilter = (filter) => {
 *   addEntry({ id: filter.id, name: filter.name, modelName: 'Order' });
 *   applyFilter(filter);
 * };
 * ```
 */
export function useFilterHistory(modelName?: string) {
    const [history, setHistory] = useState<FilterHistoryEntry[]>([]);

    useEffect(() => {
        setHistory(getFilterHistory());
    }, []);

    const filteredHistory = useMemo(
        () => filterHistoryByModel(history, modelName),
        [history, modelName]
    );

    const addEntry = useCallback((entry: Omit<FilterHistoryEntry, 'accessedAt'>) => {
        const { addToFilterHistory } = require('./types');
        const updated = addToFilterHistory(entry);
        setHistory(updated);
        return updated;
    }, []);

    const removeEntry = useCallback((filterId: string) => {
        const updated = removeFromFilterHistory(filterId);
        setHistory(updated);
        return updated;
    }, []);

    const clear = useCallback(() => {
        clearFilterHistory();
        setHistory([]);
    }, []);

    return {
        history: filteredHistory,
        allHistory: history,
        addEntry,
        removeEntry,
        clearHistory: clear,
    };
}

export default FilterHistory;
