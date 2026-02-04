import * as React from "react";
import { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { GripVerticalIcon, Trash2Icon, EyeIcon, EyeOffIcon, PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ColumnConfig, ItemTypes, ColumnSelectorLabels } from "./types";
import { cn } from "@/lib/utils";

interface DragItem {
    index: number;
    id: string;
    type: string;
}

interface DraggableColumnItemProps {
    column: ColumnConfig;
    index: number;
    labels: ColumnSelectorLabels;
    onMove: (dragIndex: number, hoverIndex: number) => void;
    onRemove: () => void;
    onToggleVisible: () => void;
    onToggleEditable?: () => void;
    onWidthChange?: (width: number | undefined) => void;
    allowReorder: boolean;
    allowResize: boolean;
    allowEdit: boolean;
}

export function DraggableColumnItem({
    column,
    index,
    labels,
    onMove,
    onRemove,
    onToggleVisible,
    onToggleEditable,
    onWidthChange,
    allowReorder,
    allowResize,
    allowEdit,
}: DraggableColumnItemProps) {
    const ref = useRef<HTMLDivElement>(null);

    const [{ isDragging }, drag, preview] = useDrag({
        type: ItemTypes.COLUMN,
        item: (): DragItem => ({ id: column.fieldName, index, type: ItemTypes.COLUMN }),
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
        canDrag: allowReorder,
    });

    const [{ isOver }, drop] = useDrop<DragItem, void, { isOver: boolean }>({
        accept: ItemTypes.COLUMN,
        collect: (monitor) => ({
            isOver: monitor.isOver(),
        }),
        hover(item, monitor) {
            if (!ref.current || !allowReorder) {
                return;
            }

            const dragIndex = item.index;
            const hoverIndex = index;

            if (dragIndex === hoverIndex) {
                return;
            }

            const hoverBoundingRect = ref.current.getBoundingClientRect();
            const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
            const clientOffset = monitor.getClientOffset();

            if (!clientOffset) {
                return;
            }

            const hoverClientY = clientOffset.y - hoverBoundingRect.top;

            // Dragging downwards
            if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
                return;
            }

            // Dragging upwards
            if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
                return;
            }

            onMove(dragIndex, hoverIndex);
            item.index = hoverIndex;
        },
    });

    // Connect drag and drop refs
    if (allowReorder) {
        drag(drop(ref));
    }

    return (
        <div
            ref={ref}
            className={cn(
                "flex items-center gap-2 p-2 rounded-md border bg-background",
                "transition-all duration-150",
                isDragging && "opacity-50 border-dashed",
                isOver && "border-primary bg-primary/5",
                !column.isVisible && "opacity-60"
            )}
        >
            {/* Drag handle */}
            {allowReorder && (
                <div
                    className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                    title={labels.dragToReorder}
                >
                    <GripVerticalIcon className="size-4" />
                </div>
            )}

            {/* Column name */}
            <span className={cn(
                "flex-1 text-sm truncate",
                !column.isVisible && "text-muted-foreground line-through"
            )}>
                {column.label}
            </span>

            {/* Width input */}
            {allowResize && onWidthChange && (
                <Input
                    type="number"
                    value={column.width || ""}
                    onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                        onWidthChange(val);
                    }}
                    placeholder="Auto"
                    className="w-16 h-7 text-xs"
                    min={50}
                    max={500}
                />
            )}

            {/* Editable toggle */}
            {allowEdit && onToggleEditable && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "h-7 w-7",
                        column.isEditable && "text-primary"
                    )}
                    onClick={onToggleEditable}
                    title={labels.editable}
                >
                    <PencilIcon className="size-3.5" />
                </Button>
            )}

            {/* Visibility toggle */}
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                    "h-7 w-7",
                    !column.isVisible && "text-muted-foreground"
                )}
                onClick={onToggleVisible}
                title={labels.visible}
            >
                {column.isVisible ? (
                    <EyeIcon className="size-3.5" />
                ) : (
                    <EyeOffIcon className="size-3.5" />
                )}
            </Button>

            {/* Remove button */}
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={onRemove}
                title={labels.removeColumn}
            >
                <Trash2Icon className="size-3.5" />
            </Button>
        </div>
    );
}

export default DraggableColumnItem;
