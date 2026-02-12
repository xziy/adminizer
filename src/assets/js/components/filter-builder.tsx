import { type FC, type ReactNode, Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

export type FilterOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "like"
  | "ilike"
  | "startsWith"
  | "endsWith"
  | "in"
  | "notIn"
  | "between"
  | "isNull"
  | "isNotNull"
  | "regex"
  | "custom";

export type FilterLogic = "AND" | "OR" | "NOT";

export type FilterFieldType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "datetime"
  | "time"
  | "enum"
  | "uuid"
  | "json"
  | "array"
  | (string & {});

export interface FilterFieldOption {
  label: string;
  value: string | number | boolean;
}

export interface FilterField {
  name: string;
  label: string;
  type: FilterFieldType;
  options?: FilterFieldOption[];
  placeholder?: string;
}

export interface FilterRelation {
  name: string;
  label: string;
  fields: FilterField[];
}

export interface FilterCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value: unknown;
  logic?: FilterLogic;
  children?: FilterCondition[];
  relation?: string;
  relationField?: string;
}

export interface FilterBuilderProps {
  fields: FilterField[];
  relations?: FilterRelation[];
  initialConditions?: FilterCondition[];
  value?: FilterCondition[];
  onChange?: (conditions: FilterCondition[]) => void;
  initialSelectedFields?: string[];
  selectedFields?: string[];
  onSelectedFieldsChange?: (selectedFields: string[]) => void;
  maxDepth?: number;
  disabled?: boolean;
}

const operatorLabels: Record<FilterOperator, string> = {
  eq: "Equals",
  neq: "Not equals",
  gt: "Greater than",
  gte: "Greater than or equal",
  lt: "Less than",
  lte: "Less than or equal",
  like: "Contains",
  ilike: "Contains (case-insensitive)",
  startsWith: "Starts with",
  endsWith: "Ends with",
  in: "In list",
  notIn: "Not in list",
  between: "Between",
  isNull: "Is empty",
  isNotNull: "Is not empty",
  regex: "Matches regex",
  custom: "Custom"
};

const operatorsByType: Record<string, FilterOperator[]> = {
  string: [
    "eq",
    "neq",
    "like",
    "ilike",
    "startsWith",
    "endsWith",
    "in",
    "notIn",
    "isNull",
    "isNotNull",
    "regex"
  ],
  number: [
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "between",
    "in",
    "notIn",
    "isNull",
    "isNotNull"
  ],
  boolean: ["eq", "neq", "isNull", "isNotNull"],
  date: ["eq", "neq", "gt", "gte", "lt", "lte", "between", "isNull", "isNotNull"],
  datetime: ["eq", "neq", "gt", "gte", "lt", "lte", "between", "isNull", "isNotNull"],
  time: ["eq", "neq", "gt", "gte", "lt", "lte", "between", "isNull", "isNotNull"],
  enum: ["eq", "neq", "in", "notIn", "isNull", "isNotNull"],
  uuid: ["eq", "neq", "in", "notIn", "isNull", "isNotNull"],
  array: ["eq", "neq", "in", "notIn", "isNull", "isNotNull"],
  json: ["eq", "neq", "isNull", "isNotNull"]
};

const fallbackOperators: FilterOperator[] = [
  "eq",
  "neq",
  "like",
  "in",
  "notIn",
  "isNull",
  "isNotNull"
];

let idCounter = 0;

const createId = () => {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  idCounter += 1;
  return `filter-${Date.now()}-${idCounter}`;
};

const normalizeFieldType = (type?: string): string => {
  if (!type) {
    return "string";
  }
  const normalized = type.toLowerCase();
  if (["text", "longtext", "mediumtext"].includes(normalized)) {
    return "string";
  }
  if (["int", "integer", "float", "decimal", "number"].includes(normalized)) {
    return "number";
  }
  if (["bool", "boolean", "binary"].includes(normalized)) {
    return "boolean";
  }
  if (["datetime-local"].includes(normalized)) {
    return "datetime";
  }
  return normalized;
};

const getOperatorsForField = (field?: FilterField): FilterOperator[] => {
  if (!field) {
    return fallbackOperators;
  }
  const normalizedType = normalizeFieldType(field.type);
  return operatorsByType[normalizedType] ?? fallbackOperators;
};

const getDefaultOperatorForField = (field?: FilterField): FilterOperator => {
  const operators = getOperatorsForField(field);
  return operators[0] ?? "eq";
};

const getDefaultValueForOperator = (operator: FilterOperator): unknown => {
  if (operator === "between") {
    return ["", ""];
  }
  if (operator === "in" || operator === "notIn") {
    return [];
  }
  if (operator === "isNull" || operator === "isNotNull") {
    return null;
  }
  return "";
};

const normalizeValueForOperator = (
  operator: FilterOperator,
  value: unknown,
  field?: FilterField
): unknown => {
  if (operator === "between") {
    if (Array.isArray(value) && value.length === 2) {
      return value;
    }
    return ["", ""];
  }

  if (operator === "in" || operator === "notIn") {
    if (Array.isArray(value)) {
      return value;
    }
    if (value === undefined || value === null || value === "") {
      return [];
    }
    return [String(value)];
  }

  if (operator === "isNull" || operator === "isNotNull") {
    return null;
  }

  if (field?.options?.length) {
    const matched = field.options.find((option) => option.value === value);
    if (matched) {
      return matched.value;
    }
    const fallback = field.options[0];
    return fallback ? fallback.value : "";
  }

  return value ?? "";
};

const createEmptyCondition = (
  fields: FilterField[],
  relations: FilterRelation[]
): FilterCondition => {
  const defaultField = fields[0];
  if (defaultField) {
    const operator = getDefaultOperatorForField(defaultField);
    return {
      id: createId(),
      field: defaultField.name,
      operator,
      value: getDefaultValueForOperator(operator)
    };
  }

  const defaultRelation = relations[0];
  if (defaultRelation) {
    const relationField = defaultRelation.fields[0];
    const operator = getDefaultOperatorForField(relationField);
    return {
      id: createId(),
      field: "",
      relation: defaultRelation.name,
      relationField: relationField?.name ?? "",
      operator,
      value: getDefaultValueForOperator(operator)
    };
  }

  return {
    id: createId(),
    field: "",
    operator: "eq",
    value: ""
  };
};

const createEmptyGroup = (
  fields: FilterField[],
  relations: FilterRelation[],
  logic: FilterLogic
): FilterCondition => {
  const child = createEmptyCondition(fields, relations);
  return {
    id: createId(),
    field: "",
    operator: "eq",
    value: "",
    logic,
    children: [child]
  };
};

const resolveField = (
  condition: FilterCondition,
  fields: FilterField[],
  relations: FilterRelation[]
): FilterField | undefined => {
  if (condition.relation) {
    const relation = relations.find((rel) => rel.name === condition.relation);
    return relation?.fields.find((field) => field.name === condition.relationField);
  }
  return fields.find((field) => field.name === condition.field);
};

const ensureConditionList = (
  conditions: FilterCondition[],
  fields: FilterField[],
  relations: FilterRelation[]
): FilterCondition[] => {
  if (conditions.length > 0) {
    return conditions;
  }
  return [createEmptyCondition(fields, relations)];
};

const updateConditionById = (
  conditions: FilterCondition[],
  id: string,
  updater: (condition: FilterCondition) => FilterCondition
): FilterCondition[] => {
  return conditions.map((condition) => {
    if (condition.id === id) {
      return updater(condition);
    }
    if (condition.children) {
      return {
        ...condition,
        children: updateConditionById(condition.children, id, updater)
      };
    }
    return condition;
  });
};

const removeConditionById = (
  conditions: FilterCondition[],
  id: string
): FilterCondition[] => {
  const nextConditions = conditions
    .filter((condition) => condition.id !== id)
    .map((condition) => {
      if (condition.children) {
        const children = removeConditionById(condition.children, id);
        return {
          ...condition,
          children
        };
      }
      return condition;
    })
    .filter((condition) => !condition.children || condition.children.length > 0);

  return nextConditions;
};

const addChildToGroup = (
  conditions: FilterCondition[],
  groupId: string,
  child: FilterCondition
): FilterCondition[] => {
  return conditions.map((condition) => {
    if (condition.id === groupId && condition.children) {
      const nextChildren =
        condition.logic === "NOT" ? [child] : [...condition.children, child];
      return {
        ...condition,
        children: nextChildren
      };
    }
    if (condition.children) {
      return {
        ...condition,
        children: addChildToGroup(condition.children, groupId, child)
      };
    }
    return condition;
  });
};

const listToString = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(", ");
  }
  if (value === undefined || value === null) {
    return "";
  }
  return String(value);
};

const stringToList = (value: string): string[] => {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const normalizeSelectedFieldList = (
  selectedFields: string[] | undefined,
  availableFields: FilterField[]
): string[] => {
  if (!Array.isArray(selectedFields) || selectedFields.length === 0) {
    return [];
  }

  const available = new Set(availableFields.map((field) => field.name));
  const unique = new Set<string>();
  const normalized: string[] = [];

  selectedFields.forEach((fieldName) => {
    const key = String(fieldName ?? "").trim();
    if (!key || !available.has(key) || unique.has(key)) {
      return;
    }
    unique.add(key);
    normalized.push(key);
  });

  return normalized;
};

const LogicSeparator: FC<{ logic: FilterLogic }> = ({ logic }) => {
  return (
    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {logic}
    </div>
  );
};

const FilterGroup: FC<{
  logic: FilterLogic;
  depth: number;
  maxDepth: number;
  disabled?: boolean;
  onLogicChange: (logic: FilterLogic) => void;
  onRemove: () => void;
  onAddCondition: () => void;
  onAddGroup: () => void;
  children: ReactNode;
}> = ({
  logic,
  depth,
  maxDepth,
  disabled,
  onLogicChange,
  onRemove,
  onAddCondition,
  onAddGroup,
  children
}) => {
  const canAddGroup = depth < maxDepth;
  const canAddCondition = logic !== "NOT";

  return (
    <div
      className={cn(
        "space-y-3 rounded-md border border-dashed border-muted-foreground/30 bg-muted/10 p-3",
        depth > 0 && "ml-3"
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={logic}
          onValueChange={(value) => onLogicChange(value as FilterLogic)}
          disabled={disabled}
        >
          <SelectTrigger className="w-[140px]" size="sm">
            <SelectValue placeholder="Logic" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AND">AND</SelectItem>
            <SelectItem value="OR">OR</SelectItem>
            <SelectItem value="NOT">NOT</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          disabled={disabled}
        >
          <Trash2 />
          Remove group
        </Button>
      </div>
      <div className="space-y-3">{children}</div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddCondition}
          disabled={disabled || !canAddCondition}
        >
          <Plus />
          Add condition
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddGroup}
          disabled={disabled || !canAddGroup}
        >
          <Plus />
          Add group
        </Button>
      </div>
    </div>
  );
};

const OperatorSelect: FC<{
  operator: FilterOperator;
  operators: FilterOperator[];
  disabled?: boolean;
  onChange: (operator: FilterOperator) => void;
}> = ({ operator, operators, disabled, onChange }) => {
  return (
    <Select
      value={operator}
      onValueChange={(value) => onChange(value as FilterOperator)}
      disabled={disabled}
    >
      <SelectTrigger className="w-[190px]" size="sm">
        <SelectValue placeholder="Operator" />
      </SelectTrigger>
      <SelectContent>
        {operators.map((op) => (
          <SelectItem key={op} value={op}>
            {operatorLabels[op] ?? op}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const ValueInput: FC<{
  field?: FilterField;
  operator: FilterOperator;
  value: unknown;
  disabled?: boolean;
  onChange: (value: unknown) => void;
}> = ({ field, operator, value, disabled, onChange }) => {
  if (operator === "isNull" || operator === "isNotNull") {
    return null;
  }

  const normalizedType = normalizeFieldType(field?.type);
  const placeholder = field?.placeholder ?? "Value";

  if (operator === "between") {
    const range = Array.isArray(value) && value.length === 2 ? value : ["", ""];
    const inputType =
      normalizedType === "number"
        ? "number"
        : normalizedType === "date"
          ? "date"
          : normalizedType === "datetime"
            ? "datetime-local"
            : normalizedType === "time"
              ? "time"
              : "text";
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type={inputType}
          value={range[0] as string}
          onChange={(event) => onChange([event.target.value, range[1]])}
          disabled={disabled}
          className="w-[160px]"
          placeholder="From"
        />
        <Input
          type={inputType}
          value={range[1] as string}
          onChange={(event) => onChange([range[0], event.target.value])}
          disabled={disabled}
          className="w-[160px]"
          placeholder="To"
        />
      </div>
    );
  }

  if (operator === "in" || operator === "notIn") {
    return (
      <Input
        type="text"
        value={listToString(value)}
        onChange={(event) => onChange(stringToList(event.target.value))}
        disabled={disabled}
        className="min-w-[220px]"
        placeholder={`${placeholder} (comma separated)`}
      />
    );
  }

  if (normalizedType === "boolean") {
    const stringValue =
      value === true ? "true" : value === false ? "false" : "";
    return (
      <Select
        value={stringValue}
        onValueChange={(next) => onChange(next === "true")}
        disabled={disabled}
      >
        <SelectTrigger className="w-[140px]" size="sm">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">True</SelectItem>
          <SelectItem value="false">False</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  if (field?.options?.length) {
    const stringValue = value === undefined || value === null ? "" : String(value);
    return (
      <Select
        value={stringValue}
        onValueChange={(next) => {
          const option = field.options?.find(
            (item) => String(item.value) === next
          );
          onChange(option ? option.value : next);
        }}
        disabled={disabled}
      >
        <SelectTrigger className="w-[200px]" size="sm">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {field.options.map((option) => (
            <SelectItem key={String(option.value)} value={String(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  const inputType =
    normalizedType === "number"
      ? "number"
      : normalizedType === "date"
        ? "date"
        : normalizedType === "datetime"
          ? "datetime-local"
          : normalizedType === "time"
            ? "time"
            : "text";

  return (
    <Input
      type={inputType}
      value={value === undefined || value === null ? "" : String(value)}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className="min-w-[220px]"
      placeholder={placeholder}
    />
  );
};

const FilterConditionRow: FC<{
  condition: FilterCondition;
  fields: FilterField[];
  relations: FilterRelation[];
  disabled?: boolean;
  onUpdate: (updates: Partial<FilterCondition>) => void;
  onRemove: () => void;
}> = ({ condition, fields, relations, disabled, onUpdate, onRemove }) => {
  const selectedField = resolveField(condition, fields, relations);
  const operatorOptions = useMemo(
    () => getOperatorsForField(selectedField),
    [selectedField]
  );
  const operator = operatorOptions.includes(condition.operator)
    ? condition.operator
    : getDefaultOperatorForField(selectedField);

  const relation = condition.relation
    ? relations.find((item) => item.name === condition.relation)
    : undefined;
  const fieldValue = condition.relation ? condition.relation : condition.field;
  const hasRelations = relations.length > 0;

  const handleFieldChange = (next: string) => {
    const relationMatch = relations.find((item) => item.name === next);
    if (relationMatch) {
      const firstRelationField = relationMatch.fields[0];
      const nextOperator = getDefaultOperatorForField(firstRelationField);
      onUpdate({
        field: "",
        relation: relationMatch.name,
        relationField: firstRelationField?.name ?? "",
        operator: nextOperator,
        value: getDefaultValueForOperator(nextOperator)
      });
      return;
    }

    const fieldMatch = fields.find((item) => item.name === next);
    const nextOperator = getDefaultOperatorForField(fieldMatch);
    onUpdate({
      field: fieldMatch?.name ?? "",
      relation: undefined,
      relationField: undefined,
      operator: nextOperator,
      value: getDefaultValueForOperator(nextOperator)
    });
  };

  const handleRelationFieldChange = (next: string) => {
    const nextField = relation?.fields.find((item) => item.name === next);
    const nextOperator = getDefaultOperatorForField(nextField);
    onUpdate({
      relationField: next,
      operator: nextOperator,
      value: getDefaultValueForOperator(nextOperator)
    });
  };

  const handleOperatorChange = (next: FilterOperator) => {
    const normalizedValue = normalizeValueForOperator(next, condition.value, selectedField);
    onUpdate({ operator: next, value: normalizedValue });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-muted-foreground/20 bg-background p-2">
      <Select value={fieldValue} onValueChange={handleFieldChange} disabled={disabled}>
        <SelectTrigger className="w-[200px]" size="sm">
          <SelectValue placeholder="Field" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Fields</SelectLabel>
            {fields.map((field) => (
              <SelectItem key={field.name} value={field.name}>
                {field.label}
              </SelectItem>
            ))}
          </SelectGroup>
          {hasRelations && (
            <SelectGroup>
              <SelectLabel>Relations</SelectLabel>
              {relations.map((rel) => (
                <SelectItem key={rel.name} value={rel.name}>
                  {rel.label}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>

      {relation && (
        <Select
          value={condition.relationField ?? ""}
          onValueChange={handleRelationFieldChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-[180px]" size="sm">
            <SelectValue placeholder="Relation field" />
          </SelectTrigger>
          <SelectContent>
            {relation.fields.map((field) => (
              <SelectItem key={field.name} value={field.name}>
                {field.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <OperatorSelect
        operator={operator}
        operators={operatorOptions}
        disabled={disabled}
        onChange={handleOperatorChange}
      />

      <ValueInput
        field={selectedField}
        operator={operator}
        value={condition.value}
        disabled={disabled}
        onChange={(next) => onUpdate({ value: next })}
      />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRemove}
        disabled={disabled}
      >
        <Trash2 />
      </Button>
    </div>
  );
};

export const FilterBuilder: FC<FilterBuilderProps> = ({
  fields,
  relations = [],
  initialConditions,
  value,
  onChange,
  initialSelectedFields,
  selectedFields,
  onSelectedFieldsChange,
  maxDepth = 3,
  disabled
}) => {
  const [conditions, setConditions] = useState<FilterCondition[]>(() => {
    if (value && value.length > 0) {
      return value;
    }
    if (initialConditions && initialConditions.length > 0) {
      return initialConditions;
    }
    return [createEmptyCondition(fields, relations)];
  });
  const [localSelectedFields, setLocalSelectedFields] = useState<string[]>(() =>
    normalizeSelectedFieldList(initialSelectedFields, fields)
  );
  const selectedFieldValues = useMemo(
    () => normalizeSelectedFieldList(selectedFields ?? localSelectedFields, fields),
    [fields, localSelectedFields, selectedFields]
  );
  const selectedFieldSet = useMemo(
    () => new Set(selectedFieldValues),
    [selectedFieldValues]
  );
  const allFieldsSelected = fields.length > 0 && selectedFieldValues.length === fields.length;

  useEffect(() => {
    if (!value) {
      return;
    }
    setConditions(ensureConditionList(value, fields, relations));
  }, [value, fields, relations]);

  useEffect(() => {
    setLocalSelectedFields((prev) => normalizeSelectedFieldList(prev, fields));
  }, [fields]);

  const updateConditions = useCallback(
    (updater: FilterCondition[] | ((prev: FilterCondition[]) => FilterCondition[])) => {
      setConditions((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        const safeNext = ensureConditionList(next, fields, relations);
        onChange?.(safeNext);
        return safeNext;
      });
    },
    [fields, relations, onChange]
  );

  const handleAddCondition = useCallback(() => {
    updateConditions((prev) => [
      ...prev,
      createEmptyCondition(fields, relations)
    ]);
  }, [fields, relations, updateConditions]);

  const handleAddGroup = useCallback(() => {
    updateConditions((prev) => [
      ...prev,
      createEmptyGroup(fields, relations, "AND")
    ]);
  }, [fields, relations, updateConditions]);

  const handleUpdateCondition = useCallback(
    (id: string, updates: Partial<FilterCondition>) => {
      updateConditions((prev) =>
        updateConditionById(prev, id, (condition) => ({
          ...condition,
          ...updates
        }))
      );
    },
    [updateConditions]
  );

  const handleRemoveCondition = useCallback(
    (id: string) => {
      updateConditions((prev) => removeConditionById(prev, id));
    },
    [updateConditions]
  );

  const handleAddChildCondition = useCallback(
    (id: string) => {
      updateConditions((prev) =>
        addChildToGroup(prev, id, createEmptyCondition(fields, relations))
      );
    },
    [fields, relations, updateConditions]
  );

  const handleAddChildGroup = useCallback(
    (id: string) => {
      updateConditions((prev) =>
        addChildToGroup(prev, id, createEmptyGroup(fields, relations, "AND"))
      );
    },
    [fields, relations, updateConditions]
  );

  const handleGroupLogicChange = useCallback(
    (id: string, logic: FilterLogic) => {
      updateConditions((prev) =>
        updateConditionById(prev, id, (condition) => {
          const children = condition.children ?? [];
          const nextChildren =
            logic === "NOT" ? children.slice(0, 1) : children;
          return {
            ...condition,
            logic,
            children: nextChildren.length > 0 ? nextChildren : children
          };
        })
      );
    },
    [updateConditions]
  );

  const updateSelectedFields = useCallback(
    (nextValues: string[]) => {
      const normalized = normalizeSelectedFieldList(nextValues, fields);
      if (selectedFields === undefined) {
        setLocalSelectedFields(normalized);
      }
      onSelectedFieldsChange?.(normalized);
    },
    [fields, onSelectedFieldsChange, selectedFields]
  );

  const handleToggleSelectedField = useCallback(
    (fieldName: string, checked: boolean) => {
      if (checked) {
        updateSelectedFields([...selectedFieldValues, fieldName]);
        return;
      }
      updateSelectedFields(selectedFieldValues.filter((field) => field !== fieldName));
    },
    [selectedFieldValues, updateSelectedFields]
  );

  const handleSelectAllFields = useCallback(() => {
    updateSelectedFields(fields.map((field) => field.name));
  }, [fields, updateSelectedFields]);

  const handleClearSelectedFields = useCallback(() => {
    updateSelectedFields([]);
  }, [updateSelectedFields]);

  const renderConditions = useCallback(
    (items: FilterCondition[], logic: FilterLogic, depth: number) => {
      return items.map((condition, index) => (
        <Fragment key={condition.id}>
          {index > 0 && logic !== "NOT" && <LogicSeparator logic={logic} />}
          {condition.children ? (
            <FilterGroup
              logic={condition.logic ?? "AND"}
              depth={depth}
              maxDepth={maxDepth}
              disabled={disabled}
              onLogicChange={(nextLogic) => handleGroupLogicChange(condition.id, nextLogic)}
              onRemove={() => handleRemoveCondition(condition.id)}
              onAddCondition={() => handleAddChildCondition(condition.id)}
              onAddGroup={() => handleAddChildGroup(condition.id)}
            >
              {renderConditions(
                condition.children,
                condition.logic ?? "AND",
                depth + 1
              )}
            </FilterGroup>
          ) : (
            <FilterConditionRow
              condition={condition}
              fields={fields}
              relations={relations}
              disabled={disabled}
              onUpdate={(updates) => handleUpdateCondition(condition.id, updates)}
              onRemove={() => handleRemoveCondition(condition.id)}
            />
          )}
        </Fragment>
      ));
    },
    [
      disabled,
      fields,
      handleAddChildCondition,
      handleAddChildGroup,
      handleGroupLogicChange,
      handleRemoveCondition,
      handleUpdateCondition,
      maxDepth,
      relations
    ]
  );

  const hasFields = fields.length > 0 || relations.length > 0;

  if (!hasFields) {
    return (
      <div className="rounded-md border border-dashed border-muted-foreground/40 p-4 text-sm text-muted-foreground">
        No filterable fields available.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-md border border-muted-foreground/20 bg-muted/5 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-1">
            <p className="text-sm font-medium">Selected fields</p>
            <p className="text-xs text-muted-foreground">
              Restrict query payload to selected model fields.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAllFields}
              disabled={disabled || allFieldsSelected}
            >
              Select all
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearSelectedFields}
              disabled={disabled || selectedFieldValues.length === 0}
            >
              Clear
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {fields.map((field) => {
            const checked = selectedFieldSet.has(field.name);
            return (
              <label
                key={field.name}
                className="flex items-center gap-2 rounded border border-transparent px-2 py-1 text-sm hover:border-muted-foreground/20"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value) =>
                    handleToggleSelectedField(field.name, value === true)
                  }
                  disabled={disabled}
                />
                <span>{field.label}</span>
              </label>
            );
          })}
        </div>
      </div>
      <div className="space-y-3">
        {renderConditions(conditions, "AND", 0)}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddCondition}
          disabled={disabled}
        >
          <Plus />
          Add condition
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddGroup}
          disabled={disabled}
        >
          <Plus />
          Add group
        </Button>
      </div>
    </div>
  );
};

export default FilterBuilder;
