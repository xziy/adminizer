import * as React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { CheckIcon, XIcon, LoaderIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    InlineEditorProps,
    InlineEditLabels,
    defaultInlineEditLabels,
    validateValue,
} from "./types";
import { cn } from "@/lib/utils";

/**
 * InlineEditor - Inline editing component with type-specific inputs
 *
 * Supports:
 * - string, text (textarea)
 * - number, integer, float
 * - boolean (checkbox)
 * - select (dropdown)
 * - date, datetime
 */
export function InlineEditor({
    value,
    type,
    onChange,
    onSave,
    onCancel,
    validation,
    options,
    disabled = false,
    autoFocus = true,
    labels: customLabels,
}: InlineEditorProps) {
    const [localValue, setLocalValue] = useState(value);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

    const labels: InlineEditLabels = React.useMemo(
        () => ({ ...defaultInlineEditLabels, ...customLabels }),
        [customLabels]
    );

    // Focus input on mount
    useEffect(() => {
        if (autoFocus && inputRef.current) {
            inputRef.current.focus();
            if ('select' in inputRef.current) {
                inputRef.current.select();
            }
        }
    }, [autoFocus]);

    // Validate on change
    const handleChange = useCallback(
        (newValue: any) => {
            setLocalValue(newValue);
            const validationError = validateValue(newValue, validation, labels);
            setError(validationError);
            onChange(newValue);
        },
        [validation, labels, onChange]
    );

    // Handle save
    const handleSave = useCallback(() => {
        const validationError = validateValue(localValue, validation, labels);
        if (validationError) {
            setError(validationError);
            return;
        }
        onSave();
    }, [localValue, validation, labels, onSave]);

    // Handle keyboard shortcuts
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey && type !== 'text') {
                e.preventDefault();
                handleSave();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onCancel();
            }
        },
        [handleSave, onCancel, type]
    );

    // Render input based on type
    const renderInput = () => {
        switch (type) {
            case 'boolean':
                return (
                    <div className="flex items-center gap-2">
                        <Checkbox
                            checked={Boolean(localValue)}
                            onCheckedChange={(checked) => handleChange(checked)}
                            disabled={disabled}
                        />
                        <span className="text-sm">
                            {localValue ? 'Yes' : 'No'}
                        </span>
                    </div>
                );

            case 'select':
                return (
                    <Select
                        value={String(localValue ?? '')}
                        onValueChange={handleChange}
                        disabled={disabled}
                    >
                        <SelectTrigger className="h-8">
                            <SelectValue />
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
                return (
                    <Textarea
                        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                        value={localValue ?? ''}
                        onChange={(e) => handleChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={disabled}
                        className="min-h-[60px] text-sm"
                        rows={3}
                    />
                );

            case 'number':
            case 'integer':
            case 'float':
                return (
                    <Input
                        ref={inputRef as React.RefObject<HTMLInputElement>}
                        type="number"
                        value={localValue ?? ''}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') {
                                handleChange(null);
                            } else if (type === 'integer') {
                                handleChange(parseInt(val, 10));
                            } else {
                                handleChange(parseFloat(val));
                            }
                        }}
                        onKeyDown={handleKeyDown}
                        disabled={disabled}
                        className="h-8"
                        step={type === 'integer' ? 1 : 'any'}
                    />
                );

            case 'date':
                return (
                    <Input
                        ref={inputRef as React.RefObject<HTMLInputElement>}
                        type="date"
                        value={localValue ?? ''}
                        onChange={(e) => handleChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={disabled}
                        className="h-8"
                    />
                );

            case 'datetime':
                return (
                    <Input
                        ref={inputRef as React.RefObject<HTMLInputElement>}
                        type="datetime-local"
                        value={localValue ?? ''}
                        onChange={(e) => handleChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={disabled}
                        className="h-8"
                    />
                );

            case 'json':
                return (
                    <Textarea
                        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                        value={typeof localValue === 'string' ? localValue : JSON.stringify(localValue, null, 2)}
                        onChange={(e) => {
                            try {
                                const parsed = JSON.parse(e.target.value);
                                handleChange(parsed);
                            } catch {
                                // Keep as string while typing
                                handleChange(e.target.value);
                            }
                        }}
                        onKeyDown={handleKeyDown}
                        disabled={disabled}
                        className="min-h-[80px] font-mono text-xs"
                        rows={4}
                    />
                );

            case 'string':
            default:
                return (
                    <Input
                        ref={inputRef as React.RefObject<HTMLInputElement>}
                        type="text"
                        value={localValue ?? ''}
                        onChange={(e) => handleChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={disabled}
                        className="h-8"
                    />
                );
        }
    };

    return (
        <div className="inline-editor space-y-1">
            <div className="flex items-start gap-1">
                <div className="flex-1">{renderInput()}</div>

                {/* Action buttons */}
                <div className="flex items-center gap-0.5">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={handleSave}
                        disabled={disabled || !!error}
                        title={labels.save}
                    >
                        <CheckIcon className="size-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={onCancel}
                        disabled={disabled}
                        title={labels.cancel}
                    >
                        <XIcon className="size-4" />
                    </Button>
                </div>
            </div>

            {/* Error message */}
            {error && (
                <p className="text-xs text-destructive">{error}</p>
            )}
        </div>
    );
}

export default InlineEditor;
