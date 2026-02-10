import { FilterAP, FilterCondition, FilterSortDirection, FilterVisibility } from "../../models/FilterAP";
import { CriteriaBuilder } from "./CriteriaBuilder";

export type ProgrammaticFilterDraft = Pick<FilterAP, "name" | "modelName"> &
  Partial<
    Pick<
      FilterAP,
      | "description"
      | "conditions"
      | "sortField"
      | "sortDirection"
      | "visibility"
      | "selectedFields"
      | "icon"
      | "color"
      | "isPinned"
      | "isSystemFilter"
    >
  >;

/**
 * Builds draft payload for filter creation/update flows.
 * The draft is designed for FilterRepository.create/update input.
 */
export class FilterBuilder {
  private readonly draft: ProgrammaticFilterDraft;

  private constructor(name: string, modelName: string) {
    this.draft = {
      name,
      modelName,
      conditions: [],
      visibility: "private"
    };
  }

  /**
   * Starts fluent filter configuration.
   * Use name/modelName as mandatory identity fields.
   */
  public static create(name: string, modelName: string): FilterBuilder {
    return new FilterBuilder(name, modelName);
  }

  /**
   * Sets optional human-readable description.
   * Keep this short for better UI readability.
   */
  public withDescription(description: string): this {
    this.draft.description = description;
    return this;
  }

  /**
   * Replaces full conditions list.
   * Use this when conditions are built outside builder.
   */
  public withConditions(conditions: FilterCondition[]): this {
    this.draft.conditions = conditions.map((condition) => ({ ...condition }));
    return this;
  }

  /**
   * Sets conditions from CriteriaBuilder instance.
   * Use this to keep fluent workflow concise.
   */
  public withCriteria(criteria: CriteriaBuilder): this {
    this.draft.conditions = criteria.build();
    return this;
  }

  /**
   * Sets default ordering for filter execution.
   * The sort direction is normalized to ASC by default.
   */
  public withSort(field: string, direction: FilterSortDirection = "ASC"): this {
    this.draft.sortField = field;
    this.draft.sortDirection = direction;
    return this;
  }

  /**
   * Sets filter visibility for sharing.
   * Default value remains private.
   */
  public withVisibility(visibility: FilterVisibility): this {
    this.draft.visibility = visibility;
    return this;
  }

  /**
   * Sets selected fields list for optimized queries.
   * Empty values are removed on assignment.
   */
  public withSelectedFields(fields: string[]): this {
    this.draft.selectedFields = fields
      .map((field) => String(field).trim())
      .filter((field) => field.length > 0);
    return this;
  }

  /**
   * Sets visual settings used in filter UI.
   * These values are optional and non-functional.
   */
  public withAppearance(icon: string, color: string): this {
    this.draft.icon = icon;
    this.draft.color = color;
    return this;
  }

  /**
   * Pins filter in quick access lists.
   * Useful for frequently used presets.
   */
  public withPinned(value = true): this {
    this.draft.isPinned = value;
    return this;
  }

  /**
   * Marks filter as system-level preset.
   * UI can hide such filters from editing.
   */
  public withSystemFlag(value = true): this {
    this.draft.isSystemFilter = value;
    return this;
  }

  /**
   * Returns immutable draft payload.
   * Use this result for repository calls.
   */
  public build(): ProgrammaticFilterDraft {
    return {
      ...this.draft,
      conditions: this.draft.conditions?.map((condition) => ({ ...condition })),
      selectedFields: this.draft.selectedFields ? [...this.draft.selectedFields] : undefined
    };
  }
}
