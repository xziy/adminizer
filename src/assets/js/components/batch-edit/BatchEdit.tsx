import * as React from "react";
import { useState, useMemo, useCallback } from "react";
import {
    Edit3Icon,
    CheckIcon,
    XIcon,
    AlertTriangleIcon,
    LoaderIcon,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
    BatchEditProps,
    BatchEditLabels,
    BatchEditState,
    defaultBatchEditLabels,
    initialBatchEditState,
    getBatchEditableFields,
    getDefaultValue,
    formatSelectedMessage,
    formatSuccessMessage,
    formatPartialSuccessMessage,
    formatConfirmDescription,
    validateBatchValue,
} from "./types";
import { InlineEditConfig } from "../inline-edit/types";
import { cn } from "@/lib/utils";

/**
 * BatchEdit - Dialog for batch editing multiple records
 *
 * Features:
 * - Field selection from available editable fields
 * - Type-specific value input
 * - Confirmation before applying
 * - Progress and result feedback
 *
 * @example
 * ```tsx
 * <BatchEdit
 *   open={showBatchEdit}
 *   selectedIds={selectedRowIds}
 *   modelName="Order"
 *   fields={editableFields}
 *   onSubmit={async (field, value) => {
 *     const result = await api.batchUpdate(modelName, selectedRowIds, field, value);
 *     return result;
 *   }}
 *   onClose={() => setShowBatchEdit(false)}
 * />
 * ```
 */
export function BatchEdit({
    selectedIds,
    modelName,
    fields,
    onSubmit,
    onClose,
    open,
    labels: customLabels,
}: BatchEditProps) {
    const [state, setState] = useState<BatchEditState>(initialBatchEditState);

    const labels: BatchEditLabels = useMemo(
        () => ({ ...defaultBatchEditLabels, ...customLabels }),
        [customLabels]
    );

    // Get editable fields
    const editableFields = useMemo(
        () => getBatchEditableFields(fields),
        [fields]
    );

    // Get selected field config
    const selectedFieldConfig = useMemo(() => {
        if (!state.selectedField) return null;
        return editableFields.find(f => f.fieldName === state.selectedField) || null;
    }, [state.selectedField, editableFields]);

    // Handle field selection
    const handleFieldChange = useCallback((fieldName: string) => {
        const field = editableFields.find(f => f.fieldName === fieldName);
        setState(prev => ({
            ...prev,
            selectedField: fieldName,
            value: field ? getDefaultValue(field.type) : null,
            result: null,
        }));
    }, [editableFields]);

    // Handle value change
    const handleValueChange = useCallback((value: any) => {
        setState(prev => ({ ...prev, value, result: null }));
    }, []);

    // Handle submit click - show confirmation
    const handleSubmitClick = useCallback(() => {
        setState(prev => ({ ...prev, showConfirm: true }));
    }, []);

    // Handle confirm cancel
    const handleConfirmCancel = useCallback(() => {
        setState(prev => ({ ...prev, showConfirm: false }));
    }, []);

    // Handle confirmed submit
    const handleConfirmedSubmit = useCallback(async () => {
        if (!state.selectedField) return;

        setState(prev => ({ ...prev, showConfirm: false, isSubmitting: true }));

        try {
            const result = await onSubmit(state.selectedField, state.value);
            setState(prev => ({ ...prev, isSubmitting: false, result }));

            // Auto-close on full success after a delay
            if (result.success && (!result.errors || result.errors.length === 0)) {
                setTimeout(() => {
                    handleClose();
                }, 1500);
            }
        } catch (error) {
            setState(prev => ({
                ...prev,
                isSubmitting: false,
                result: {
                    success: false,
                    updatedCount: 0,
                    errors: [{ recordId: '', message: String(error) }],
                },
            }));
        }
    }, [state.selectedField, state.value, onSubmit]);

    // Handle close
    const handleClose = useCallback(() => {
        setState(initialBatchEditState);
        onClose();
    }, [onClose]);

    // Validate current value
    const validation = useMemo(() => {
        if (!selectedFieldConfig) return { valid: true };
        return validateBatchValue(state.value, selectedFieldConfig);
    }, [state.value, selectedFieldConfig]);

    // Render value editor based on field type
    const renderValueEditor = () => {
        if (!selectedFieldConfig) return null;

        const { type, options } = selectedFieldConfig;

        switch (type) {
            case 'boolean':
                return (
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="batch-value"
                            checked={state.value === true}
                            onCheckedChange={(checked) => handleValueChange(checked === true)}
                        />
                        <Label htmlFor="batch-value">
                            {state.value ? 'True' : 'False'}
                        </Label>
                    </div>
                );

            case 'select':
                return (
                    <Select
                        value={String(state.value || '')}
                        onValueChange={handleValueChange}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select value..." />
                        </SelectTrigger>
                        <SelectContent>
                            {options?.map((opt) => (
                                <SelectItem key={String(opt.value)} value={String(opt.value)}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );

            case 'text':
            case 'json':
                return (
                    <Textarea
                        value={type === 'json' ? JSON.stringify(state.value, null, 2) : (state.value || '')}
                        onChange={(e) => {
                            if (type === 'json') {
                                try {
                                    handleValueChange(JSON.parse(e.target.value));
                                } catch {
                                    // Keep as string until valid JSON
                                }
                            } else {
                                handleValueChange(e.target.value);
                            }
                        }}
                        rows={4}
                        className="font-mono"
                    />
                );

            case 'number':
            case 'integer':
            case 'float':
                return (
                    <Input
                        type="number"
                        value={state.value ?? ''}
                        onChange={(e) => {
                            const val = type === 'integer'
                                ? parseInt(e.target.value, 10)
                                : parseFloat(e.target.value);
                            handleValueChange(isNaN(val) ? null : val);
                        }}
                        step={type === 'integer' ? 1 : 'any'}
                    />
                );

            case 'date':
                return (
                    <Input
                        type="date"
                        value={state.value || ''}
                        onChange={(e) => handleValueChange(e.target.value)}
                    />
                );

            case 'datetime':
                return (
                    <Input
                        type="datetime-local"
                        value={state.value || ''}
                        onChange={(e) => handleValueChange(e.target.value)}
                    />
                );

            default:
                return (
                    <Input
                        type="text"
                        value={state.value ?? ''}
                        onChange={(e) => handleValueChange(e.target.value)}
                    />
                );
        }
    };

    // Render result alert
    const renderResult = () => {
        if (!state.result) return null;

        const { success, updatedCount, errors } = state.result;
        const hasErrors = errors && errors.length > 0;

        if (success && !hasErrors) {
            return (
                <Alert className="border-green-500 bg-green-50">
                    <CheckIcon className="size-4 text-green-600" />
                    <AlertTitle className="text-green-800">Success</AlertTitle>
                    <AlertDescription className="text-green-700">
                        {formatSuccessMessage(updatedCount, labels)}
                    </AlertDescription>
                </Alert>
            );
        }

        if (success && hasErrors) {
            return (
                <Alert className="border-yellow-500 bg-yellow-50">
                    <AlertTriangleIcon className="size-4 text-yellow-600" />
                    <AlertTitle className="text-yellow-800">Partial Success</AlertTitle>
                    <AlertDescription className="text-yellow-700">
                        {formatPartialSuccessMessage(updatedCount, errors.length, labels)}
                    </AlertDescription>
                </Alert>
            );
        }

        return (
            <Alert variant="destructive">
                <XIcon className="size-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                    {errors?.[0]?.message || labels.error}
                </AlertDescription>
            </Alert>
        );
    };

    return (
        <>
            <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Edit3Icon className="size-5" />
                            {labels.title}
                        </DialogTitle>
                        <DialogDescription>
                            <Badge variant="secondary" className="mt-2">
                                {formatSelectedMessage(selectedIds.length, labels)}
                            </Badge>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {editableFields.length === 0 ? (
                            <Alert>
                                <AlertDescription>{labels.noFieldsAvailable}</AlertDescription>
                            </Alert>
                        ) : (
                            <>
                                {/* Field selector */}
                                <div className="grid gap-2">
                                    <Label>{labels.selectField}</Label>
                                    <Select
                                        value={state.selectedField || ''}
                                        onValueChange={handleFieldChange}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={labels.selectFieldPlaceholder} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {editableFields.map((field) => (
                                                <SelectItem key={field.fieldName} value={field.fieldName}>
                                                    {field.label}
                                                    <span className="ml-2 text-xs text-muted-foreground">
                                                        ({field.type})
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Value editor */}
                                {selectedFieldConfig && (
                                    <div className="grid gap-2">
                                        <Label>{labels.newValue}</Label>
                                        {renderValueEditor()}
                                        {!validation.valid && (
                                            <p className="text-sm text-destructive">{validation.error}</p>
                                        )}
                                    </div>
                                )}

                                {/* Result */}
                                {renderResult()}
                            </>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={handleClose} disabled={state.isSubmitting}>
                            {labels.cancel}
                        </Button>
                        <Button
                            onClick={handleSubmitClick}
                            disabled={
                                !state.selectedField ||
                                !validation.valid ||
                                state.isSubmitting ||
                                editableFields.length === 0
                            }
                        >
                            {state.isSubmitting ? (
                                <>
                                    <LoaderIcon className="size-4 mr-2 animate-spin" />
                                    {labels.applying}
                                </>
                            ) : (
                                labels.apply
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirmation dialog */}
            <AlertDialog open={state.showConfirm} onOpenChange={(open) => !open && handleConfirmCancel()}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{labels.confirmTitle}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {formatConfirmDescription(selectedIds.length, labels)}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{labels.cancel}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmedSubmit}>
                            {labels.confirm}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

/**
 * Hook for managing batch edit state
 */
export function useBatchEdit() {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

    const open = useCallback((ids: (string | number)[]) => {
        setSelectedIds(ids);
        setIsOpen(true);
    }, []);

    const close = useCallback(() => {
        setIsOpen(false);
        setSelectedIds([]);
    }, []);

    return {
        isOpen,
        selectedIds,
        open,
        close,
    };
}

export default BatchEdit;
