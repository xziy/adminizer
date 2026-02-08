import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import Waterline, { Config } from "waterline";
// @ts-ignore
import sailsDisk from "sails-disk";
import { Adminizer, WaterlineAdapter } from "../../src";
import { config as baseConfig } from "../datamocks/adminizerConfig";
import Test from "../datamocks/Test";
import Example from "../datamocks/Example";
import type { AddressInfo } from "node:net";
import { randomUUID } from "node:crypto";
import type { UserAP } from "../../src/models/UserAP";
import { resolveModelEntry, buildEntity } from "../../src/lib/filters/utils/modelResolver";
import { DataAccessor } from "../../src/lib/DataAccessor";

process.env.VITEST = "1";

type TestUserKey = "admin" | "alice" | "bob";

let users: Record<TestUserKey, UserAP> = {
  admin: {
    id: 1,
    login: "admin",
    fullName: "Admin",
    isAdministrator: true,
    groups: [{ id: 1, name: "admin", tokens: [] }] as any
  },
  alice: {
    id: 2,
    login: "alice",
    fullName: "Alice",
    isAdministrator: false,
    groups: [{ id: 2, name: "users", tokens: [] }] as any
  },
  bob: {
    id: 3,
    login: "bob",
    fullName: "Bob",
    isAdministrator: false,
    groups: [{ id: 3, name: "users", tokens: [] }] as any
  }
};

const systemUser: UserAP = {
  id: 0,
  login: "system",
  fullName: "System",
  isAdministrator: true,
  groups: []
};

describe("Filters API", () => {
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
        path: "filters*"
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
    const aliceRecord = await userEntry.model.create(
      { login: "alice", fullName: "Alice", isAdministrator: false },
      userAccessor
    );
    const bobRecord = await userEntry.model.create(
      { login: "bob", fullName: "Bob", isAdministrator: false },
      userAccessor
    );

    users = {
      ...users,
      admin: { ...users.admin, id: Number(adminRecord.id) },
      alice: { ...users.alice, id: Number(aliceRecord.id) },
      bob: { ...users.bob, id: Number(bobRecord.id) }
    };

    server = adminizer.app.listen(0);
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(async () => {
    await clearFilters();
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await new Promise<void>((resolve) => orm.teardown(resolve));
  });

  it("creates, updates, fetches and deletes a filter", async () => {
    const createResult = await jsonRequest("/admin/filters", {
      method: "POST",
      body: { name: "Active Tests", modelName: "test" }
    });

    expect(createResult.response.status).toBe(201);
    expect(createResult.json?.success).toBe(true);
    const filterId = createResult.json?.data?.id as string;
    expect(filterId).toBeTruthy();

    const updateResult = await jsonRequest(`/admin/filters/${filterId}`, {
      method: "PATCH",
      body: { name: "Updated Tests" }
    });

    expect(updateResult.response.status).toBe(200);
    expect(updateResult.json?.data?.name).toBe("Updated Tests");

    const getResult = await jsonRequest(`/admin/filters/${filterId}`);
    expect(getResult.response.status).toBe(200);
    expect(getResult.json?.data?.name).toBe("Updated Tests");

    const deleteResult = await jsonRequest(`/admin/filters/${filterId}`, {
      method: "DELETE"
    });
    expect(deleteResult.response.status).toBe(200);
    expect(deleteResult.json?.success).toBe(true);

    const missingResult = await jsonRequest(`/admin/filters/${filterId}`);
    expect(missingResult.response.status).toBe(404);
  });

  it("hides system filters by default and includes them when requested", async () => {
    const regular = await jsonRequest("/admin/filters", {
      method: "POST",
      body: { name: "Regular Filter", modelName: "test" }
    });
    const system = await jsonRequest("/admin/filters", {
      method: "POST",
      body: { name: "System Filter", modelName: "test", isSystemFilter: true }
    });

    const regularId = regular.json?.data?.id as string;
    const systemId = system.json?.data?.id as string;

    const listDefault = await jsonRequest("/admin/filters?modelName=test");
    expect(listDefault.response.status).toBe(200);
    const defaultIds = (listDefault.json?.data ?? []).map((item: any) => item.id);
    expect(defaultIds).toContain(regularId);
    expect(defaultIds).not.toContain(systemId);

    const listAll = await jsonRequest("/admin/filters?modelName=test&includeSystem=true");
    const allIds = (listAll.json?.data ?? []).map((item: any) => item.id);
    expect(allIds).toContain(regularId);
    expect(allIds).toContain(systemId);
  });

  it("enforces access rules for private filters", async () => {
    const created = await jsonRequest("/admin/filters", {
      method: "POST",
      user: "alice",
      body: { name: "Alice Private", modelName: "test" }
    });
    const filterId = created.json?.data?.id as string;

    const forbidden = await jsonRequest(`/admin/filters/${filterId}`, { user: "bob" });
    expect(forbidden.response.status).toBe(403);

    const publicCreated = await jsonRequest("/admin/filters", {
      method: "POST",
      user: "alice",
      body: { name: "Alice Public", modelName: "test", visibility: "public" }
    });
    const publicId = publicCreated.json?.data?.id as string;

    const listAsBob = await jsonRequest("/admin/filters?modelName=test", { user: "bob" });
    const listIds = (listAsBob.json?.data ?? []).map((item: any) => item.id);
    expect(listIds).toContain(publicId);
  });

  it("redirects to a list page via direct link", async () => {
    const created = await jsonRequest("/admin/filters", {
      method: "POST",
      body: { name: "Direct Link Filter", modelName: "test", visibility: "public" }
    });
    const filterId = created.json?.data?.id as string;

    const response = await jsonRequest(`/admin/filter/${filterId}`, {
      redirect: "manual"
    });

    expect(response.response.status).toBe(302);
    const location = response.response.headers.get("location");
    expect(location).toContain(`/admin/model/test?filterId=${filterId}`);
  });

  it("validates and migrates legacy filters", async () => {
    const filterEntry = resolveModelEntry(adminizer, "FilterAP");
    const accessor = new DataAccessor(
      adminizer,
      users.admin,
      buildEntity(adminizer, filterEntry),
      "add"
    );

    const legacySlug = `legacy-${randomUUID().slice(0, 8)}`;
    const legacyFilter = await filterEntry.model.create(
      {
        name: "Legacy Filter",
        modelName: "test",
        slug: legacySlug,
        conditions: [
          { id: "1", field: "title", operator: "old_like", value: "legacy" }
        ],
        visibility: "private",
        owner: users.admin.id,
        version: 0
      } as any,
      accessor
    );

    const validateResult = await jsonRequest(`/admin/filters/${legacyFilter.id}/validate`, {
      method: "POST"
    });
    expect(validateResult.response.status).toBe(200);
    expect(validateResult.json?.validation?.needsMigration).toBe(true);
    expect(validateResult.json?.validation?.warnings?.join(" ")).toContain(
      "Outdated filter format version 0"
    );

    const migrateResult = await jsonRequest(`/admin/filters/${legacyFilter.id}/migrate`, {
      method: "POST"
    });
    expect(migrateResult.response.status).toBe(200);
    expect(migrateResult.json?.migrated).toBe(true);
    expect(migrateResult.json?.data?.version).toBe(1);
    expect(migrateResult.json?.data?.conditions?.[0]?.operator).toBe("like");
  });
});
