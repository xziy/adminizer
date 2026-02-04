import * as React from "react";
import {
    FilterIcon,
    MoreVerticalIcon,
    PencilIcon,
    Trash2Icon,
    CopyIcon,
    PinIcon,
    PinOffIcon,
    GlobeIcon,
    LockIcon,
    UsersIcon,
    SettingsIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    SavedFilter,
    FilterSidebarLabels,
    formatRelativeTime,
} from "./types";
import { cn } from "@/lib/utils";

interface FilterListItemProps {
    filter: SavedFilter;
    isActive: boolean;
    labels: FilterSidebarLabels;
    onSelect: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    onDuplicate?: () => void;
    onTogglePin?: () => void;
    canEdit?: boolean;
}

export function FilterListItem({
    filter,
    isActive,
    labels,
    onSelect,
    onEdit,
    onDelete,
    onDuplicate,
    onTogglePin,
    canEdit = false,
}: FilterListItemProps) {
    const visibilityIcon = React.useMemo(() => {
        switch (filter.visibility) {
            case 'public':
                return <GlobeIcon className="size-3" />;
            case 'groups':
                return <UsersIcon className="size-3" />;
            case 'system':
                return <SettingsIcon className="size-3" />;
            default:
                return <LockIcon className="size-3" />;
        }
    }, [filter.visibility]);

    const visibilityLabel = React.useMemo(() => {
        switch (filter.visibility) {
            case 'public':
                return labels.public;
            case 'groups':
                return labels.groups;
            case 'system':
                return labels.system;
            default:
                return labels.private;
        }
    }, [filter.visibility, labels]);

    const hasActions = onEdit || onDelete || onDuplicate || onTogglePin;

    return (
        <div
            className={cn(
                "group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer",
                "hover:bg-accent transition-colors",
                isActive && "bg-accent"
            )}
            onClick={onSelect}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect();
                }
            }}
        >
            {/* Icon */}
            <FilterIcon className={cn(
                "size-4 shrink-0",
                isActive ? "text-primary" : "text-muted-foreground"
            )} />

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    {/* Name */}
                    <span className={cn(
                        "text-sm truncate",
                        isActive && "font-medium"
                    )}>
                        {filter.name}
                    </span>

                    {/* Pin indicator */}
                    {filter.isPinned && (
                        <PinIcon className="size-3 text-amber-500 shrink-0" />
                    )}

                    {/* Visibility badge */}
                    <span
                        className="flex items-center gap-0.5 text-muted-foreground shrink-0"
                        title={visibilityLabel}
                    >
                        {visibilityIcon}
                    </span>
                </div>

                {/* Meta info */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {filter.resultCount !== undefined && (
                        <span>{filter.resultCount} {labels.results}</span>
                    )}
                    <span>{formatRelativeTime(filter.updatedAt)}</span>
                </div>
            </div>

            {/* Actions menu */}
            {hasActions && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <MoreVerticalIcon className="size-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        {onTogglePin && (
                            <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                onTogglePin();
                            }}>
                                {filter.isPinned ? (
                                    <>
                                        <PinOffIcon className="size-4 mr-2" />
                                        {labels.unpinFilter}
                                    </>
                                ) : (
                                    <>
                                        <PinIcon className="size-4 mr-2" />
                                        {labels.pinFilter}
                                    </>
                                )}
                            </DropdownMenuItem>
                        )}

                        {onDuplicate && (
                            <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                onDuplicate();
                            }}>
                                <CopyIcon className="size-4 mr-2" />
                                {labels.duplicateFilter}
                            </DropdownMenuItem>
                        )}

                        {canEdit && onEdit && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit();
                                }}>
                                    <PencilIcon className="size-4 mr-2" />
                                    {labels.editFilter}
                                </DropdownMenuItem>
                            </>
                        )}

                        {canEdit && onDelete && (
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete();
                                }}
                                className="text-destructive focus:text-destructive"
                            >
                                <Trash2Icon className="size-4 mr-2" />
                                {labels.deleteFilter}
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    );
}

export default FilterListItem;
