import type { KeyboardEvent, RefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Columns } from "@/types";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn, simpleSanitizeHtml } from "@/lib/utils";
import { Loader2, Pencil } from "lucide-react";

type InlineEditColumnConfig = Columns[string];

type InlineSaveHandler = (
  recordId: string | number,
  fieldName: string,
  value: unknown
) => Promise<unknown>;

type SelectOption = {
  value: string;
  label: string;
};

type InlineEditCellProps = {
  value: unknown;
  rowId: string | number;
  fieldName: string;
  column: InlineEditColumnConfig;
  onSave: InlineSaveHandler;
  disabled?: boolean;
  className?: string;
};

const resolveFieldType = (type?: string): string =>
  (type ?? "string").toString().toLowerCase();

const isNumericType = (type: string): boolean =>
  ["number", "integer", "float"].includes(type);

const isBooleanType = (type: string): boolean => type === "boolean";

const isSelectType = (type: string): boolean => type === "select";

const buildSelectOptions = (
  isIn?: Record<string, unknown> | string[]
): SelectOption[] => {
  if (!isIn) {
    return [];
  }
  if (Array.isArray(isIn)) {
    return isIn.map((item) => ({
      value: String(item),
      label: String(item)
    }));
  }
  return Object.entries(isIn).map(([value, label]) => ({
    value: String(value),
    label: String(label)
  }));
};

const normalizeDisplayValue = (
  value: unknown,
  column: InlineEditColumnConfig,
  options: SelectOption[]
): string => {
  if (value === null || value === undefined) {
    return "";
  }
  const fieldType = resolveFieldType(column.type);
  if (isSelectType(fieldType) && options.length > 0) {
    const match = options.find((option) => option.value === String(value));
    if (match) {
      return match.label;
    }
  }
  return typeof value === "string" ? value : String(value);
};

type ValidationResult = {
  value?: unknown;
  error?: string;
};

const validateInlineValue = (
  rawValue: unknown,
  column: InlineEditColumnConfig,
  options: SelectOption[]
): ValidationResult => {
  const fieldType = resolveFieldType(column.type);
  const inlineConfig = column.inlineEditConfig ?? {};

  if (rawValue === undefined) {
    return { error: "Value is required" };
  }

  if (rawValue === null) {
    if (column.required) {
      return { error: "Value is required" };
    }
    return { value: null };
  }

  if (isBooleanType(fieldType)) {
    if (typeof rawValue !== "boolean") {
      return { error: "Value must be boolean" };
    }
    return { value: rawValue };
  }

  if (isNumericType(fieldType)) {
    const numeric =
      typeof rawValue === "number"
        ? rawValue
        : typeof rawValue === "string" && rawValue.trim().length > 0
          ? Number(rawValue)
          : NaN;
    if (!Number.isFinite(numeric)) {
      return { error: "Value must be a number" };
    }
    if (fieldType === "integer" && !Number.isInteger(numeric)) {
      return { error: "Value must be an integer" };
    }
    if (inlineConfig.min !== undefined && numeric < inlineConfig.min) {
      return { error: `Value must be at least ${inlineConfig.min}` };
    }
    if (inlineConfig.max !== undefined && numeric > inlineConfig.max) {
      return { error: `Value must be at most ${inlineConfig.max}` };
    }
    return { value: numeric };
  }

  if (isSelectType(fieldType)) {
    const raw = String(rawValue);
    if (options.length > 0 && !options.some((option) => option.value === raw)) {
      return { error: "Invalid option selected" };
    }
    return { value: rawValue };
  }

  const textValue = typeof rawValue === "string" ? rawValue : String(rawValue);
  if (inlineConfig.maxLength !== undefined && textValue.length > inlineConfig.maxLength) {
    return { error: `Value must be at most ${inlineConfig.maxLength} characters` };
  }
  if (inlineConfig.pattern) {
    try {
      const pattern = new RegExp(inlineConfig.pattern);
      if (!pattern.test(textValue)) {
        return { error: "Value does not match required pattern" };
      }
    } catch {
      return { error: "Invalid validation pattern" };
    }
  }

  return { value: textValue };
};

const isValueEqual = (
  rawValue: unknown,
  nextValue: unknown,
  fieldType: string
): boolean => {
  if (isNumericType(fieldType)) {
    const currentNumeric =
      typeof rawValue === "number"
        ? rawValue
        : typeof rawValue === "string"
          ? Number(rawValue)
          : NaN;
    const nextNumeric =
      typeof nextValue === "number"
        ? nextValue
        : typeof nextValue === "string"
          ? Number(nextValue)
          : NaN;
    return Number.isFinite(currentNumeric) && Number.isFinite(nextNumeric)
      ? currentNumeric === nextNumeric
      : rawValue === nextValue;
  }
  if (isBooleanType(fieldType)) {
    return Boolean(rawValue) === Boolean(nextValue);
  }
  return String(rawValue ?? "") === String(nextValue ?? "");
};

export const InlineEditCell = ({
  value,
  rowId,
  fieldName,
  column,
  onSave,
  disabled = false,
  className
}: InlineEditCellProps) => {
  const fieldType = resolveFieldType(column.type);
  const selectOptions = useMemo(
    () => buildSelectOptions(column.isIn),
    [column.isIn]
  );
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(
    normalizeDisplayValue(value, column, selectOptions)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (isEditing) {
      return;
    }
    setDraftValue(normalizeDisplayValue(value, column, selectOptions));
    setError(null);
  }, [column, isEditing, selectOptions, value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const commitChange = async (nextRawValue: unknown) => {
    if (disabled || isSaving) {
      return;
    }

    if (isValueEqual(value, nextRawValue, fieldType)) {
      setIsEditing(false);
      setError(null);
      return;
    }

    const validation = validateInlineValue(nextRawValue, column, selectOptions);
    if (validation.error) {
      setError(validation.error);
      return;
    }

    if (column.inlineEditConfig?.confirmChange) {
      const fieldLabel = column.title ?? fieldName;
      const confirmValue =
        validation.value === null || validation.value === undefined
          ? "empty"
          : String(validation.value);
      if (!window.confirm(`Change ${fieldLabel} to "${confirmValue}"?`)) {
        setIsEditing(false);
        setDraftValue(normalizeDisplayValue(value, column, selectOptions));
        return;
      }
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(rowId, fieldName, validation.value);
      setIsEditing(false);
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : "Failed to save";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTextKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitChange(draftValue);
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setIsEditing(false);
      setDraftValue(normalizeDisplayValue(value, column, selectOptions));
      setError(null);
    }
  };

  if (isBooleanType(fieldType)) {
    return (
      <div className={cn("flex items-center justify-center gap-2", className)}>
        <Switch
          checked={Boolean(value)}
          onCheckedChange={(checked) => commitChange(checked)}
          disabled={disabled || isSaving}
        />
        {isSaving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        {error && <span className="text-xs text-destructive" title={error}>!</span>}
      </div>
    );
  }

  if (!isEditing) {
    const displayText = normalizeDisplayValue(value, column, selectOptions);
    const safeHtml = simpleSanitizeHtml(displayText);
    const isEmpty = displayText.trim().length === 0;
    return (
      <button
        type="button"
        className={cn(
          "group inline-flex w-full items-center justify-center gap-1 rounded-sm px-1 py-0.5 text-center transition-colors",
          !disabled && "hover:bg-muted/50",
          className
        )}
        onClick={() => {
          if (!disabled) {
            setIsEditing(true);
          }
        }}
        disabled={disabled}
      >
        {isEmpty ? (
          <span className="text-muted-foreground">-</span>
        ) : (
          <span
            className="truncate"
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        )}
        {!disabled && (
          <Pencil className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-70" />
        )}
        {error && <span className="text-xs text-destructive" title={error}>!</span>}
      </button>
    );
  }

  if (isSelectType(fieldType) && selectOptions.length > 0) {
    return (
      <div className={cn("flex items-center justify-center gap-2", className)}>
        <select
          ref={inputRef as RefObject<HTMLSelectElement>}
          className="h-8 rounded-md border bg-transparent px-2 text-xs"
          value={draftValue}
          onChange={(event) => {
            const next = event.target.value;
            setDraftValue(next);
            commitChange(next);
          }}
          disabled={disabled || isSaving}
        >
          {selectOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {isSaving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        {error && <span className="text-xs text-destructive" title={error}>!</span>}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <Input
        ref={inputRef as RefObject<HTMLInputElement>}
        type={isNumericType(fieldType) ? "number" : "text"}
        value={draftValue}
        onChange={(event) => {
          setDraftValue(event.target.value);
          setError(null);
        }}
        onBlur={() => commitChange(draftValue)}
        onKeyDown={handleTextKeyDown}
        min={column.inlineEditConfig?.min}
        max={column.inlineEditConfig?.max}
        step={column.inlineEditConfig?.step}
        maxLength={column.inlineEditConfig?.maxLength}
        className="h-8 w-full min-w-[6rem] text-xs"
        disabled={disabled || isSaving}
      />
      {isSaving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      {error && <span className="text-xs text-destructive" title={error}>!</span>}
    </div>
  );
};
