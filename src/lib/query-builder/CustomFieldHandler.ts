import type { FilterOperator } from "../../models/FilterAP";

export type CustomFieldCondition = {
  criteria?: Record<string, unknown>;
  rawSQL?: string;
  rawSQLParams?: unknown[];
  inMemory?: (record: Record<string, unknown>) => boolean;
};

export type CustomFieldHandlerContext = {
  operator: FilterOperator;
  value: unknown;
  adapterType: string;
  field?: string;
  modelName?: string;
  params?: unknown;
};

export type CustomFieldValidationResult = {
  valid: boolean;
  reason?: string;
};

export interface CustomFieldHandlerDefinition {
  name: string;
  description?: string;
  operators?: FilterOperator[];
  validate?: (context: CustomFieldHandlerContext) => CustomFieldValidationResult;
  buildCondition: (context: CustomFieldHandlerContext) => CustomFieldCondition;
}

export class CustomFieldHandler {
  private static handlers: Map<string, CustomFieldHandlerDefinition> = new Map();

  static register(id: string, handler: CustomFieldHandlerDefinition): void {
    const normalizedId = String(id ?? "").trim();
    if (!normalizedId) {
      throw new Error("CustomFieldHandler.register requires a non-empty id");
    }
    if (!handler || typeof handler.buildCondition !== "function") {
      throw new Error(`CustomFieldHandler.register requires a handler with buildCondition for "${normalizedId}"`);
    }
    this.handlers.set(normalizedId, handler);
  }

  static get(id: string): CustomFieldHandlerDefinition | undefined {
    const normalizedId = String(id ?? "").trim();
    if (!normalizedId) {
      return undefined;
    }
    return this.handlers.get(normalizedId);
  }

  static getAll(): Map<string, CustomFieldHandlerDefinition> {
    return new Map(this.handlers);
  }

  static getForModel(modelName: string): Map<string, CustomFieldHandlerDefinition> {
    const normalized = String(modelName ?? "").trim();
    if (!normalized) {
      return new Map();
    }

    const prefix = `${normalized}.`;
    const result = new Map<string, CustomFieldHandlerDefinition>();

    for (const [id, handler] of this.handlers.entries()) {
      if (id.startsWith(prefix)) {
        const fieldName = id.slice(prefix.length);
        result.set(fieldName, handler);
      }
    }

    return result;
  }

  static clear(): void {
    this.handlers.clear();
  }
}
