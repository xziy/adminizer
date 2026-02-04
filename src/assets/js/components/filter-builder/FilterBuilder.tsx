import * as React from "react";
import { useCallback, useMemo } from "react";
import { ConditionGroup } from "./ConditionGroup";
import {
    FilterCondition,
    FilterBuilderProps,
    FilterBuilderLabels,
    defaultLabels,
    createConditionGroup,
} from "./types";
import { cn } from "@/lib/utils";

/**
 * FilterBuilder - Visual query builder component
 *
 * Features:
 * - Add/remove conditions
 * - AND/OR/NOT grouping with nesting
 * - Field-specific operators
 * - Type-aware value inputs
 * - Depth limiting for safety
 *
 * @example
 * ```tsx
 * <FilterBuilder
 *   conditions={conditions}
 *   fields={[
 *     { name: 'name', label: 'Name', type: 'string' },
 *     { name: 'age', label: 'Age', type: 'number' },
 *     { name: 'status', label: 'Status', type: 'string', options: [
 *       { value: 'active', label: 'Active' },
 *       { value: 'inactive', label: 'Inactive' }
 *     ]},
 *   ]}
 *   onChange={setConditions}
 * />
 * ```
 */
export function FilterBuilder({
    conditions,
    fields,
    onChange,
    maxDepth = 5,
    allowRawSQL = false,
    isAdmin = false,
    labels: customLabels,
}: FilterBuilderProps) {
    const labels: FilterBuilderLabels = useMemo(
        () => ({ ...defaultLabels, ...customLabels }),
        [customLabels]
    );

    // Ensure we always have a root group
    const rootCondition: FilterCondition = useMemo(() => {
        if (conditions.length === 0) {
            return createConditionGroup('AND');
        }

        // If conditions is an array of simple conditions, wrap in AND group
        if (conditions.length > 0 && !conditions[0].logic) {
            return {
                id: 'root',
                logic: 'AND' as const,
                children: conditions,
            };
        }

        // If first condition is already a group, use it
        if (conditions.length === 1 && conditions[0].logic) {
            return conditions[0];
        }

        // Multiple top-level items, wrap them
        return {
            id: 'root',
            logic: 'AND' as const,
            children: conditions,
        };
    }, [conditions]);

    const handleRootChange = useCallback(
        (updated: FilterCondition) => {
            // Extract children from root group for cleaner API
            if (updated.children) {
                onChange(updated.children);
            } else {
                onChange([updated]);
            }
        },
        [onChange]
    );

    // Memoize fields with stable reference
    const sortedFields = useMemo(
        () => [...fields].sort((a, b) => a.label.localeCompare(b.label)),
        [fields]
    );

    return (
        <div className="filter-builder">
            <ConditionGroup
                condition={rootCondition}
                fields={sortedFields}
                labels={labels}
                onChange={handleRootChange}
                depth={0}
                maxDepth={maxDepth}
                isRoot={true}
            />
        </div>
    );
}

/**
 * Hook for managing filter builder state
 */
export function useFilterBuilder(initialConditions: FilterCondition[] = []) {
    const [conditions, setConditions] = React.useState<FilterCondition[]>(initialConditions);

    const reset = useCallback(() => {
        setConditions([]);
    }, []);

    const hasConditions = useMemo(() => {
        const checkConditions = (conds: FilterCondition[]): boolean => {
            return conds.some((c) => {
                if (c.logic && c.children) {
                    return checkConditions(c.children);
                }
                return c.field && c.operator;
            });
        };
        return checkConditions(conditions);
    }, [conditions]);

    const getValidConditions = useCallback(() => {
        const filterValid = (conds: FilterCondition[]): FilterCondition[] => {
            return conds
                .map((c) => {
                    if (c.logic && c.children) {
                        const validChildren = filterValid(c.children);
                        if (validChildren.length === 0) return null;
                        return { ...c, children: validChildren };
                    }
                    if (!c.field || !c.operator) return null;
                    return c;
                })
                .filter(Boolean) as FilterCondition[];
        };
        return filterValid(conditions);
    }, [conditions]);

    return {
        conditions,
        setConditions,
        reset,
        hasConditions,
        getValidConditions,
    };
}

export default FilterBuilder;
