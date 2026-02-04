import * as React from "react";
import { useState, useMemo, useCallback } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { PlusIcon, SearchIcon, ColumnsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    ColumnConfig,
    ColumnSelectorProps,
    ColumnSelectorLabels,
    defaultColumnSelectorLabels,
    FieldDefinition,
} from "./types";
import { DraggableColumnItem } from "./DraggableColumnItem";
import { cn } from "@/lib/utils";

/**
 * ColumnSelector - Component for selecting and reordering table columns
 *
 * Features:
 * - Add/remove columns from available fields
 * - Drag-and-drop reordering
 * - Toggle visibility
 * - Toggle editable (inline edit)
 * - Custom width per column
 *
 * @example
 * ```tsx
 * <ColumnSelector
 *   columns={columns}
 *   availableFields={[
 *     { name: 'id', label: 'ID', type: 'number' },
 *     { name: 'name', label: 'Name', type: 'string' },
 *     { name: 'email', label: 'Email', type: 'string' },
 *   ]}
 *   onChange={setColumns}
 * />
 * ```
 */
export function ColumnSelector({
    columns,
    availableFields,
    onChange,
    labels: customLabels,
    maxColumns = 50,
    allowReorder = true,
    allowResize = false,
    allowEdit = false,
}: ColumnSelectorProps) {
    const [searchTerm, setSearchTerm] = useState("");

    const labels: ColumnSelectorLabels = useMemo(
        () => ({ ...defaultColumnSelectorLabels, ...customLabels }),
        [customLabels]
    );

    // Get fields that are not yet selected
    const availableForSelection = useMemo(() => {
        const selectedNames = new Set(columns.map((c) => c.fieldName));
        return availableFields.filter((f) => !selectedNames.has(f.name));
    }, [columns, availableFields]);

    // Filter available fields by search term
    const filteredAvailable = useMemo(() => {
        if (!searchTerm) return availableForSelection;
        const term = searchTerm.toLowerCase();
        return availableForSelection.filter(
            (f) =>
                f.name.toLowerCase().includes(term) ||
                f.label.toLowerCase().includes(term)
        );
    }, [availableForSelection, searchTerm]);

    // Add a column
    const handleAddColumn = useCallback(
        (field: FieldDefinition) => {
            if (columns.length >= maxColumns) return;

            const newColumn: ColumnConfig = {
                fieldName: field.name,
                label: field.label,
                order: columns.length,
                isVisible: true,
                isEditable: false,
                type: field.type,
            };

            onChange([...columns, newColumn]);
        },
        [columns, maxColumns, onChange]
    );

    // Remove a column
    const handleRemoveColumn = useCallback(
        (index: number) => {
            const newColumns = columns.filter((_, i) => i !== index);
            // Update order
            onChange(newColumns.map((c, i) => ({ ...c, order: i })));
        },
        [columns, onChange]
    );

    // Move column (drag-and-drop)
    const handleMoveColumn = useCallback(
        (dragIndex: number, hoverIndex: number) => {
            const newColumns = [...columns];
            const draggedColumn = newColumns[dragIndex];

            // Remove from old position
            newColumns.splice(dragIndex, 1);
            // Insert at new position
            newColumns.splice(hoverIndex, 0, draggedColumn);

            // Update order
            onChange(newColumns.map((c, i) => ({ ...c, order: i })));
        },
        [columns, onChange]
    );

    // Toggle visibility
    const handleToggleVisible = useCallback(
        (index: number) => {
            const newColumns = [...columns];
            newColumns[index] = {
                ...newColumns[index],
                isVisible: !newColumns[index].isVisible,
            };
            onChange(newColumns);
        },
        [columns, onChange]
    );

    // Toggle editable
    const handleToggleEditable = useCallback(
        (index: number) => {
            const newColumns = [...columns];
            newColumns[index] = {
                ...newColumns[index],
                isEditable: !newColumns[index].isEditable,
            };
            onChange(newColumns);
        },
        [columns, onChange]
    );

    // Change width
    const handleWidthChange = useCallback(
        (index: number, width: number | undefined) => {
            const newColumns = [...columns];
            newColumns[index] = {
                ...newColumns[index],
                width,
            };
            onChange(newColumns);
        },
        [columns, onChange]
    );

    // Add all available columns
    const handleAddAll = useCallback(() => {
        const newColumns = [...columns];
        for (const field of availableForSelection) {
            if (newColumns.length >= maxColumns) break;
            newColumns.push({
                fieldName: field.name,
                label: field.label,
                order: newColumns.length,
                isVisible: true,
                isEditable: false,
                type: field.type,
            });
        }
        onChange(newColumns);
    }, [columns, availableForSelection, maxColumns, onChange]);

    // Remove all columns
    const handleRemoveAll = useCallback(() => {
        onChange([]);
    }, [onChange]);

    const content = (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Available columns */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">{labels.availableColumns}</h4>
                    {availableForSelection.length > 0 && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleAddAll}
                            className="h-7 text-xs"
                        >
                            Add all
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

                {/* Available fields list */}
                <ScrollArea className="h-[250px] border rounded-md p-2">
                    {filteredAvailable.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                            {availableForSelection.length === 0
                                ? labels.allColumnsAdded
                                : "No matching columns"}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredAvailable.map((field) => (
                                <div
                                    key={field.name}
                                    className="flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer group"
                                    onClick={() => handleAddColumn(field)}
                                >
                                    <div className="flex items-center gap-2">
                                        <ColumnsIcon className="size-4 text-muted-foreground" />
                                        <span className="text-sm">{field.label}</span>
                                        {field.type && (
                                            <span className="text-xs text-muted-foreground">
                                                ({field.type})
                                            </span>
                                        )}
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                    >
                                        <PlusIcon className="size-3.5" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </div>

            {/* Selected columns */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">
                        {labels.selectedColumns} ({columns.length})
                    </h4>
                    {columns.length > 0 && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveAll}
                            className="h-7 text-xs text-destructive hover:text-destructive"
                        >
                            Remove all
                        </Button>
                    )}
                </div>

                {/* Selected columns list */}
                <ScrollArea className="h-[282px] border rounded-md p-2">
                    {columns.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                            {labels.noColumnsSelected}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {columns.map((column, index) => (
                                <DraggableColumnItem
                                    key={column.fieldName}
                                    column={column}
                                    index={index}
                                    labels={labels}
                                    onMove={handleMoveColumn}
                                    onRemove={() => handleRemoveColumn(index)}
                                    onToggleVisible={() => handleToggleVisible(index)}
                                    onToggleEditable={
                                        allowEdit ? () => handleToggleEditable(index) : undefined
                                    }
                                    onWidthChange={
                                        allowResize
                                            ? (w) => handleWidthChange(index, w)
                                            : undefined
                                    }
                                    allowReorder={allowReorder}
                                    allowResize={allowResize}
                                    allowEdit={allowEdit}
                                />
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </div>
        </div>
    );

    // Wrap with DndProvider
    return (
        <DndProvider backend={HTML5Backend}>
            <div className="column-selector">{content}</div>
        </DndProvider>
    );
}

/**
 * Hook for managing column selector state
 */
export function useColumnSelector(initialColumns: ColumnConfig[] = []) {
    const [columns, setColumns] = React.useState<ColumnConfig[]>(initialColumns);

    const reset = useCallback(() => {
        setColumns(initialColumns);
    }, [initialColumns]);

    const hasChanges = useMemo(() => {
        if (columns.length !== initialColumns.length) return true;
        return columns.some((c, i) => {
            const initial = initialColumns[i];
            return (
                c.fieldName !== initial?.fieldName ||
                c.order !== initial?.order ||
                c.isVisible !== initial?.isVisible ||
                c.isEditable !== initial?.isEditable ||
                c.width !== initial?.width
            );
        });
    }, [columns, initialColumns]);

    const visibleColumns = useMemo(
        () => columns.filter((c) => c.isVisible),
        [columns]
    );

    return {
        columns,
        setColumns,
        reset,
        hasChanges,
        visibleColumns,
    };
}

export default ColumnSelector;
