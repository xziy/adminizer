/**
 * Custom field condition result
 */
export interface CustomFieldCondition {
    rawSQL?: string;
    params?: any[];
    inMemory?: (record: any) => boolean;
    criteria?: Record<string, any>;
}

/**
 * Custom field handler definition
 */
export interface CustomFieldHandlerDefinition {
    /**
     * Handler name for display
     */
    name: string;

    /**
     * Handler description
     */
    description?: string;

    /**
     * Build condition for the custom field
     * @param operator - Filter operator (eq, like, etc.)
     * @param value - Filter value
     * @param dialect - Database dialect (postgres, mysql, waterline)
     * @param params - Additional parameters for the handler
     */
    buildCondition: (
        operator: string,
        value: any,
        dialect: string,
        params?: any
    ) => CustomFieldCondition;

    /**
     * Validate value before applying filter
     */
    validate?: (value: any) => { valid: boolean; error?: string };
}

/**
 * Registry options
 */
export interface RegisterOptions {
    /**
     * Force overwrite existing handler
     */
    force?: boolean;
}

/**
 * CustomFieldHandler - registry for custom field handlers
 *
 * Allows registering custom handlers for complex fields like:
 * - JSON fields (phone.number, metadata.key)
 * - Computed fields (discountAmount = price * discount)
 * - Full-text search
 * - Geo-spatial queries
 * - etc.
 *
 * Example usage:
 * ```typescript
 * CustomFieldHandler.register('Order.phone', {
 *     name: 'Phone Search',
 *     description: 'Search by phone number in JSON field',
 *     buildCondition: (operator, value, dialect) => {
 *         if (dialect === 'postgres') {
 *             return {
 *                 rawSQL: "(phone->>'number') LIKE $1",
 *                 params: [`%${value}%`]
 *             };
 *         }
 *         // Fallback for Waterline
 *         return {
 *             inMemory: (record) => record.phone?.number?.includes(value)
 *         };
 *     }
 * });
 * ```
 */
export class CustomFieldHandler {
    private static handlers: Map<string, CustomFieldHandlerDefinition> = new Map();

    /**
     * Register a custom handler for a model field
     * @param id - Identifier in format "ModelName.fieldName" or "ModelName.field.nested"
     * @param handler - Handler definition
     * @param options - Registration options
     */
    static register(
        id: string,
        handler: CustomFieldHandlerDefinition,
        options?: RegisterOptions
    ): void {
        if (this.handlers.has(id) && !options?.force) {
            throw new Error(`Handler '${id}' is already registered. Use force: true to overwrite.`);
        }

        this.handlers.set(id, handler);
    }

    /**
     * Get handler by ID
     */
    static get(id: string): CustomFieldHandlerDefinition | undefined {
        return this.handlers.get(id);
    }

    /**
     * Check if handler exists
     */
    static has(id: string): boolean {
        return this.handlers.has(id);
    }

    /**
     * Get all handlers
     */
    static getAll(): Map<string, CustomFieldHandlerDefinition> {
        return new Map(this.handlers);
    }

    /**
     * Get handlers for a specific model
     * @param modelName - Model name (e.g., "Order")
     * @returns Map of field handlers for the model
     */
    static getForModel(modelName: string): Map<string, CustomFieldHandlerDefinition> {
        const modelHandlers = new Map<string, CustomFieldHandlerDefinition>();
        const prefix = `${modelName}.`;

        for (const [id, handler] of this.handlers.entries()) {
            if (id.startsWith(prefix)) {
                modelHandlers.set(id, handler);
            }
        }

        return modelHandlers;
    }

    /**
     * Unregister a handler
     */
    static unregister(id: string): boolean {
        return this.handlers.delete(id);
    }

    /**
     * Clear all handlers (useful for testing)
     */
    static clear(): void {
        this.handlers.clear();
    }

    /**
     * Get count of registered handlers
     */
    static count(): number {
        return this.handlers.size;
    }
}

// Export for convenience
export default CustomFieldHandler;
