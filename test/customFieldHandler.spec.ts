import { describe, it, expect, beforeEach } from "vitest";
import { CustomFieldHandler } from "../src/lib/query-builder/CustomFieldHandler";

describe("CustomFieldHandler", () => {
  beforeEach(() => {
    CustomFieldHandler.clear();
  });

  it("registers and retrieves handlers", () => {
    CustomFieldHandler.register("Order.phone", {
      name: "Phone",
      buildCondition: () => ({ criteria: { phone: { contains: "555" } } })
    });

    const handler = CustomFieldHandler.get("Order.phone");
    expect(handler).toBeTruthy();
    expect(handler?.name).toBe("Phone");
  });

  it("returns handlers for a model", () => {
    CustomFieldHandler.register("Order.phone", {
      name: "Phone",
      buildCondition: () => ({ criteria: { phone: { contains: "555" } } })
    });
    CustomFieldHandler.register("Order.status", {
      name: "Status",
      buildCondition: () => ({ criteria: { status: "paid" } })
    });
    CustomFieldHandler.register("Product.sku", {
      name: "SKU",
      buildCondition: () => ({ criteria: { sku: "ABC" } })
    });

    const orderHandlers = CustomFieldHandler.getForModel("Order");
    expect(orderHandlers.size).toBe(2);
    expect(orderHandlers.has("phone")).toBe(true);
    expect(orderHandlers.has("status")).toBe(true);
    expect(orderHandlers.has("sku")).toBe(false);
  });
});
