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
import { randomUUID } from "node:crypto";

process.env.VITEST = "1";

type TestUserKey = "admin";

let users: Record<TestUserKey, UserAP> = {
  admin: {
    id: 1,
    login: "admin",
    fullName: "Admin",
    isAdministrator: true,
    isActive: true,
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

describe("Public API", () => {
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
    return { response, json, text };
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
  };

  const createFilterRecord = async (apiEnabled: boolean) => {
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
        conditions: [{ id: "1", field: "status", operator: "eq", value: "active" }],
        visibility: "private",
        owner: users.admin.id,
        version: 1,
        apiEnabled
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
        path: "api/*"
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
      { login: "admin", fullName: "Admin", isAdministrator: true, isActive: true },
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

  it("returns JSON data for a valid token", async () => {
    await seedRecords();
    const filterRecord = await createFilterRecord(true);

    const tokenResult = await jsonRequest("/admin/api/user/api-token", {
      method: "POST"
    });

    expect(tokenResult.response.status).toBe(201);
    const token = tokenResult.json?.token as string;
    expect(token).toMatch(/^ap_/);

    const publicResult = await jsonRequest(`/admin/api/public/json/${filterRecord.id}?token=${token}`);
    expect(publicResult.response.status).toBe(200);
    expect(publicResult.json?.success).toBe(true);
    expect(publicResult.json?.data?.length).toBe(1);
    expect(publicResult.json?.data?.[0]?.status).toBe("active");
  });

  it("rejects requests without a token", async () => {
    await seedRecords();
    const filterRecord = await createFilterRecord(true);

    const publicResult = await jsonRequest(`/admin/api/public/json/${filterRecord.id}`);
    expect(publicResult.response.status).toBe(401);
  });

  it("rejects filters that are not public", async () => {
    await seedRecords();
    const filterRecord = await createFilterRecord(false);

    const tokenResult = await jsonRequest("/admin/api/user/api-token", {
      method: "POST"
    });
    const token = tokenResult.json?.token as string;

    const publicResult = await jsonRequest(`/admin/api/public/json/${filterRecord.id}?token=${token}`);
    expect(publicResult.response.status).toBe(403);
  });

  it("returns Atom feed", async () => {
    await seedRecords();
    const filterRecord = await createFilterRecord(true);

    const tokenResult = await jsonRequest("/admin/api/user/api-token", {
      method: "POST"
    });
    const token = tokenResult.json?.token as string;

    const response = await fetch(
      `${baseUrl}/admin/api/public/atom/${filterRecord.id}?token=${token}`,
      { headers: { "x-test-user": "admin" } }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/atom+xml");
    const body = await response.text();
    expect(body).toContain("<feed");
  });

  it("rejects invalid tokens", async () => {
    await seedRecords();
    const filterRecord = await createFilterRecord(true);

    const publicResult = await jsonRequest(
      `/admin/api/public/json/${filterRecord.id}?token=ap_invalid_token`
    );
    expect(publicResult.response.status).toBe(401);
  });

  it("regenerates token and invalidates the old one", async () => {
    await seedRecords();
    const filterRecord = await createFilterRecord(true);

    const tokenResult = await jsonRequest("/admin/api/user/api-token", {
      method: "POST"
    });
    const oldToken = tokenResult.json?.token as string;
    expect(oldToken).toMatch(/^ap_/);

    const regenerateResult = await jsonRequest("/admin/api/user/api-token/regenerate", {
      method: "POST"
    });
    const newToken = regenerateResult.json?.token as string;
    expect(newToken).toMatch(/^ap_/);
    expect(newToken).not.toBe(oldToken);

    const oldTokenResult = await jsonRequest(
      `/admin/api/public/json/${filterRecord.id}?token=${oldToken}`
    );
    expect(oldTokenResult.response.status).toBe(401);

    const newTokenResult = await jsonRequest(
      `/admin/api/public/json/${filterRecord.id}?token=${newToken}`
    );
    expect(newTokenResult.response.status).toBe(200);
    expect(newTokenResult.json?.success).toBe(true);
  });
});
