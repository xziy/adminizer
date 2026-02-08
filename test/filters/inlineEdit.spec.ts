import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import Waterline, { Config } from "waterline";
// @ts-ignore
import sailsDisk from "sails-disk";
import type { AddressInfo } from "node:net";
import type { UserAP } from "../../src/models/UserAP";
import { Adminizer, WaterlineAdapter } from "../../src";
import { config as baseConfig } from "../datamocks/adminizerConfig";
import Test from "../datamocks/Test";
import Example from "../datamocks/Example";
import { DataAccessor } from "../../src/lib/DataAccessor";
import { resolveModelEntry, buildEntity } from "../../src/lib/filters/utils/modelResolver";
import type { AdminpanelConfig } from "../../src/interfaces/adminpanelConfig";

process.env.VITEST = "1";

const adminUser: UserAP = {
  id: 1,
  login: "admin",
  isAdministrator: true,
  groups: [{ id: 1, name: "admin", tokens: [] }] as any
};

describe("Inline edit API", () => {
  let adminizer: Adminizer;
  let server: import("node:http").Server;
  let baseUrl: string;
  let orm: Waterline.Waterline;

  const jsonRequest = async (
    path: string,
    options: {
      method?: string;
      body?: unknown;
      headers?: Record<string, string>;
    } = {}
  ) => {
    const { method = "GET", body, headers } = options;
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined
    });
    const text = await response.text();
    let json: any = undefined;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = undefined;
      }
    }
    return { response, json };
  };

  const buildConfig = (): AdminpanelConfig => {
    const testConfig = baseConfig.models?.test as any;
    const testFields = testConfig?.fields ?? {};
    return {
      ...baseConfig,
      auth: { enable: false },
      security: { csrf: false },
      history: { enabled: false },
      cors: {
        enabled: true,
        origin: "http://localhost",
        path: "model*"
      },
      models: {
        ...baseConfig.models,
        test: {
          ...testConfig,
          fields: {
            ...testFields,
            title: {
              ...testFields.title,
              inlineEditable: true,
              inlineEditConfig: { maxLength: 5 }
            },
            number: {
              title: "Number",
              type: "number",
              inlineEditable: true,
              inlineEditConfig: { min: 1, max: 5 }
            },
            isActive: {
              title: "Active",
              type: "boolean",
              inlineEditable: true
            },
            status: {
              title: "Status",
              type: "select",
              isIn: ["draft", "active"],
              inlineEditable: true
            },
            guardedField: {
              title: "Restricted Field",
              type: "string",
              inlineEditable: true
            }
          },
          edit: {
            ...testConfig?.edit,
            fields: {
              ...(testConfig?.edit?.fields ?? {}),
              guardedField: false
            }
          }
        }
      }
    };
  };

  const clearTestRecords = async () => {
    const entry = resolveModelEntry(adminizer, "Test");
    const accessor = new DataAccessor(
      adminizer,
      adminUser,
      buildEntity(adminizer, entry),
      "remove"
    );
    await entry.model.destroy({}, accessor);
  };

  const createTestRecord = async (overrides: Record<string, unknown> = {}) => {
    const entry = resolveModelEntry(adminizer, "Test");
    const accessor = new DataAccessor(
      adminizer,
      adminUser,
      buildEntity(adminizer, entry),
      "add"
    );
    return entry.model.create(
      {
        title: "Base",
        number: 2,
        isActive: true,
        status: "draft",
        guardedField: "secret",
        color: "#fff",
        ...overrides
      },
      accessor
    );
  };

  beforeAll(async () => {
    orm = new Waterline();
    await WaterlineAdapter.registerSystemModels(orm);
    orm.registerModel(Test);
    orm.registerModel(Example);

    const waterlineConfig: Config = {
      adapters: {
        disk: sailsDisk
      },
      datastores: {
        default: {
          adapter: "disk",
          // @ts-ignore
          inMemoryOnly: true
        }
      }
    };

    const ontology = await new Promise<any>((resolve, reject) => {
      orm.initialize(waterlineConfig, (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(result);
      });
    });

    const waterlineAdapter = new WaterlineAdapter({ orm, ontology });
    adminizer = new Adminizer([waterlineAdapter]);

    adminizer.defaultMiddleware = (req, _res, next) => {
      req.user = adminUser;
      next();
    };

    await adminizer.init(buildConfig());

    server = adminizer.app.listen(0);
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(async () => {
    await clearTestRecords();
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await new Promise<void>((resolve) => orm.teardown(resolve));
  });

  it("updates boolean fields", async () => {
    const record = await createTestRecord();
    const result = await jsonRequest(`/admin/model/test/${record.id}/field/isActive`, {
      method: "PATCH",
      body: { value: false }
    });

    expect(result.response.status).toBe(200);
    expect(result.json?.data?.isActive).toBe(false);
  });

  it("updates select fields and rejects invalid values", async () => {
    const record = await createTestRecord();
    const ok = await jsonRequest(`/admin/model/test/${record.id}/field/status`, {
      method: "PATCH",
      body: { value: "active" }
    });

    expect(ok.response.status).toBe(200);
    expect(ok.json?.data?.status).toBe("active");

    const invalid = await jsonRequest(`/admin/model/test/${record.id}/field/status`, {
      method: "PATCH",
      body: { value: "unknown" }
    });

    expect(invalid.response.status).toBe(400);
  });

  it("validates number ranges", async () => {
    const record = await createTestRecord();
    const ok = await jsonRequest(`/admin/model/test/${record.id}/field/number`, {
      method: "PATCH",
      body: { value: 4 }
    });
    expect(ok.response.status).toBe(200);
    expect(ok.json?.data?.number).toBe(4);

    const invalid = await jsonRequest(`/admin/model/test/${record.id}/field/number`, {
      method: "PATCH",
      body: { value: 0 }
    });
    expect(invalid.response.status).toBe(400);
  });

  it("validates string length", async () => {
    const record = await createTestRecord();
    const invalid = await jsonRequest(`/admin/model/test/${record.id}/field/title`, {
      method: "PATCH",
      body: { value: "too-long" }
    });
    expect(invalid.response.status).toBe(400);
  });

  it("rejects non-inline editable fields", async () => {
    const record = await createTestRecord();
    const response = await jsonRequest(`/admin/model/test/${record.id}/field/color`, {
      method: "PATCH",
      body: { value: "#000" }
    });
    expect(response.response.status).toBe(403);
  });

  it("rejects fields not available in edit config", async () => {
    const record = await createTestRecord();
    const response = await jsonRequest(
      `/admin/model/test/${record.id}/field/guardedField`,
      {
        method: "PATCH",
        body: { value: "updated" }
      }
    );
    expect(response.response.status).toBe(403);
  });

  it("updates multiple fields in batch", async () => {
    const recordA = await createTestRecord({ title: "A1" });
    const recordB = await createTestRecord({ title: "B1" });

    const response = await jsonRequest("/admin/model/test/batch", {
      method: "PATCH",
      body: {
        updates: [
          { id: recordA.id, fieldName: "isActive", value: false },
          { id: recordB.id, fieldName: "status", value: "active" }
        ]
      }
    });

    expect(response.response.status).toBe(200);
    expect(response.json?.success).toBe(true);
    expect(response.json?.results).toHaveLength(2);
  });

  it("returns errors for invalid batch updates", async () => {
    const record = await createTestRecord();
    const response = await jsonRequest("/admin/model/test/batch", {
      method: "PATCH",
      body: {
        updates: [
          { id: record.id, fieldName: "number", value: 0 },
          { id: record.id, fieldName: "color", value: "#000" },
          { fieldName: "title", value: "OK" }
        ]
      }
    });

    expect(response.response.status).toBe(200);
    expect(response.json?.success).toBe(false);
    expect(response.json?.errors?.length).toBeGreaterThan(0);
  });
});
