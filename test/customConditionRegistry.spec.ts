import { describe, it, expect } from "vitest";
import { CustomConditionRegistry } from "../src/lib/query-builder/CustomConditionRegistry";

describe("CustomConditionRegistry", () => {
  it("registers and resolves a custom condition definition", () => {
    const registry = new CustomConditionRegistry();
    registry.clear();

    registry.register("Order.phone", {
      buildCondition: (context) => ({
        rawSQL: "phone->>'number' = ?",
        rawSQLParams: [context.value]
      })
    });

    const definition = registry.get("Order.phone");
    expect(definition).toBeDefined();
    expect(typeof definition?.buildCondition).toBe("function");
  });

  it("filters definitions by model name", () => {
    const registry = new CustomConditionRegistry();
    registry.clear();

    registry.register("Order.phone", {
      buildCondition: () => ({ rawSQL: "1 = 1", rawSQLParams: [] })
    });
    registry.register("Order.total", {
      buildCondition: () => ({ rawSQL: "1 = 1", rawSQLParams: [] })
    });
    registry.register("User.email", {
      buildCondition: () => ({ rawSQL: "1 = 1", rawSQLParams: [] })
    });

    const orderDefinitions = registry.getForModel("Order");
    expect(Array.from(orderDefinitions.keys())).toEqual(["phone", "total"]);
  });
});
