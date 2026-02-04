import * as React from "react";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
    FilterCondition,
    FilterOperator,
    FieldConfig,
    FilterBuilderLabels,
    operatorsByType,
    operatorLabels,
} from "./types";
import { cn } from "@/lib/utils";

interface ConditionRowProps {
    condition: FilterCondition;
    fields: FieldConfig[];
    labels: FilterBuilderLabels;
    onChange: (condition: FilterCondition) => void;
    onRemove: () => void;
    canRemove: boolean;
}

export function ConditionRow({
    condition,
    fields,
    labels,
    onChange,
    onRemove,
    canRemove,
}: ConditionRowProps) {
    const selectedField = fields.find((f) => f.name === condition.field);
    const fieldType = selectedField?.type || "string";
    const availableOperators = selectedField?.operators || operatorsByType[fieldType] || operatorsByType.default;

    const handleFieldChange = (fieldName: string) => {
        const field = fields.find((f) => f.name === fieldName);
        const newFieldType = field?.type || "string";
        const newOperators = field?.operators || operatorsByType[newFieldType] || operatorsByType.default;

        // Reset operator if current one is not valid for new field type
        const newOperator = newOperators.includes(condition.operator as FilterOperator)
            ? condition.operator
            : newOperators[0];

        onChange({
            ...condition,
            field: fieldName,
            operator: newOperator,
            value: "",
        });
    };

    const handleOperatorChange = (operator: string) => {
        const op = operator as FilterOperator;
        let newValue = condition.value;

        // Reset value for certain operators
        if (op === "isNull" || op === "isNotNull") {
            newValue = undefined;
        } else if (op === "between" && !Array.isArray(condition.value)) {
            newValue = ["", ""];
        } else if (op === "in" || op === "notIn") {
            newValue = Array.isArray(condition.value) ? condition.value : [];
        }

        onChange({
            ...condition,
            operator: op,
            value: newValue,
        });
    };

    const handleValueChange = (value: any) => {
        onChange({
            ...condition,
            value,
        });
    };

    const renderValueInput = () => {
        const operator = condition.operator as FilterOperator;

        // No value needed for null checks
        if (operator === "isNull" || operator === "isNotNull") {
            return null;
        }

        // Boolean field
        if (fieldType === "boolean") {
            return (
                <div className="flex items-center gap-2">
                    <Checkbox
                        checked={condition.value === true}
                        onCheckedChange={(checked) => handleValueChange(checked)}
                    />
                    <span className="text-sm text-muted-foreground">
                        {condition.value ? "True" : "False"}
                    </span>
                </div>
            );
        }

        // Between operator - two inputs
        if (operator === "between") {
            const [min, max] = Array.isArray(condition.value) ? condition.value : ["", ""];
            return (
                <div className="flex items-center gap-2">
                    <Input
                        type={fieldType === "number" || fieldType === "integer" || fieldType === "float" ? "number" : "text"}
                        value={min || ""}
                        onChange={(e) => handleValueChange([e.target.value, max])}
                        placeholder="Min"
                        className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">and</span>
                    <Input
                        type={fieldType === "number" || fieldType === "integer" || fieldType === "float" ? "number" : "text"}
                        value={max || ""}
                        onChange={(e) => handleValueChange([min, e.target.value])}
                        placeholder="Max"
                        className="w-24"
                    />
                </div>
            );
        }

        // In/NotIn operator - comma-separated values
        if (operator === "in" || operator === "notIn") {
            const values = Array.isArray(condition.value) ? condition.value : [];
            return (
                <Input
                    value={values.join(", ")}
                    onChange={(e) => {
                        const newValues = e.target.value
                            .split(",")
                            .map((v) => v.trim())
                            .filter(Boolean);
                        handleValueChange(newValues);
                    }}
                    placeholder="value1, value2, ..."
                    className="min-w-[200px]"
                />
            );
        }

        // Select field with options
        if (selectedField?.options && selectedField.options.length > 0) {
            return (
                <Select
                    value={String(condition.value || "")}
                    onValueChange={handleValueChange}
                >
                    <SelectTrigger className="min-w-[150px]">
                        <SelectValue placeholder={labels.enterValue} />
                    </SelectTrigger>
                    <SelectContent>
                        {selectedField.options.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            );
        }

        // Date/datetime field
        if (fieldType === "date" || fieldType === "datetime") {
            return (
                <Input
                    type={fieldType === "datetime" ? "datetime-local" : "date"}
                    value={condition.value || ""}
                    onChange={(e) => handleValueChange(e.target.value)}
                    className="min-w-[150px]"
                />
            );
        }

        // Number field
        if (fieldType === "number" || fieldType === "integer" || fieldType === "float") {
            return (
                <Input
                    type="number"
                    value={condition.value ?? ""}
                    onChange={(e) => handleValueChange(e.target.value)}
                    placeholder={labels.enterValue}
                    className="min-w-[120px]"
                />
            );
        }

        // Default text input
        return (
            <Input
                value={condition.value || ""}
                onChange={(e) => handleValueChange(e.target.value)}
                placeholder={labels.enterValue}
                className="min-w-[150px]"
            />
        );
    };

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {/* Field Select */}
            <Select value={condition.field || ""} onValueChange={handleFieldChange}>
                <SelectTrigger className="min-w-[150px]">
                    <SelectValue placeholder={labels.selectField} />
                </SelectTrigger>
                <SelectContent>
                    {fields.length === 0 ? (
                        <SelectItem value="_empty" disabled>
                            {labels.noFieldsAvailable}
                        </SelectItem>
                    ) : (
                        fields.map((field) => (
                            <SelectItem key={field.name} value={field.name}>
                                {field.label}
                            </SelectItem>
                        ))
                    )}
                </SelectContent>
            </Select>

            {/* Operator Select */}
            <Select
                value={condition.operator || ""}
                onValueChange={handleOperatorChange}
                disabled={!condition.field}
            >
                <SelectTrigger className="min-w-[140px]">
                    <SelectValue placeholder={labels.selectOperator} />
                </SelectTrigger>
                <SelectContent>
                    {availableOperators.map((op) => (
                        <SelectItem key={op} value={op}>
                            {operatorLabels[op]}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Value Input */}
            {renderValueInput()}

            {/* Remove Button */}
            {canRemove && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={onRemove}
                    className="text-muted-foreground hover:text-destructive"
                >
                    <Trash2Icon className="size-4" />
                </Button>
            )}
        </div>
    );
}

export default ConditionRow;
