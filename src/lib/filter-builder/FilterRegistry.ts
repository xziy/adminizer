import { ProgrammaticFilterDraft } from "./FilterBuilder";

export type RegisteredFilterFactory = () => ProgrammaticFilterDraft;

/**
 * Stores named programmatic filter factories.
 * Use this registry to keep preset creation centralized.
 */
export class FilterRegistry {
  private readonly factories = new Map<string, RegisteredFilterFactory>();

  /**
   * Registers a filter draft factory by key.
   * Existing keys are rejected unless overwrite is true.
   */
  public register(
    key: string,
    factory: RegisteredFilterFactory,
    options: { overwrite?: boolean } = {}
  ): this {
    const normalizedKey = this.normalizeKey(key);

    if (this.factories.has(normalizedKey) && options.overwrite !== true) {
      throw new Error(`Filter '${normalizedKey}' is already registered`);
    }

    this.factories.set(normalizedKey, factory);
    return this;
  }

  /**
   * Returns true when a key is already registered.
   * Use it for optional conditional registration.
   */
  public has(key: string): boolean {
    return this.factories.has(this.normalizeKey(key));
  }

  /**
   * Removes factory from the registry.
   * The call is idempotent for missing keys.
   */
  public unregister(key: string): boolean {
    return this.factories.delete(this.normalizeKey(key));
  }

  /**
   * Creates an immutable draft from a registered factory.
   * Result is deeply cloned for conditions and selectedFields arrays.
   */
  public create(key: string): ProgrammaticFilterDraft {
    const normalizedKey = this.normalizeKey(key);
    const factory = this.factories.get(normalizedKey);

    if (!factory) {
      throw new Error(`Filter '${normalizedKey}' is not registered`);
    }

    return this.cloneDraft(factory());
  }

  /**
   * Returns registered keys sorted for deterministic output.
   * Useful for diagnostics and tests.
   */
  public keys(): string[] {
    return Array.from(this.factories.keys()).sort((a, b) => a.localeCompare(b));
  }

  /**
   * Normalizes incoming registry key.
   * Empty keys are rejected early.
   */
  private normalizeKey(key: string): string {
    const normalized = String(key).trim();
    if (!normalized) {
      throw new Error("Filter key is required");
    }
    return normalized;
  }

  /**
   * Clones draft arrays so callers cannot mutate registry internals.
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
