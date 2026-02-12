import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Fields } from "../../src/helpers/fieldsHelper";
import type { FilterAP } from "../../src/models/FilterAP";
import { FilterExecutionService } from "../../src/lib/filters/services/FilterExecutionService";

vi.mock("../../src/lib/filters/utils/modelResolver", () => {
  return {
    resolveModelContext: vi.fn()
  };
});

import { resolveModelContext } from "../../src/lib/filters/utils/modelResolver";

const buildFields = (): Fields => ({
  id: {
    config: { title: "ID", type: "string" },
    model: { type: "string" } as any,
    populated: undefined,
    modelConfig: {} as any
  },
  name: {
    config: { title: "Name", type: "string" },
    model: { type: "string" } as any,
    populated: undefined,
    modelConfig: {} as any
  },
  age: {
    config: { title: "Age", type: "number" },
    model: { type: "number" } as any,
    populated: undefined,
    modelConfig: {} as any
  }
});

describe("FilterExecutionService", () => {
  const mockedResolve = vi.mocked(resolveModelContext);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies normalized selected fields for saved filters", async () => {
    const model = {
      primaryKey: "id",
      find: vi.fn().mockResolvedValue([{ id: "1", name: "Alice" }]),
      count: vi.fn().mockResolvedValue(1)
    } as any;

    mockedResolve.mockReturnValue({
      entry: { name: "UserAP", config: { model: "UserAP" }, model },
      entity: {} as any,
      dataAccessor: {} as any,
      fields: buildFields(),
      adapterType: "sequelize"
    });

    const service = new FilterExecutionService({} as any);
    const filter: Partial<FilterAP> = {
      id: "f1",
      modelName: "UserAP",
      selectedFields: ["name", "unknown", " ", "name"],
      conditions: []
    };

    await service.executeFilter(filter, {} as any, { page: 1, limit: 10 });

    const findCall = model.find.mock.calls[0];
    expect(findCall[2]).toEqual({ select: ["id", "name"] });
  });

  it("applies selected fields in preview execution", async () => {
    const model = {
      primaryKey: "id",
      find: vi.fn().mockResolvedValue([{ id: "1", name: "Alice" }]),
      count: vi.fn().mockResolvedValue(1)
    } as any;

    mockedResolve.mockReturnValue({
      entry: { name: "UserAP", config: { model: "UserAP" }, model },
      entity: {} as any,
      dataAccessor: {} as any,
      fields: buildFields(),
      adapterType: "sequelize"
    });

    const service = new FilterExecutionService({} as any);
    await service.executeTemporary("UserAP", [], {} as any, {
      page: 1,
      limit: 10,
      selectFields: ["age", "unknown"]
    });

    const findCall = model.find.mock.calls[0];
    expect(findCall[2]).toEqual({ select: ["id", "age"] });
  });
});
