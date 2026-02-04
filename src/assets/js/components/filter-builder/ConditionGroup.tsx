import * as React from "react";
import { PlusIcon, Trash2Icon, FolderPlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ConditionRow } from "./ConditionRow";
import {
    FilterCondition,
    FieldConfig,
    FilterBuilderLabels,
    createEmptyCondition,
    createConditionGroup,
} from "./types";
import { cn } from "@/lib/utils";

interface ConditionGroupProps {
    condition: FilterCondition;
    fields: FieldConfig[];
    labels: FilterBuilderLabels;
    onChange: (condition: FilterCondition) => void;
    onRemove?: () => void;
    depth: number;
    maxDepth: number;
    isRoot?: boolean;
}

export function ConditionGroup({
    condition,
    fields,
    labels,
    onChange,
    onRemove,
    depth,
    maxDepth,
    isRoot = false,
}: ConditionGroupProps) {
    const children = condition.children || [];
    const canAddGroup = depth < maxDepth;

    const handleLogicChange = (logic: string) => {
        onChange({
            ...condition,
            logic: logic as 'AND' | 'OR' | 'NOT',
        });
    };

    const handleChildChange = (index: number, child: FilterCondition) => {
        const newChildren = [...children];
        newChildren[index] = child;
        onChange({
            ...condition,
            children: newChildren,
        });
    };

    const handleChildRemove = (index: number) => {
        const newChildren = children.filter((_, i) => i !== index);
        onChange({
            ...condition,
            children: newChildren,
        });
    };

    const handleAddCondition = () => {
        onChange({
            ...condition,
            children: [...children, createEmptyCondition()],
        });
    };

    const handleAddGroup = () => {
        if (!canAddGroup) return;
        onChange({
            ...condition,
            children: [...children, createConditionGroup()],
        });
    };

    const isGroup = (child: FilterCondition) => {
        return child.logic !== undefined && child.children !== undefined;
    };

    // Logic badge colors
    const logicColors: Record<string, string> = {
        AND: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
        OR: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
        NOT: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    };

    return (
        <div
            className={cn(
                "relative rounded-lg border p-3",
                depth === 0 ? "border-border" : "border-dashed border-muted-foreground/30",
                depth > 0 && "ml-4 mt-2"
            )}
        >
            {/* Group header */}
            <div className="flex items-center gap-2 mb-3">
                {/* Logic selector */}
                <Select
                    value={condition.logic || 'AND'}
                    onValueChange={handleLogicChange}
                >
                    <SelectTrigger className={cn("w-20 h-7 text-xs font-medium", logicColors[condition.logic || 'AND'])}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="AND">{labels.and}</SelectItem>
                        <SelectItem value="OR">{labels.or}</SelectItem>
                        <SelectItem value="NOT">{labels.not}</SelectItem>
                    </SelectContent>
                </Select>

                <span className="text-xs text-muted-foreground">
                    {condition.logic === 'NOT'
                        ? 'Match none of the following:'
                        : condition.logic === 'OR'
                            ? 'Match any of the following:'
                            : 'Match all of the following:'}
                </span>

                {/* Remove group button (not for root) */}
                {!isRoot && onRemove && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onRemove}
                        className="ml-auto text-muted-foreground hover:text-destructive h-7 px-2"
                    >
                        <Trash2Icon className="size-3.5 mr-1" />
                        {labels.removeGroup}
                    </Button>
                )}
            </div>

            {/* Conditions */}
            <div className="space-y-2">
                {children.map((child, index) => (
                    <div key={child.id} className="relative">
                        {/* Connector line */}
                        {index > 0 && (
                            <div className="absolute -top-1 left-4 w-px h-2 bg-border" />
                        )}

                        {isGroup(child) ? (
                            <ConditionGroup
                                condition={child}
                                fields={fields}
                                labels={labels}
                                onChange={(updated) => handleChildChange(index, updated)}
                                onRemove={() => handleChildRemove(index)}
                                depth={depth + 1}
                                maxDepth={maxDepth}
                            />
                        ) : (
                            <ConditionRow
                                condition={child}
                                fields={fields}
                                labels={labels}
                                onChange={(updated) => handleChildChange(index, updated)}
                                onRemove={() => handleChildRemove(index)}
                                canRemove={children.length > 1 || !isRoot}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Add buttons */}
            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-dashed">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAddCondition}
                    className="h-7 text-xs"
                >
                    <PlusIcon className="size-3.5 mr-1" />
                    {labels.addCondition}
                </Button>

                {canAddGroup && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleAddGroup}
                        className="h-7 text-xs"
                    >
                        <FolderPlusIcon className="size-3.5 mr-1" />
                        {labels.addGroup}
                    </Button>
                )}
            </div>
        </div>
    );
}

export default ConditionGroup;
