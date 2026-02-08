import { type FC, useCallback, useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Eye,
  EyeOff,
  GripVertical,
  Pencil,
  PencilOff,
  Plus,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ColumnFieldInfo = {
  name: string;
  label?: string;
  title?: string;
  type?: string;
  inlineEditable?: boolean;
};

export type ColumnConfig = {
  fieldName: string;
  order: number;
  isVisible: boolean;
  isEditable: boolean;
  width?: number;
};

const COLUMN_WIDTH_MIN = 80;
const COLUMN_WIDTH_MAX = 600;

export const normalizeColumnWidth = (
  value: string | number | null | undefined
): number | undefined => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  const rounded = Math.round(parsed);
  if (rounded <= 0) {
    return undefined;
  }
  return Math.min(Math.max(rounded, COLUMN_WIDTH_MIN), COLUMN_WIDTH_MAX);
};

export const normalizeColumnOrder = (columns: ColumnConfig[]): ColumnConfig[] => {
  return columns.map((column, index) => ({
    ...column,
    order: index
  }));
};

export const addColumnToSelection = (
  columns: ColumnConfig[],
  field: ColumnFieldInfo
): ColumnConfig[] => {
  if (columns.some((column) => column.fieldName === field.name)) {
    return columns;
  }
  return normalizeColumnOrder([
    ...columns,
    {
      fieldName: field.name,
      order: columns.length,
      isVisible: true,
      isEditable: Boolean(field.inlineEditable),
      width: undefined
    }
  ]);
};

export const removeColumnFromSelection = (
  columns: ColumnConfig[],
  fieldName: string
): ColumnConfig[] => {
  return normalizeColumnOrder(
    columns.filter((column) => column.fieldName !== fieldName)
  );
};

export const toggleColumnVisibility = (
  columns: ColumnConfig[],
  fieldName: string
): ColumnConfig[] => {
  return normalizeColumnOrder(
    columns.map((column) =>
      column.fieldName === fieldName
        ? { ...column, isVisible: !column.isVisible }
        : column
    )
  );
};

export const toggleColumnEditable = (
  columns: ColumnConfig[],
  fieldName: string
): ColumnConfig[] => {
  return normalizeColumnOrder(
    columns.map((column) =>
      column.fieldName === fieldName
        ? { ...column, isEditable: !column.isEditable }
        : column
    )
  );
};

export const reorderColumns = (
  columns: ColumnConfig[],
  activeId: string,
  overId?: string
): ColumnConfig[] => {
  if (!overId || activeId === overId) {
    return columns;
  }
  const oldIndex = columns.findIndex((column) => column.fieldName === activeId);
  const newIndex = columns.findIndex((column) => column.fieldName === overId);
  if (oldIndex === -1 || newIndex === -1) {
    return columns;
  }
  return normalizeColumnOrder(arrayMove(columns, oldIndex, newIndex));
};

type ColumnSelectorProps = {
  availableFields: ColumnFieldInfo[];
  selectedColumns: ColumnConfig[];
  onChange: (columns: ColumnConfig[]) => void;
  className?: string;
};

const getFieldLabel = (field: ColumnFieldInfo): string => {
  return field.label ?? field.title ?? field.name;
};

const SortableColumnItem: FC<{
  column: ColumnConfig;
  label: string;
  canEdit: boolean;
  onToggleVisible: () => void;
  onToggleEditable: () => void;
  onWidthChange: (width?: number) => void;
  onRemove: () => void;
}> = ({
  column,
  label,
  canEdit,
  onToggleVisible,
  onToggleEditable,
  onWidthChange,
  onRemove
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: column.fieldName });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };
  const widthValue = column.width ?? "";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-md border bg-muted/20 px-2 py-2",
        isDragging && "shadow-lg"
      )}
    >
      <button
        type="button"
        className="cursor-grab text-muted-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex flex-1 flex-col">
        <span className="text-sm font-medium">{label}</span>
        {column.fieldName !== label && (
          <span className="text-xs text-muted-foreground">{column.fieldName}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          inputMode="numeric"
          min={COLUMN_WIDTH_MIN}
          max={COLUMN_WIDTH_MAX}
          step={10}
          value={widthValue}
          placeholder="Auto"
          title="Column width (px)"
          className="h-8 w-20 text-xs"
          onChange={(event) => onWidthChange(normalizeColumnWidth(event.target.value))}
        />
        <Button
          type="button"
          size="icon"
          variant={column.isVisible ? "secondary" : "outline"}
          onClick={onToggleVisible}
        >
          {column.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </Button>
        <Button
          type="button"
          size="icon"
          variant={column.isEditable ? "secondary" : "outline"}
          onClick={onToggleEditable}
          disabled={!canEdit}
        >
          {column.isEditable ? <Pencil className="h-4 w-4" /> : <PencilOff className="h-4 w-4" />}
        </Button>
        <Button type="button" size="icon" variant="ghost" onClick={onRemove}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export const ColumnSelector: FC<ColumnSelectorProps> = ({
  availableFields,
  selectedColumns,
  onChange,
  className
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const orderedColumns = useMemo(() => {
    return [...selectedColumns].sort((a, b) => {
      const orderA = Number.isFinite(a.order) ? a.order : 0;
      const orderB = Number.isFinite(b.order) ? b.order : 0;
      return orderA - orderB;
    });
  }, [selectedColumns]);

  const selectedSet = useMemo(() => {
    return new Set(orderedColumns.map((column) => column.fieldName));
  }, [orderedColumns]);

  const filteredFields = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return availableFields.filter((field) => {
      if (selectedSet.has(field.name)) {
        return false;
      }
      if (!term) {
        return true;
      }
      return (
        field.name.toLowerCase().includes(term) ||
        getFieldLabel(field).toLowerCase().includes(term)
      );
    });
  }, [availableFields, searchTerm, selectedSet]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const commitColumns = useCallback(
    (next: ColumnConfig[]) => {
      onChange(normalizeColumnOrder(next));
    },
    [onChange]
  );

  const handleDragEnd = useCallback(
    (event: { active: { id: string }; over?: { id: string } }) => {
      const next = reorderColumns(orderedColumns, event.active.id, event.over?.id);
      if (next === orderedColumns) {
        return;
      }
      commitColumns(next);
    },
    [commitColumns, orderedColumns]
  );

  const handleAdd = useCallback(
    (field: ColumnFieldInfo) => {
      if (selectedSet.has(field.name)) {
        return;
      }
      commitColumns(addColumnToSelection(orderedColumns, field));
    },
    [commitColumns, orderedColumns, selectedSet]
  );

  const handleRemove = useCallback(
    (fieldName: string) => {
      commitColumns(removeColumnFromSelection(orderedColumns, fieldName));
    },
    [commitColumns, orderedColumns]
  );

  const handleToggleVisible = useCallback(
    (fieldName: string) => {
      commitColumns(toggleColumnVisibility(orderedColumns, fieldName));
    },
    [commitColumns, orderedColumns]
  );

  const handleToggleEditable = useCallback(
    (fieldName: string) => {
      commitColumns(toggleColumnEditable(orderedColumns, fieldName));
    },
    [commitColumns, orderedColumns]
  );

  const handleWidthChange = useCallback(
    (fieldName: string, nextWidth?: number) => {
      commitColumns(
        orderedColumns.map((column) =>
          column.fieldName === fieldName ? { ...column, width: nextWidth } : column
        )
      );
    },
    [commitColumns, orderedColumns]
  );

  return (
    <div className={cn("grid gap-4 md:grid-cols-2", className)}>
      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-semibold">Available Fields</h4>
          <p className="text-xs text-muted-foreground">
            Select columns to add them to the filter layout.
          </p>
        </div>
        <Input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search fields..."
        />
        <div className="max-h-72 space-y-2 overflow-y-auto rounded-md border p-3">
          {filteredFields.length === 0 && (
            <div className="text-xs text-muted-foreground">
              {searchTerm ? "No matching fields." : "All fields are selected."}
            </div>
          )}
          {filteredFields.map((field) => (
            <div
              key={field.name}
              className="flex items-center justify-between gap-2 rounded-md border border-transparent px-2 py-1 hover:border-muted-foreground/30"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{getFieldLabel(field)}</p>
                <p className="text-xs text-muted-foreground">{field.type ?? "field"}</p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => handleAdd(field)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-semibold">
            Selected Columns ({orderedColumns.length})
          </h4>
          <p className="text-xs text-muted-foreground">
            Drag to reorder, toggle visibility, set widths, and mark editable columns.
          </p>
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={orderedColumns.map((column) => column.fieldName)} strategy={verticalListSortingStrategy}>
            <div className="max-h-72 space-y-2 overflow-y-auto rounded-md border p-3">
              {orderedColumns.length === 0 && (
                <div className="text-xs text-muted-foreground">
                  No columns selected yet.
                </div>
              )}
              {orderedColumns.map((column) => {
                const field = availableFields.find(
                  (item) => item.name === column.fieldName
                );
                const canEdit = Boolean(field?.inlineEditable);
                return (
                  <SortableColumnItem
                    key={column.fieldName}
                    column={column}
                    label={field ? getFieldLabel(field) : column.fieldName}
                    canEdit={canEdit}
                    onToggleVisible={() => handleToggleVisible(column.fieldName)}
                    onToggleEditable={() => handleToggleEditable(column.fieldName)}
                    onWidthChange={(nextWidth) => handleWidthChange(column.fieldName, nextWidth)}
                    onRemove={() => handleRemove(column.fieldName)}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
};

export default ColumnSelector;
