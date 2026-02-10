import { randomUUID } from "node:crypto";
import { FilterCondition, FilterOperator } from "../../models/FilterAP";

/**
 * Builds filter conditions with a fluent API.
 * The output is compatible with FilterAP.conditions.
 */
export class CriteriaBuilder {
  private readonly conditions: FilterCondition[] = [];

  /**
   * Adds equality condition.
   * Use it for exact value matching.
   */
  public where(field: string, value: unknown): this {
    return this.addCondition(field, "eq", value);
  }

  /**
   * Adds inequality condition.
   * Use it when record value must differ.
   */
  public whereNot(field: string, value: unknown): this {
    return this.addCondition(field, "neq", value);
  }

  /**
   * Adds greater-than condition.
   * Use it for numeric and date comparisons.
   */
  public whereGt(field: string, value: unknown): this {
    return this.addCondition(field, "gt", value);
  }

  /**
   * Adds greater-or-equal condition.
   * Use it for inclusive lower bound checks.
   */
  public whereGte(field: string, value: unknown): this {
    return this.addCondition(field, "gte", value);
  }

  /**
   * Adds less-than condition.
   * Use it for numeric and date comparisons.
   */
  public whereLt(field: string, value: unknown): this {
    return this.addCondition(field, "lt", value);
  }

  /**
   * Adds less-or-equal condition.
   * Use it for inclusive upper bound checks.
   */
  public whereLte(field: string, value: unknown): this {
    return this.addCondition(field, "lte", value);
  }

  /**
   * Adds inclusion condition.
   * Use it to match any value from the list.
   */
  public whereIn(field: string, values: unknown[]): this {
    return this.addCondition(field, "in", values);
  }

  /**
   * Adds exclusion condition.
   * Use it to omit values from the list.
   */
  public whereNotIn(field: string, values: unknown[]): this {
    return this.addCondition(field, "notIn", values);
  }

  /**
   * Adds contains condition.
   * Use it for case-sensitive substring matching.
   */
  public whereLike(field: string, value: string): this {
    return this.addCondition(field, "like", value);
  }

  /**
   * Adds case-insensitive contains condition.
   * Use it for forgiving text search.
   */
  public whereILike(field: string, value: string): this {
    return this.addCondition(field, "ilike", value);
  }

  /**
   * Adds startsWith condition.
   * Use it for prefix-based filtering.
   */
  public whereStartsWith(field: string, value: string): this {
    return this.addCondition(field, "startsWith", value);
  }

  /**
   * Adds endsWith condition.
   * Use it for suffix-based filtering.
   */
  public whereEndsWith(field: string, value: string): this {
    return this.addCondition(field, "endsWith", value);
  }

  /**
   * Adds between condition.
   * Use it when value should be inside a range.
   */
  public whereBetween(field: string, min: unknown, max: unknown): this {
    return this.addCondition(field, "between", [min, max]);
  }

  /**
   * Adds isNull condition.
   * Use it when value must be empty.
   */
  public whereNull(field: string): this {
    return this.addCondition(field, "isNull", null);
  }

  /**
   * Adds isNotNull condition.
   * Use it when value must be present.
   */
  public whereNotNull(field: string): this {
    return this.addCondition(field, "isNotNull", null);
  }

  /**
   * Adds OR condition.
   * Use it for alternative matching.
   */
  public orWhere(field: string, operator: FilterOperator, value: unknown): this {
    return this.addCondition(field, operator, value, "OR");
  }

  /**
   * Adds NOT condition.
   * Use it to negate any supported operator.
   */
  public notWhere(field: string, operator: FilterOperator, value: unknown): this {
    return this.addCondition(field, operator, value, "NOT");
  }

  /**
   * Returns an immutable copy of accumulated conditions.
   * Use it when passing conditions into services/repositories.
   */
  public build(): FilterCondition[] {
    return this.conditions.map((condition) => ({ ...condition }));
  }

  /**
   * Creates a condition and pushes it into internal list.
   * Logic defaults to AND to keep explicit chain semantics.
   */
  private addCondition(
    field: string,
    operator: FilterOperator,
    value: unknown,
    logic: "AND" | "OR" | "NOT" = "AND"
  ): this {
    this.conditions.push({
      id: randomUUID(),
      field,
      operator,
      value,
      logic
    });

    return this;
  }
}
