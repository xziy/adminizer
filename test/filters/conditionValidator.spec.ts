import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ConditionValidator } from "../../src/lib/filters/validators/ConditionValidator";
import { CustomFieldHandler } from "../../src/lib/query-builder/CustomFieldHandler";
import type { FilterCondition } from "../../src/models/FilterAP";
import type { Fields } from "../../src/helpers/fieldsHelper";
import type { UserAP } from "../../src/models/UserAP";

vi.mock("../../src/lib/filters/utils/modelResolver", () => {
  return {
    resolveModelContext: vi.fn()
  };
});

import { resolveModelContext } from "../../src/lib/filters/utils/modelResolver";

const buildUser = (overrides: Partial<UserAP> = {}): UserAP => ({
  id: 1,
  login: "user",
  fullName: "User",
  isAdministrator: false,
  groups: [],
  ...overrides
});

const buildFields = (): Fields => ({
  name: {
    config: { title: "Name", type: "string" },
    model: { type: "string" } as any,
    populated: undefined,
    modelConfig: {} as any
  },
  profile: {
    config: { title: "Profile", type: "association" },
    model: { type: "association", model: "ProfileAP" } as any,
    populated: {
      title: {
        config: { title: "Title", type: "string" },
        model: { type: "string" } as any,
        populated: undefined,
        modelConfig: {} as any
      }
    },
    modelConfig: {} as any
  }
});

describe("ConditionValidator", () => {
  const adminizer = {} as any;
  const mockedResolve = vi.mocked(resolveModelContext);

  beforeEach(() => {
    mockedResolve.mockReturnValue({
      entry: { name: "UserAP", config: { model: "UserAP" }, model: {} as any },
      entity: {} as any,
      dataAccessor: {} as any,
      fields: buildFields(),
      adapterType: "sequelize"
    });
  });

  afterEach(() => {
    CustomFieldHandler.clear();
    mockedResolve.mockReset();
  });

  it("rejects unknown fields", () => {
    const validator = new ConditionValidator(adminizer);
    const user = buildUser();

    const result = validator.validate(
      [{ id: "1", field: "unknown", operator: "eq", value: "x" }],
      "UserAP",
      user
    );

    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("INVALID_FIELD");
  });

  it("validates relation conditions", () => {
    const validator = new ConditionValidator(adminizer);
    const user = buildUser();

    const result = validator.validate(
      [
        {
          id: "1",
          field: "",
          operator: "eq",
          value: "Hello",
          relation: "profile",
          relationField: "title"
        }
      ],
      "UserAP",
      user
    );

    expect(result.valid).toBe(true);
    expect(result.sanitizedConditions).toHaveLength(1);
  });

  it("blocks raw SQL custom handler for non-admins", () => {
    CustomFieldHandler.register("UserAP.custom", {
      name: "Custom",
      buildCondition: () => ({ rawSQL: "status = ?", rawSQLParams: ["active"] })
    });

    const validator = new ConditionValidator(adminizer);
    const user = buildUser({ isAdministrator: false });

    const conditions: FilterCondition[] = [
      {
        id: "1",
        field: "status",
        operator: "eq",
        value: "active",
        customHandler: "UserAP.custom"
      }
    ];

    const result = validator.validate(conditions, "UserAP", user);

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.code === "RAW_SQL_FORBIDDEN")).toBe(true);
  });
});
