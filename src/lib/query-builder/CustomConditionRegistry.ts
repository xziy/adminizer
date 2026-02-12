import {
  CustomFieldHandler,
  CustomFieldHandlerDefinition
} from "./CustomFieldHandler";

/**
 * Registry facade for custom conditions.
 * Keeps an explicit API for phase-12 features while reusing CustomFieldHandler internals.
 */
export class CustomConditionRegistry {
  public register(id: string, definition: CustomFieldHandlerDefinition): void {
    CustomFieldHandler.register(id, definition);
  }

  public get(id: string): CustomFieldHandlerDefinition | undefined {
    return CustomFieldHandler.get(id);
  }

  public getAll(): Map<string, CustomFieldHandlerDefinition> {
    return CustomFieldHandler.getAll();
  }

  public getForModel(modelName: string): Map<string, CustomFieldHandlerDefinition> {
    return CustomFieldHandler.getForModel(modelName);
  }

  public clear(): void {
    CustomFieldHandler.clear();
  }
}

