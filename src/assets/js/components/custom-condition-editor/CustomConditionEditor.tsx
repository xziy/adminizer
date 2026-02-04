import * as React from "react";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { XIcon, InfoIcon } from "lucide-react";
import {
    CustomConditionEditorProps,
    CustomConditionEditorLabels,
    CustomConditionValue,
    CustomHandler,
    ParameterSchema,
    defaultCustomConditionEditorLabels,
    defaultCustomOperators,
} from "./types";
import { cn } from "@/lib/utils";

/**
 * CustomConditionEditor - Editor for custom field handler conditions
 *
 * Features:
 * - Select from available custom handlers for the model
 * - Configure operator and value
 * - Dynamic parameter inputs based on handler schema
 * - Validation support
 *
 * @example
 * ```tsx
 * <CustomConditionEditor
 *   modelName="Order"
 *   handlers={customHandlers}
 *   value={condition}
 *   onChange={setCondition}
 * />
 * ```
 */
export function CustomConditionEditor({
    modelName,
    handlers,
    value,
    onChange,
    operators = defaultCustomOperators,
    labels: customLabels,
    disabled = false,
}: CustomConditionEditorProps) {
    const labels: CustomConditionEditorLabels = useMemo(
        () => ({ ...defaultCustomConditionEditorLabels, ...customLabels }),
        [customLabels]
    );

    // Get selected handler
    const selectedHandler = useMemo(() => {
        if (!value?.handlerId) return null;
        return handlers.find((h) => h.id === value.handlerId) || null;
    }, [value?.handlerId, handlers]);

    // Handle handler selection
    const handleHandlerChange = useCallback(
        (handlerId: string) => {
            if (handlerId === "__none__") {
                onChange(null);
                return;
            }

            onChange({
                handlerId,
                operator: value?.operator || 'eq',
                value: '',
                params: {},
            });
        },
        [onChange, value?.operator]
    );

    // Handle operator change
    const handleOperatorChange = useCallback(
        (operator: string) => {
            if (!value) return;
            onChange({
                ...value,
                operator,
                // Clear value for null operators
                value: ['isNull', 'isNotNull'].includes(operator) ? null : value.value,
            });
        },
        [value, onChange]
    );

    // Handle value change
    const handleValueChange = useCallback(
        (newValue: any) => {
            if (!value) return;
            onChange({
                ...value,
                value: newValue,
            });
        },
        [value, onChange]
    );

    // Handle parameter change
    const handleParamChange = useCallback(
        (paramName: string, paramValue: any) => {
            if (!value) return;
            onChange({
                ...value,
                params: {
                    ...value.params,
                    [paramName]: paramValue,
                },
            });
        },
        [value, onChange]
    );

    // Clear selection
    const handleClear = useCallback(() => {
        onChange(null);
    }, [onChange]);

    // Check if operator requires value
    const requiresValue = useMemo(() => {
        return !['isNull', 'isNotNull'].includes(value?.operator || '');
    }, [value?.operator]);

    // No handlers available
    if (handlers.length === 0) {
        return (
            <div className="flex items-center justify-center p-4 text-sm text-muted-foreground border rounded-md">
                {labels.noHandlersAvailable}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Handler Selection */}
            <div className="space-y-2">
                <Label>{labels.handlerLabel}</Label>
                <div className="flex gap-2">
                    <Select
                        value={value?.handlerId || "__none__"}
                        onValueChange={handleHandlerChange}
                        disabled={disabled}
                    >
                        <SelectTrigger className="flex-1">
                            <SelectValue placeholder={labels.selectHandler} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__none__">{labels.selectHandler}</SelectItem>
                            {handlers.map((handler) => (
                                <SelectItem key={handler.id} value={handler.id}>
                                    <div className="flex flex-col items-start">
                                        <span>{handler.name}</span>
                                        {handler.description && (
                                            <span className="text-xs text-muted-foreground">
                                                {handler.description}
                                            </span>
                                        )}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {value?.handlerId && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={handleClear}
                            disabled={disabled}
                        >
                            <XIcon className="size-4" />
                        </Button>
                    )}
                </div>
                {selectedHandler?.description && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <InfoIcon className="size-3" />
                        {selectedHandler.description}
                    </p>
                )}
            </div>

            {/* Operator and Value */}
            {selectedHandler && (
                <>
                    <div className="grid grid-cols-2 gap-4">
                        {/* Operator */}
                        <div className="space-y-2">
                            <Label>{labels.operatorLabel}</Label>
                            <Select
                                value={value?.operator || 'eq'}
                                onValueChange={handleOperatorChange}
                                disabled={disabled}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={labels.selectOperator} />
                                </SelectTrigger>
                                <SelectContent>
                                    {operators.map((op) => (
                                        <SelectItem key={op.value} value={op.value}>
                                            {op.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Value */}
                        {requiresValue && (
                            <div className="space-y-2">
                                <Label>{labels.valueLabel}</Label>
                                <Input
                                    value={value?.value || ''}
                                    onChange={(e) => handleValueChange(e.target.value)}
                                    placeholder={labels.enterValue}
                                    disabled={disabled}
                                />
                            </div>
                        )}
                    </div>

                    {/* Parameters */}
                    {selectedHandler.parameterSchema &&
                        selectedHandler.parameterSchema.length > 0 && (
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">
                                    {labels.parametersLabel}
                                </Label>
                                <div className="space-y-3 pl-4 border-l-2 border-muted">
                                    {selectedHandler.parameterSchema.map((param) => (
                                        <ParameterInput
                                            key={param.name}
                                            schema={param}
                                            value={value?.params?.[param.name]}
                                            onChange={(v) => handleParamChange(param.name, v)}
                                            disabled={disabled}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                </>
            )}
        </div>
    );
}

/**
 * Parameter input component for dynamic parameter rendering
 */
interface ParameterInputProps {
    schema: ParameterSchema;
    value: any;
    onChange: (value: any) => void;
    disabled?: boolean;
}

function ParameterInput({ schema, value, onChange, disabled }: ParameterInputProps) {
    const currentValue = value ?? schema.defaultValue ?? '';

    switch (schema.type) {
        case 'boolean':
            return (
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label htmlFor={schema.name}>{schema.label}</Label>
                        {schema.placeholder && (
                            <p className="text-xs text-muted-foreground">{schema.placeholder}</p>
                        )}
                    </div>
                    <Switch
                        id={schema.name}
                        checked={!!currentValue}
                        onCheckedChange={onChange}
                        disabled={disabled}
                    />
                </div>
            );

        case 'select':
            return (
                <div className="space-y-2">
                    <Label htmlFor={schema.name}>
                        {schema.label}
                        {schema.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <Select
                        value={String(currentValue)}
                        onValueChange={onChange}
                        disabled={disabled}
                    >
                        <SelectTrigger id={schema.name}>
                            <SelectValue placeholder={schema.placeholder} />
                        </SelectTrigger>
                        <SelectContent>
                            {schema.options?.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            );

        case 'number':
            return (
                <div className="space-y-2">
                    <Label htmlFor={schema.name}>
                        {schema.label}
                        {schema.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <Input
                        id={schema.name}
                        type="number"
                        value={currentValue}
                        onChange={(e) => onChange(e.target.valueAsNumber || undefined)}
                        placeholder={schema.placeholder}
                        min={schema.validation?.min}
                        max={schema.validation?.max}
                        disabled={disabled}
                    />
                </div>
            );

        case 'date':
            return (
                <div className="space-y-2">
                    <Label htmlFor={schema.name}>
                        {schema.label}
                        {schema.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <Input
                        id={schema.name}
                        type="date"
                        value={currentValue}
                        onChange={(e) => onChange(e.target.value)}
                        disabled={disabled}
                    />
                </div>
            );

        case 'json':
            return (
                <div className="space-y-2">
                    <Label htmlFor={schema.name}>
                        {schema.label}
                        {schema.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <Input
                        id={schema.name}
                        value={typeof currentValue === 'object' ? JSON.stringify(currentValue) : currentValue}
                        onChange={(e) => {
                            try {
                                onChange(JSON.parse(e.target.value));
                            } catch {
                                onChange(e.target.value);
                            }
                        }}
                        placeholder={schema.placeholder || 'JSON value...'}
                        disabled={disabled}
                    />
                </div>
            );

        case 'string':
        default:
            return (
                <div className="space-y-2">
                    <Label htmlFor={schema.name}>
                        {schema.label}
                        {schema.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <Input
                        id={schema.name}
                        value={currentValue}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={schema.placeholder}
                        disabled={disabled}
                    />
                </div>
            );
    }
}

/**
 * Hook for managing custom condition state
 */
export function useCustomCondition(initialValue: CustomConditionValue | null = null) {
    const [value, setValue] = useState<CustomConditionValue | null>(initialValue);

    const reset = useCallback(() => {
        setValue(null);
    }, []);

    const isValid = useMemo(() => {
        if (!value) return false;
        if (!value.handlerId || !value.operator) return false;
        if (['isNull', 'isNotNull'].includes(value.operator)) return true;
        return value.value !== undefined && value.value !== '';
    }, [value]);

    return {
        value,
        setValue,
        reset,
        isValid,
    };
}

export default CustomConditionEditor;
