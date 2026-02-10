import { describe, it, expect, vi, afterEach } from "vitest";
import { ModernQueryBuilder } from "../src/lib/query-builder/ModernQueryBuilder";
import { Fields } from "../src/helpers/fieldsHelper";
import { FilterCondition } from "../src/models/FilterAP";
import { AbstractModel } from "../src/lib/model/AbstractModel";
import { DataAccessor } from "../src/lib/DataAccessor";
import { CustomFieldHandler } from "../src/lib/query-builder/CustomFieldHandler";

const buildFields = (): Fields => ({
  name: {
    config: { title: "Name", type: "string", displayModifier: (value: unknown) => String(value).toUpperCase() },
    model: { type: "string" },
    populated: undefined,
    modelConfig: {} as any
  },
  age: {
    config: { title: "Age", type: "number" },
    model: { type: "number" },
    populated: undefined,
    modelConfig: {} as any
  },
  active: {
    config: { title: "Active", type: "boolean" },
    model: { type: "boolean" },
    populated: undefined,
    modelConfig: {} as any
  },
  profile: {
    config: { title: "Profile", type: "association", displayField: "label" },
    model: { type: "association", model: "Profile" },
    populated: undefined,
    modelConfig: {} as any
  },
  tags: {
    config: { title: "Tags", type: "association-many", displayField: "name" },
    model: { type: "association-many", collection: "Tag" },
    populated: undefined,
    modelConfig: {} as any
  },
  meta: {
    config: { title: "Meta", type: "json" },
    model: { type: "json" },
    populated: undefined,
    modelConfig: {} as any
  }
});

const buildDataAccessor = () =>
  ({
    entity: { config: { adapter: "sequelize" } },
    adminizer: { config: { system: { defaultORM: "sequelize" } }, ormAdapters: [] }
  }) as unknown as DataAccessor;

const buildModel = () =>
  ({
    primaryKey: "id",
    find: vi.fn(),
    count: vi.fn()
  }) as unknown as AbstractModel<any>;

describe("ModernQueryBuilder", () => {
  afterEach(() => {
    CustomFieldHandler.clear();
  });
  it("builds condition groups with nested logic", () => {
    const builder = new ModernQueryBuilder(buildModel(), buildFields(), buildDataAccessor());
    const builderAny = builder as unknown as {
      buildConditionGroup: (conditions: FilterCondition[], logic?: "AND" | "OR" | "NOT") => Record<string, any>;
    };

    const conditions: FilterCondition[] = [
      { id: "1", field: "name", operator: "eq", value: "Alice" },
      {
        id: "g1",
        logic: "OR",
        children: [
          { id: "2", field: "age", operator: "gt", value: 18 },
          { id: "3", field: "active", operator: "eq", value: true }
        ]
      }
    ];

    const result = builderAny.buildConditionGroup(conditions, "AND");

    expect(result).toEqual({
      and: [
        { name: "Alice" },
        {
          or: [
            { age: { ">": 18 } },
            { active: true }
          ]
        }
      ]
    });
  });

  it("supports NOT logic with a single condition", () => {
    const builder = new ModernQueryBuilder(buildModel(), buildFields(), buildDataAccessor());
    const builderAny = builder as unknown as {
      buildConditionGroup: (conditions: FilterCondition[], logic?: "AND" | "OR" | "NOT") => Record<string, any>;
    };

    const result = builderAny.buildConditionGroup(
      [{ id: "1", field: "age", operator: "lt", value: 5 }],
      "NOT"
    );

    expect(result).toEqual({ not: { age: { "<": 5 } } });
  });

  it("handles deeply nested condition groups", () => {
    const builder = new ModernQueryBuilder(buildModel(), buildFields(), buildDataAccessor());
    const builderAny = builder as unknown as {
      buildConditionGroup: (conditions: FilterCondition[], logic?: "AND" | "OR" | "NOT") => Record<string, any>;
    };

    const nested: FilterCondition = {
      id: "g1",
      logic: "AND",
      children: [
        {
          id: "g2",
          logic: "OR",
          children: [
            {
              id: "g3",
              logic: "AND",
              children: [
                {
                  id: "g4",
                  logic: "OR",
                  children: [
                    {
                      id: "g5",
                      logic: "AND",
                      children: [
                        { id: "c1", field: "name", operator: "eq", value: "Alice" },
                        { id: "c2", field: "age", operator: "gt", value: 30 }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };

    const result = builderAny.buildConditionGroup([nested], "AND");

    expect(result).toEqual({
      and: [
        { name: "Alice" },
        { age: { ">": 30 } }
      ]
    });
  });

  it("maps operators to ORM-friendly criteria", () => {
    const builder = new ModernQueryBuilder(buildModel(), buildFields(), buildDataAccessor());
    const builderAny = builder as unknown as {
      buildSingleCondition: (condition: FilterCondition) => Record<string, any>;
    };

    const cases: Array<[FilterCondition, Record<string, any>]> = [
      [{ id: "1", field: "name", operator: "eq", value: "Alice" }, { name: "Alice" }],
      [{ id: "2", field: "age", operator: "neq", value: 10 }, { age: { "!=": 10 } }],
      [{ id: "3", field: "age", operator: "gt", value: 18 }, { age: { ">": 18 } }],
      [{ id: "4", field: "age", operator: "gte", value: 18 }, { age: { ">=": 18 } }],
      [{ id: "5", field: "age", operator: "lt", value: 18 }, { age: { "<": 18 } }],
      [{ id: "6", field: "age", operator: "lte", value: 18 }, { age: { "<=": 18 } }],
      [{ id: "7", field: "name", operator: "like", value: "ali" }, { name: { contains: "ali" } }],
      [{ id: "8", field: "name", operator: "ilike", value: "ali" }, { name: { ilike: "%ali%" } }],
      [{ id: "9", field: "name", operator: "startsWith", value: "Al" }, { name: { startsWith: "Al" } }],
      [{ id: "10", field: "name", operator: "endsWith", value: "ce" }, { name: { endsWith: "ce" } }],
      [{ id: "11", field: "age", operator: "in", value: [1, 2] }, { age: { in: [1, 2] } }],
      [{ id: "12", field: "age", operator: "notIn", value: [3, 4] }, { age: { nin: [3, 4] } }],
      [{ id: "13", field: "age", operator: "between", value: [1, 5] }, { age: { ">=": 1, "<=": 5 } }],
      [{ id: "14", field: "age", operator: "isNull", value: null }, { age: null }],
      [{ id: "15", field: "age", operator: "isNotNull", value: null }, { age: { "!=": null } }],
      [{ id: "16", field: "name", operator: "regex", value: "^Al" }, { name: { regexp: "^Al" } }]
    ];

    cases.forEach(([condition, expected]) => {
      expect(builderAny.buildSingleCondition(condition)).toEqual(expected);
    });
  });

  it("builds relation conditions for Sequelize adapters", () => {
    const builder = new ModernQueryBuilder(buildModel(), buildFields(), buildDataAccessor());
    const builderAny = builder as unknown as {
      buildSingleCondition: (condition: FilterCondition) => Record<string, any>;
    };

    const relationCondition: FilterCondition = {
      id: "r1",
      field: "profile",
      operator: "eq",
      value: "Primary",
      relation: "profile",
      relationField: "label"
    };

    expect(builderAny.buildSingleCondition(relationCondition)).toEqual({
      _relation: {
        name: "profile",
        field: "label",
        condition: "Primary"
      }
    });
  });

  it("uses custom handler criteria when provided", () => {
    CustomFieldHandler.register("UserAP.phone", {
      name: "Phone",
      buildCondition: () => ({ criteria: { name: { contains: "alice" } } })
    });

    const builder = new ModernQueryBuilder(buildModel(), buildFields(), buildDataAccessor());
    const builderAny = builder as unknown as {
      buildSingleCondition: (condition: FilterCondition) => Record<string, any>;
    };

    const condition: FilterCondition = {
      id: "c1",
      field: "phone",
      operator: "eq",
      value: "alice",
      customHandler: "UserAP.phone"
    };

    expect(builderAny.buildSingleCondition(condition)).toEqual({
      name: { contains: "alice" }
    });
  });

  it("builds raw SQL conditions for custom handlers on sequelize", () => {
    CustomFieldHandler.register("Order.phone", {
      name: "Phone",
      buildCondition: ({ value }) => ({
        rawSQL: "phone->>'number' = ?",
        rawSQLParams: [value]
      })
    });

    const builder = new ModernQueryBuilder(buildModel(), buildFields(), buildDataAccessor());
    const builderAny = builder as unknown as {
      buildSingleCondition: (condition: FilterCondition) => Record<string, any>;
    };

    const condition: FilterCondition = {
      id: "c2",
      field: "phone",
      operator: "eq",
      value: "555",
      customHandler: "Order.phone"
    };

    expect(builderAny.buildSingleCondition(condition)).toEqual({
      __rawSQL: {
        sql: "phone->>'number' = ?",
        params: ["555"]
      }
    });
  });

  it("applies in-memory custom handlers when required", async () => {
    CustomFieldHandler.register("Order.phone", {
      name: "Phone",
      buildCondition: ({ value }) => ({
        inMemory: (record) => {
          if (typeof value !== "string") {
            return false;
          }
          const phone = (record as Record<string, any>).phone;
          return typeof phone === "object" && typeof phone?.number === "string"
            ? phone.number.includes(value)
            : false;
        }
      })
    });

    const model = buildModel();
    const dataAccessor = {
      entity: { config: { adapter: "waterline" } },
      adminizer: { config: { system: { defaultORM: "waterline" } }, ormAdapters: [] }
    } as unknown as DataAccessor;
    const builder = new ModernQueryBuilder(model, buildFields(), dataAccessor);

    model.find.mockResolvedValueOnce([
      { id: "1", name: "alpha", phone: { number: "555-123" } },
      { id: "2", name: "beta", phone: { number: "999-999" } }
    ]);
    model.count.mockResolvedValueOnce(2);

    const result = await builder.execute({
      page: 1,
      limit: 10,
      filters: [
        {
          id: "f1",
          field: "phone",
          operator: "eq",
          value: "555",
          customHandler: "Order.phone"
        }
      ]
    });

    expect(result.filtered).toBe(1);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe("1");
  });

  it("drops invalid conditions and keeps valid ones", () => {
    const builder = new ModernQueryBuilder(buildModel(), buildFields(), buildDataAccessor());
    const builderAny = builder as unknown as {
      buildConditionGroup: (conditions: FilterCondition[], logic?: "AND" | "OR" | "NOT") => Record<string, any>;
    };

    const conditions: FilterCondition[] = [
      { id: "1", field: "unknown", operator: "eq", value: "x" },
      { id: "2", field: "active", operator: "eq", value: "maybe" },
      { id: "3", field: "age", operator: "between", value: [10] },
      { id: "4", field: "name", operator: "eq", value: "Alice" }
    ];

    const result = builderAny.buildConditionGroup(conditions, "AND");

    expect(result).toEqual({ name: "Alice" });
  });

  it("drops nested groups with only invalid children", () => {
    const builder = new ModernQueryBuilder(buildModel(), buildFields(), buildDataAccessor());
    const builderAny = builder as unknown as {
      buildConditionGroup: (conditions: FilterCondition[], logic?: "AND" | "OR" | "NOT") => Record<string, any>;
    };

    const group: FilterCondition = {
      id: "g1",
      logic: "AND",
      children: [
        { id: "c1", field: "unknown", operator: "eq", value: "x" }
      ]
    };

    expect(builderAny.buildConditionGroup([group], "AND")).toEqual({});
  });

  it("sanitizes numeric and boolean values before building conditions", () => {
    const builder = new ModernQueryBuilder(buildModel(), buildFields(), buildDataAccessor());
    const builderAny = builder as unknown as {
      buildSingleCondition: (condition: FilterCondition) => Record<string, any>;
    };

    expect(
      builderAny.buildSingleCondition({ id: "n1", field: "age", operator: "eq", value: "42" })
    ).toEqual({ age: 42 });

    expect(
      builderAny.buildSingleCondition({ id: "b1", field: "active", operator: "eq", value: "true" })
    ).toEqual({ active: true });
  });

  it("rejects operators that are not allowed for the field type", () => {
    const builder = new ModernQueryBuilder(buildModel(), buildFields(), buildDataAccessor());
    const builderAny = builder as unknown as {
      buildConditionGroup: (conditions: FilterCondition[], logic?: "AND" | "OR" | "NOT") => Record<string, any>;
    };

    const result = builderAny.buildConditionGroup([
      { id: "1", field: "active", operator: "like", value: "true" }
    ], "AND");

    expect(result).toEqual({});
  });

  it("rejects values that exceed security limits", () => {
    const builder = new ModernQueryBuilder(buildModel(), buildFields(), buildDataAccessor());
    const builderAny = builder as unknown as {
      buildConditionGroup: (conditions: FilterCondition[], logic?: "AND" | "OR" | "NOT") => Record<string, any>;
      securityLimits?: { maxStringLength: number; maxArrayLength: number; maxDepth: number };
    };

    const maxStringLength = builderAny.securityLimits?.maxStringLength ?? 256;
    const maxArrayLength = builderAny.securityLimits?.maxArrayLength ?? 50;
    const longValue = "x".repeat(maxStringLength + 1);
    const longList = Array.from({ length: maxArrayLength + 1 }).map((_, index) => index);

    const longValueResult = builderAny.buildConditionGroup([
      { id: "1", field: "name", operator: "eq", value: longValue }
    ], "AND");

    const longListResult = builderAny.buildConditionGroup([
      { id: "2", field: "age", operator: "in", value: longList }
    ], "AND");

    expect(longValueResult).toEqual({});
    expect(longListResult).toEqual({});
  });

  it("drops groups deeper than the allowed depth", () => {
    const builder = new ModernQueryBuilder(buildModel(), buildFields(), buildDataAccessor());
    const builderAny = builder as unknown as {
      buildConditionGroup: (conditions: FilterCondition[], logic?: "AND" | "OR" | "NOT") => Record<string, any>;
      securityLimits?: { maxDepth: number };
    };

    const maxDepth = builderAny.securityLimits?.maxDepth ?? 5;

    const buildDeepGroup = (depth: number): FilterCondition => {
      let current: FilterCondition = {
        id: `leaf-${depth}`,
        field: "name",
        operator: "eq",
        value: "Alice"
      };

      for (let i = 0; i < depth; i += 1) {
        current = {
          id: `group-${i}`,
          logic: "AND",
          children: [current]
        };
      }

      return current;
    };

    const deepGroup = buildDeepGroup(maxDepth + 2);
    const result = builderAny.buildConditionGroup([deepGroup], "AND");

    expect(result).toEqual({});
  });

  it("builds global search conditions based on field types", () => {
    const builder = new ModernQueryBuilder(buildModel(), buildFields(), buildDataAccessor());
    const builderAny = builder as unknown as {
      buildGlobalSearch: (searchValue: string, fields?: string[]) => Record<string, any> | null;
    };

    const result = builderAny.buildGlobalSearch("true");
    expect(result).toEqual(
      expect.objectContaining({
        or: expect.arrayContaining([
          { active: true },
          { name: { contains: "true" } }
        ])
      })
    );
  });

  it("builds global search conditions for the specified fields only", () => {
    const builder = new ModernQueryBuilder(buildModel(), buildFields(), buildDataAccessor());
    const builderAny = builder as unknown as {
      buildGlobalSearch: (searchValue: string, fields?: string[]) => Record<string, any> | null;
    };

    const result = builderAny.buildGlobalSearch("alice", ["name"]);

    expect(result).toEqual({
      or: [{ name: { contains: "alice" } }]
    });
  });

  it("builds where clause with filters and global search", async () => {
    const builder = new ModernQueryBuilder(buildModel(), buildFields(), buildDataAccessor());
    const builderAny = builder as unknown as {
      buildWhere: (params: {
        filters?: FilterCondition[];
        globalSearch?: string;
        fields?: string[];
      }) => Promise<Record<string, any>>;
    };

    const result = await builderAny.buildWhere({
      filters: [{ id: "1", field: "name", operator: "eq", value: "Alice" }],
      globalSearch: "Bob"
    });

    expect(result).toEqual({
      and: [
        { name: "Alice" },
        { or: [{ name: { contains: "Bob" } }] }
      ]
    });
  });

  it("builds where clause as empty when no filters or search are provided", async () => {
    const builder = new ModernQueryBuilder(buildModel(), buildFields(), buildDataAccessor());
    const builderAny = builder as unknown as {
      buildWhere: (params: {
        filters?: FilterCondition[];
        globalSearch?: string;
        fields?: string[];
      }) => Promise<Record<string, any>>;
    };

    const result = await builderAny.buildWhere({});

    expect(result).toEqual({});
  });

  it("ignores invalid filters when building where clause", async () => {
    const builder = new ModernQueryBuilder(buildModel(), buildFields(), buildDataAccessor());
    const builderAny = builder as unknown as {
      buildWhere: (params: { filters?: FilterCondition[] }) => Promise<Record<string, any>>;
    };

    const result = await builderAny.buildWhere({
      filters: [{ id: "bad", field: "unknown", operator: "eq", value: "x" }]
    });

    expect(result).toEqual({});
  });

  it("throws when NOT group has multiple conditions", () => {
    const builder = new ModernQueryBuilder(buildModel(), buildFields(), buildDataAccessor());
    const builderAny = builder as unknown as {
      buildConditionGroup: (conditions: FilterCondition[], logic?: "AND" | "OR" | "NOT") => Record<string, any>;
    };

    const conditions: FilterCondition[] = [
      { id: "1", field: "name", operator: "eq", value: "Alice" },
      { id: "2", field: "age", operator: "gt", value: 18 }
    ];

    expect(() => builderAny.buildConditionGroup(conditions, "NOT")).toThrow(
      "NOT operator requires exactly one condition"
    );
  });

  it("builds ordering with a safe fallback", () => {
    const builder = new ModernQueryBuilder(buildModel(), buildFields(), buildDataAccessor());
    const builderAny = builder as unknown as {
      buildOrder: (params: { sort?: string; sortDirection?: "ASC" | "DESC" }) => string;
    };

    expect(builderAny.buildOrder({ sort: "name", sortDirection: "ASC" })).toBe("name ASC");
    expect(builderAny.buildOrder({ sort: "unknown", sortDirection: "ASC" })).toBe("id DESC");
    expect(builderAny.buildOrder({ sort: "name" })).toBe("name DESC");
  });

  it("maps data using display modifiers and associations", () => {
    const builder = new ModernQueryBuilder(buildModel(), buildFields(), buildDataAccessor());
    const builderAny = builder as unknown as {
      mapData: (data: Array<Record<string, any>>) => Array<Record<string, any>>;
    };

    const data = [
      {
        id: "1",
        name: "alice",
        age: 30,
        active: true,
        profile: { id: "p1", label: "Primary" },
        tags: [{ id: "t1", name: "A" }, { id: "t2", name: "B" }],
        meta: { flag: true }
      }
    ];

    const result = builderAny.mapData(data);
    expect(result).toEqual([
      {
        id: "1",
        name: "ALICE",
        age: 30,
        active: true,
        profile: "Primary",
        tags: "A, B",
        meta: "{\"flag\":true}"
      }
    ]);
  });

  it("executes queries and returns paginated results", async () => {
    const model = buildModel();
    const fields = buildFields();
    const dataAccessor = buildDataAccessor();
    const builder = new ModernQueryBuilder(model, fields, dataAccessor);

    model.find.mockResolvedValueOnce([{ id: "1", name: "alice" }]);
    model.count.mockResolvedValueOnce(10).mockResolvedValueOnce(1);

    const result = await builder.execute({ page: 1, limit: 5 });

    expect(result.total).toBe(10);
    expect(result.filtered).toBe(1);
    expect(result.pages).toBe(1);
    expect(model.find).toHaveBeenCalledWith(
      { where: {}, sort: "id DESC", skip: 0, limit: 5 },
      dataAccessor,
      undefined
    );
    expect(result.data[0].name).toBe("ALICE");
  });

  it("passes selected fields to model queries", async () => {
    const model = buildModel();
    const fields = buildFields();
    const dataAccessor = buildDataAccessor();
    const builder = new ModernQueryBuilder(model, fields, dataAccessor);

    model.find.mockResolvedValueOnce([{ id: "1", name: "alice" }]);
    model.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

    await builder.execute({ page: 1, limit: 5, selectFields: ["name"] });

    expect(model.find).toHaveBeenCalledWith(
      { where: {}, sort: "id DESC", skip: 0, limit: 5 },
      dataAccessor,
      { select: ["id", "name"] }
    );
  });

  it("streams data in chunks", async () => {
    const model = buildModel();
    const fields = buildFields();
    const dataAccessor = buildDataAccessor();
    const builder = new ModernQueryBuilder(model, fields, dataAccessor);

    const dataset = [
      { id: "1", name: "alpha" },
      { id: "2", name: "beta" },
      { id: "3", name: "gamma" }
    ];

    model.find.mockImplementation(async (criteria: { skip?: number; limit?: number }) => {
      const skip = criteria.skip ?? 0;
      const limit = criteria.limit ?? dataset.length;
      return dataset.slice(skip, skip + limit);
    });

    const rows: Array<Record<string, unknown>> = [];
    for await (const row of builder.stream({ page: 1, limit: 2 }, { chunkSize: 2 })) {
      rows.push(row);
    }

    expect(rows.length).toBe(3);
    expect(rows[0].name).toBe("ALPHA");
    expect(rows[2].name).toBe("GAMMA");
  });
});
