import { describe, it, expect, vi } from "vitest";
import { FilterService } from "../src/helpers/FilterService";
import { FilterAP, FilterCondition } from "../src/models/FilterAP";
import { AbstractModel } from "../src/lib/model/AbstractModel";
import { Fields } from "../src/helpers/fieldsHelper";
import { DataAccessor } from "../src/lib/DataAccessor";
import { Adminizer } from "../src/lib/Adminizer";
import { UserAP } from "../src/models/UserAP";

type ModelStub = {
  find: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
  modelname?: string;
  identity?: string;
  primaryKey?: string;
};

const buildFields = (): Fields => ({
  name: {
    config: { title: "Name", type: "string" },
    model: { type: "string" },
    populated: undefined,
    modelConfig: {} as any
  },
  age: {
    config: { title: "Age", type: "number" },
    model: { type: "number" },
    populated: undefined,
    modelConfig: {} as any
  }
});

const buildTargetModel = (): ModelStub =>
  ({
    primaryKey: "id",
    modelname: "UserAP",
    identity: "userap",
    find: vi.fn(),
    count: vi.fn()
  });

const buildFilterModel = () =>
  ({
    findOne: vi.fn()
  }) as unknown as AbstractModel<FilterAP>;

const buildAdminizer = (filterModel: AbstractModel<FilterAP>, modelFilters?: Record<string, any>) => {
  const modelMap = new Map<string, any>([
    ["filterap", filterModel],
    ["userap", { modelname: "UserAP", identity: "userap" }]
  ]);

  return {
    config: {
      filtersEnabled: true,
      modelFilters,
      routePrefix: "/adminizer",
      models: {
        FilterAP: { model: "FilterAP" },
        UserAP: { model: "UserAP" }
      },
      system: { defaultORM: "sequelize" }
    },
    modelHandler: {
      model: {
        get: (name: string) => modelMap.get(name.toLowerCase())
      }
    }
  } as unknown as Adminizer;
};

const buildDataAccessor = (user: UserAP): DataAccessor =>
  ({
    user,
    entity: {
      name: "UserAP",
      config: { model: "UserAP", adapter: "sequelize" }
    },
    adminizer: {
      config: { system: { defaultORM: "sequelize" } },
      ormAdapters: []
    }
  }) as unknown as DataAccessor;

describe("FilterService", () => {
  it("handles filtersEnabled and per-model overrides", () => {
    const filterModel = buildFilterModel();
    const adminizer = buildAdminizer(filterModel, {
      UserAP: { enabled: false, useLegacySearch: true }
    });
    const service = new FilterService(adminizer);

    expect(service.isFiltersEnabled()).toBe(true);
    expect(service.isFiltersEnabledForModel("UserAP")).toBe(false);
    expect(service.isFiltersEnabledForModel("ProductAP")).toBe(true);
    expect(service.shouldUseLegacySearch("UserAP")).toBe(true);
  });

  it("applies filters by slug, merges extra filters, and falls back to public filters", async () => {
    const filterModel = buildFilterModel();
    const adminizer = buildAdminizer(filterModel);
    const service = new FilterService(adminizer);

    const user = {
      id: "u1",
      login: "tester",
      fullName: "Test User",
      isAdministrator: true,
      groups: []
    } as UserAP;

    const filter: FilterAP = {
      id: "f1",
      name: "Active Users",
      modelName: "UserAP",
      slug: "active-users",
      conditions: [{ id: "1", field: "name", operator: "eq", value: "Alice" }],
      sortField: "name",
      sortDirection: "ASC",
      visibility: "public",
      owner: user,
      apiEnabled: false,
      version: 1
    };

    filterModel.findOne = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(filter);

    const targetModel = buildTargetModel();
    const fields = buildFields();
    const dataAccessor = buildDataAccessor(user);
    const extraFilters: FilterCondition[] = [
      { id: "2", field: "age", operator: "gt", value: 18 }
    ];

    targetModel.find.mockResolvedValueOnce([{ id: "1", name: "Alice", age: 30 }]);
    targetModel.count.mockResolvedValueOnce(10).mockResolvedValueOnce(1);

    const result = await service.applyFilterBySlug(
      "active-users",
      targetModel as unknown as AbstractModel<any>,
      fields,
      dataAccessor,
      {
        page: 2,
        limit: 5,
        sort: "age",
        sortDirection: "DESC",
        globalSearch: "Ali",
        extraFilters
      }
    );

    expect(filterModel.findOne).toHaveBeenNthCalledWith(
      1,
      { slug: "active-users" },
      expect.any(DataAccessor)
    );
    expect(filterModel.findOne).toHaveBeenNthCalledWith(
      2,
      { slug: "active-users", visibility: "public" },
      expect.any(DataAccessor)
    );

    const expectedWhere = {
      and: [
        {
          and: [
            { name: "Alice" },
            { age: { ">": 18 } }
          ]
        },
        {
          or: [
            { name: { contains: "Ali" } }
          ]
        }
      ]
    };

    expect(targetModel.find).toHaveBeenCalledWith(
      { where: expectedWhere, sort: "age DESC", skip: 5, limit: 5 },
      dataAccessor
    );
    expect(targetModel.count).toHaveBeenNthCalledWith(1, {}, dataAccessor);
    expect(targetModel.count).toHaveBeenNthCalledWith(2, { where: expectedWhere }, dataAccessor);

    expect(result.total).toBe(10);
    expect(result.filtered).toBe(1);
  });

  it("rejects filters that target a different model", async () => {
    const filterModel = buildFilterModel();
    const adminizer = buildAdminizer(filterModel);
    const service = new FilterService(adminizer);

    const user = {
      id: "u2",
      login: "tester2",
      fullName: "Test User",
      isAdministrator: true,
      groups: []
    } as UserAP;

    const filter: FilterAP = {
      id: "f2",
      name: "Orders Only",
      modelName: "OrderAP",
      slug: "orders-only",
      conditions: [],
      sortDirection: "ASC",
      visibility: "private",
      owner: user,
      apiEnabled: false,
      version: 1
    };

    filterModel.findOne = vi.fn().mockResolvedValueOnce(filter);

    const targetModel = buildTargetModel();
    const fields = buildFields();
    const dataAccessor = buildDataAccessor(user);

    await expect(
      service.applyFilterBySlug(
        "orders-only",
        targetModel as unknown as AbstractModel<any>,
        fields,
        dataAccessor
      )
    ).rejects.toThrow(/configured for model/i);

    expect(targetModel.find).not.toHaveBeenCalled();
  });
});
