import * as React from "react";
import { useState, useCallback } from "react";
import { PencilIcon, LoaderIcon, AlertCircleIcon } from "lucide-react";
import { InlineEditor } from "./InlineEditor";
import {
    EditableCellProps,
    InlineEditLabels,
    defaultInlineEditLabels,
} from "./types";
import { cn } from "@/lib/utils";

/**
 * EditableCell - Click-to-edit table cell component
 *
 * Features:
 * - Click to enter edit mode
 * - Inline editing with type-specific inputs
 * - Save/Cancel with keyboard shortcuts (Enter/Escape)
 * - Loading and error states
 * - Hover edit icon
 *
 * @example
 * ```tsx
 * <EditableCell
 *   value={row.name}
 *   fieldName="name"
 *   recordId={row.id}
 *   config={{
 *     fieldName: 'name',
 *     label: 'Name',
 *     type: 'string',
 *     isEditable: true,
 *     validation: { required: true, maxLength: 100 }
 *   }}
 *   onSave={async (fieldName, value) => {
 *     await api.updateRecord(row.id, { [fieldName]: value });
 *   }}
 * />
 * ```
 */
export function EditableCell({
    value,
    fieldName,
    recordId,
    config,
    onSave,
    labels: customLabels,
}: EditableCellProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editValue, setEditValue] = useState(value);

    const labels: InlineEditLabels = React.useMemo(
        () => ({ ...defaultInlineEditLabels, ...customLabels }),
        [customLabels]
    );

    // Start editing
    const handleStartEdit = useCallback(() => {
        if (!config.isEditable || isSaving) return;
        setEditValue(value);
        setError(null);
        setIsEditing(true);
    }, [config.isEditable, isSaving, value]);

    // Cancel editing
    const handleCancel = useCallback(() => {
        setIsEditing(false);
        setEditValue(value);
        setError(null);
    }, [value]);

    // Save changes
    const handleSave = useCallback(async () => {
        if (editValue === value) {
            setIsEditing(false);
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            await onSave(fieldName, editValue);
            setIsEditing(false);
        } catch (err: any) {
            setError(err?.message || labels.error);
        } finally {
            setIsSaving(false);
        }
    }, [editValue, value, fieldName, onSave, labels.error]);

    // Format display value
    const displayValue = React.useMemo(() => {
        if (value === null || value === undefined) {
            return <span className="text-muted-foreground italic">—</span>;
        }

        switch (config.type) {
            case 'boolean':
                return value ? 'Yes' : 'No';

            case 'select':
                const option = config.options?.find(o => String(o.value) === String(value));
                return option?.label || String(value);

            case 'json':
                return (
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {typeof value === 'string' ? value : JSON.stringify(value)}
                    </code>
                );

            case 'date':
                if (!value) return '—';
                try {
                    return new Date(value).toLocaleDateString();
                } catch {
                    return String(value);
                }

            case 'datetime':
                if (!value) return '—';
                try {
                    return new Date(value).toLocaleString();
                } catch {
                    return String(value);
                }

            default:
                return String(value);
        }
    }, [value, config.type, config.options]);

    // Edit mode
    if (isEditing) {
        return (
            <div className="editable-cell editing min-w-[150px]">
                <InlineEditor
                    value={editValue}
                    type={config.type}
                    onChange={setEditValue}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    validation={config.validation}
                    options={config.options}
                    disabled={isSaving}
                    labels={labels}
                />
            </div>
        );
    }

    // Display mode
    return (
        <div
            className={cn(
                "editable-cell group relative",
                config.isEditable && "cursor-pointer hover:bg-accent/50 rounded px-1 -mx-1"
            )}
            onClick={handleStartEdit}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleStartEdit();
                }
            }}
            tabIndex={config.isEditable ? 0 : undefined}
            role={config.isEditable ? "button" : undefined}
            title={config.isEditable ? labels.edit : undefined}
        >
            {/* Value */}
            <span className={cn(
                "inline-flex items-center gap-1",
                isSaving && "opacity-50"
            )}>
                {isSaving ? (
                    <>
                        <LoaderIcon className="size-3 animate-spin" />
                        <span className="text-muted-foreground">{labels.saving}</span>
                    </>
                ) : error ? (
                    <>
                        <AlertCircleIcon className="size-3 text-destructive" />
                        <span className="text-destructive">{error}</span>
                    </>
                ) : (
                    displayValue
                )}
            </span>

            {/* Edit icon on hover */}
            {config.isEditable && !isSaving && !error && (
                <PencilIcon
                    className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 absolute -right-4 top-1/2 -translate-y-1/2 transition-opacity"
                />
            )}
        </div>
    );
}

export default EditableCell;
