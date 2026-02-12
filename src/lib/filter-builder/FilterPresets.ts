import { FilterBuilder, ProgrammaticFilterDraft } from "./FilterBuilder";

export type FilterPresetResolver = () => ProgrammaticFilterDraft;

/**
 * Manages reusable filter preset resolvers.
 * Presets produce draft payloads ready for repository calls.
 */
export class FilterPresets {
  private readonly resolvers = new Map<string, FilterPresetResolver>();

  constructor() {
    this.registerDefaultPresets();
  }

  /**
   * Registers a named preset resolver.
   * Existing names are rejected unless overwrite is true.
   */
  public register(
    name: string,
    resolver: FilterPresetResolver,
    options: { overwrite?: boolean } = {}
  ): this {
    const normalizedName = this.normalizeName(name);

    if (this.resolvers.has(normalizedName) && options.overwrite !== true) {
      throw new Error(`Preset '${normalizedName}' is already registered`);
    }

    this.resolvers.set(normalizedName, resolver);
    return this;
  }

  /**
   * Resolves a preset and returns cloned draft payload.
   * This protects internal resolver outputs from mutation.
   */
  public apply(name: string): ProgrammaticFilterDraft {
    const normalizedName = this.normalizeName(name);
    const resolver = this.resolvers.get(normalizedName);

    if (!resolver) {
      throw new Error(`Preset '${normalizedName}' is not registered`);
    }

    return this.cloneDraft(resolver());
  }

  /**
   * Returns true if a preset is available.
   * Use it to gate optional flows.
   */
  public has(name: string): boolean {
    return this.resolvers.has(this.normalizeName(name));
  }

  /**
   * Returns all preset names sorted alphabetically.
   * Useful for diagnostics and UI choice lists.
   */
  public names(): string[] {
    return Array.from(this.resolvers.keys()).sort((a, b) => a.localeCompare(b));
  }

  /**
   * Registers a small set of practical defaults.
   * Defaults can be overwritten by consumers.
   */
  private registerDefaultPresets(): void {
    this.register("active-records", () =>
      FilterBuilder.create("Active records", "Record")
        .withDescription("Default preset for active entities")
        .withConditions([
          {
            id: "preset-active-status",
            field: "status",
            operator: "eq",
            value: "active",
            logic: "AND"
          }
        ])
        .build()
    );
  }

  /**
   * Normalizes preset name input.
   * Empty names are rejected early.
   */
  private normalizeName(name: string): string {
    const normalized = String(name).trim();
    if (!normalized) {
      throw new Error("Preset name is required");
    }
    return normalized;
  }

  /**
   * Clones draft arrays so resolver output stays immutable.
   * Primitive fields are copied with spread syntax.
   */
  private cloneDraft(draft: ProgrammaticFilterDraft): ProgrammaticFilterDraft {
    return {
      ...draft,
      conditions: draft.conditions?.map((condition) => ({ ...condition })),
      selectedFields: draft.selectedFields ? [...draft.selectedFields] : undefined
    };
  }
}
