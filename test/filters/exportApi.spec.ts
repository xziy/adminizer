import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import Waterline, { Config } from "waterline";
// @ts-ignore
import sailsDisk from "sails-disk";
import { Adminizer, WaterlineAdapter } from "../../src";
import { config as baseConfig } from "../datamocks/adminizerConfig";
import Test from "../datamocks/Test";
import Example from "../datamocks/Example";
import type { AddressInfo } from "node:net";
import type { UserAP } from "../../src/models/UserAP";
import { resolveModelEntry, buildEntity } from "../../src/lib/filters/utils/modelResolver";
import { DataAccessor } from "../../src/lib/DataAccessor";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

process.env.VITEST = "1";

type TestUserKey = "admin";

let users: Record<TestUserKey, UserAP> = {
  admin: {
    id: 1,
    login: "admin",
    fullName: "Admin",
    isAdministrator: true,
    groups: [{ id: 1, name: "admin", tokens: [] }] as any
  }
};

const systemUser: UserAP = {
  id: 0,
  login: "system",
  fullName: "System",
  isAdministrator: true,
  groups: []
};

describe("Export API", () => {
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
      user?: TestUserKey;
      redirect?: RequestRedirect;
    } = {}
  ) => {
    const { method = "GET", body, headers, user = "admin", redirect } = options;
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      redirect,
      headers: {
        "content-type": "application/json",
        "x-test-user": user,
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

  const clearFilters = async () => {
    const filterEntry = resolveModelEntry(adminizer, "FilterAP");
    const columnEntry = resolveModelEntry(adminizer, "FilterColumnAP");
    const adminAccessor = new DataAccessor(
      adminizer,
      users.admin,
      buildEntity(adminizer, filterEntry),
      "remove"
    );
    const columnAccessor = new DataAccessor(
      adminizer,
      users.admin,
      buildEntity(adminizer, columnEntry),
      "remove"
    );

    await columnEntry.model.destroy({}, columnAccessor);
    await filterEntry.model.destroy({}, adminAccessor);
  };

  const clearRecords = async () => {
    const testEntry = resolveModelEntry(adminizer, "test");
    const exampleEntry = resolveModelEntry(adminizer, "example");
    const accessor = new DataAccessor(adminizer, users.admin, buildEntity(adminizer, testEntry), "remove");
    const exampleAccessor = new DataAccessor(adminizer, users.admin, buildEntity(adminizer, exampleEntry), "remove");
    await testEntry.model.destroy({}, accessor);
    await exampleEntry.model.destroy({}, exampleAccessor);
  };

  const seedRecords = async () => {
    const testEntry = resolveModelEntry(adminizer, "test");
    const exampleEntry = resolveModelEntry(adminizer, "example");
    const addAccessor = new DataAccessor(adminizer, users.admin, buildEntity(adminizer, testEntry), "add");
    const exampleAccessor = new DataAccessor(adminizer, users.admin, buildEntity(adminizer, exampleEntry), "add");

    const example = await exampleEntry.model.create(
      { title: "Example A", description: "Example" },
      exampleAccessor
    );

    await testEntry.model.create(
      {
        title: "Active Row",
        status: "active",
        example: example.id
      },
      addAccessor
    );

    await testEntry.model.create(
      {
        title: "Inactive Row",
        status: "inactive",
        example: example.id
      },
      addAccessor
    );

    return example;
  };

  const createFilterRecord = async (conditions: Array<Record<string, unknown>>) => {
    const filterEntry = resolveModelEntry(adminizer, "FilterAP");
    const accessor = new DataAccessor(
      adminizer,
      users.admin,
      buildEntity(adminizer, filterEntry),
      "add"
    );

    const slug = `filter-${randomUUID().slice(0, 8)}`;
    const record = await filterEntry.model.create(
      {
        name: "Active only",
        modelName: "test",
        slug,
        conditions,
        visibility: "private",
        owner: users.admin.id,
        version: 1
      } as any,
      accessor
    );

    return record;
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
      const headerValue = req.headers["x-test-user"];
      const key = Array.isArray(headerValue) ? headerValue[0] : headerValue;
      const userKey = (key as TestUserKey) ?? "admin";
      req.user = users[userKey] ?? users.admin;
      next();
    };

    await adminizer.init({
      ...baseConfig,
      auth: { enable: false },
      cors: {
        enabled: true,
        origin: "http://localhost",
        path: "export*"
      },
      history: {
        enabled: false
      },
      translation: {
        locales: ["en"],
        path: "config/locales/adminpanel",
        defaultLocale: "en"
      }
    });

    const userEntry = resolveModelEntry(adminizer, "UserAP");
    const userAccessor = new DataAccessor(
      adminizer,
      systemUser,
      buildEntity(adminizer, userEntry),
      "add"
    );

    const adminRecord = await userEntry.model.create(
      { login: "admin", fullName: "Admin", isAdministrator: true },
      userAccessor
    );

    users = {
      ...users,
      admin: { ...users.admin, id: Number(adminRecord.id) }
    };

    server = adminizer.app.listen(0);
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(async () => {
    await clearFilters();
    await clearRecords();
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await new Promise<void>((resolve) => orm.teardown(resolve));
  });

  it("exports filtered data to JSON", async () => {
    await seedRecords();

    const filterRecord = await createFilterRecord([
      { id: "1", field: "status", operator: "eq", value: "active" }
    ]);
    const filterId = String(filterRecord.id);
    expect(filterId).toBeTruthy();

    const exportResult = await jsonRequest("/admin/export", {
      method: "POST",
      body: { format: "json", filterId }
    });

    expect(exportResult.response.status).toBe(200);
    expect(exportResult.json?.success).toBe(true);
    const fileName = exportResult.json?.fileName as string;
    expect(fileName).toMatch(/\.json$/);

    const filePath = path.join(process.cwd(), "exports", fileName);
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw) as Array<Record<string, unknown>>;
    expect(data.length).toBe(1);
    expect(data[0].status).toBe("active");

    fs.unlinkSync(filePath);
  });

  it("exports relations data to JSON", async () => {
    const example = await seedRecords();

    const exportResult = await jsonRequest("/admin/export", {
      method: "POST",
      body: { format: "json", modelName: "test" }
    });

    expect(exportResult.response.status).toBe(200);
    expect(exportResult.json?.success).toBe(true);
    const fileName = exportResult.json?.fileName as string;
    const filePath = path.join(process.cwd(), "exports", fileName);
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw) as Array<Record<string, unknown>>;
    expect(data.length).toBeGreaterThan(0);
    expect([example.id, example.title].map(String)).toContain(String(data[0].example));

    fs.unlinkSync(filePath);
  });
});
