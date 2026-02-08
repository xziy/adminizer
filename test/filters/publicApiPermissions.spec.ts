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
process.env.ADMINPANEL_LAZY_GEN_ADMIN_ENABLE = "1";

type TestUserKey = "blocked" | "limited" | "full" | "noexport";

let users: Record<TestUserKey, UserAP> = {
  blocked: {
    id: 1,
    login: "blocked",
    fullName: "Blocked",
    isAdministrator: false,
    isActive: true,
    groups: []
  },
  limited: {
    id: 2,
    login: "limited",
    fullName: "Limited",
    isAdministrator: false,
    isActive: true,
    groups: []
  },
  full: {
    id: 3,
    login: "full",
    fullName: "Full",
    isAdministrator: false,
    isActive: true,
    groups: []
  },
  noexport: {
    id: 4,
    login: "noexport",
    fullName: "No Export",
    isAdministrator: false,
    isActive: true,
    groups: []
  }
};

const systemUser: UserAP = {
  id: 0,
  login: "system",
  fullName: "System",
  isAdministrator: true,
  groups: []
};

describe("Public API permissions", () => {
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
    const { method = "GET", body, headers, user = "full", redirect } = options;
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
      systemUser,
      buildEntity(adminizer, filterEntry),
      "remove"
    );
    const columnAccessor = new DataAccessor(
      adminizer,
      systemUser,
      buildEntity(adminizer, columnEntry),
      "remove"
    );

    await columnEntry.model.destroy({}, columnAccessor);
    await filterEntry.model.destroy({}, adminAccessor);
  };

  const clearRecords = async () => {
    const testEntry = resolveModelEntry(adminizer, "test");
    const exampleEntry = resolveModelEntry(adminizer, "example");
    const accessor = new DataAccessor(adminizer, systemUser, buildEntity(adminizer, testEntry), "remove");
    const exampleAccessor = new DataAccessor(adminizer, systemUser, buildEntity(adminizer, exampleEntry), "remove");
    await testEntry.model.destroy({}, accessor);
    await exampleEntry.model.destroy({}, exampleAccessor);
  };

  const seedRecords = async () => {
    const testEntry = resolveModelEntry(adminizer, "test");
    const exampleEntry = resolveModelEntry(adminizer, "example");
    const addAccessor = new DataAccessor(adminizer, systemUser, buildEntity(adminizer, testEntry), "add");
    const exampleAccessor = new DataAccessor(adminizer, systemUser, buildEntity(adminizer, exampleEntry), "add");

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

  const createFilterRecord = async (ownerId: number) => {
    const filterEntry = resolveModelEntry(adminizer, "FilterAP");
    const accessor = new DataAccessor(
      adminizer,
      systemUser,
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
        owner: ownerId,
        version: 1,
        apiEnabled: true
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
      const userKey = (key as TestUserKey) ?? "full";
      req.user = users[userKey] ?? users.full;
      next();
    };

    await adminizer.init({
      ...baseConfig,
      auth: { enable: true },
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

    const groupEntry = resolveModelEntry(adminizer, "GroupAP");
    const userEntry = resolveModelEntry(adminizer, "UserAP");
    const groupAccessor = new DataAccessor(
      adminizer,
      systemUser,
      buildEntity(adminizer, groupEntry),
      "add"
    );
    const userAccessorAdd = new DataAccessor(
      adminizer,
      systemUser,
      buildEntity(adminizer, userEntry),
      "add"
    );
    const userAccessorEdit = new DataAccessor(
      adminizer,
      systemUser,
      buildEntity(adminizer, userEntry),
      "edit"
    );
    const userAccessorView = new DataAccessor(
      adminizer,
      systemUser,
      buildEntity(adminizer, userEntry),
      "view"
    );

    const blockedGroup = await groupEntry.model.create(
      { name: "blocked", tokens: [] },
      groupAccessor
    );
    const limitedGroup = await groupEntry.model.create(
      { name: "limited", tokens: ["api-token-create", "export-json"] },
      groupAccessor
    );
    const fullGroup = await groupEntry.model.create(
      {
        name: "full",
        tokens: ["api-token-create", "api-public-access", "export-json", "read-test-model"]
      },
      groupAccessor
    );
    const noExportGroup = await groupEntry.model.create(
      { name: "noexport", tokens: ["api-token-create", "api-public-access"] },
      groupAccessor
    );

    const blockedRecord = await userEntry.model.create(
      { login: "blocked", fullName: "Blocked", isAdministrator: false, isActive: true },
      userAccessorAdd
    );
    const limitedRecord = await userEntry.model.create(
      { login: "limited", fullName: "Limited", isAdministrator: false, isActive: true },
      userAccessorAdd
    );
    const fullRecord = await userEntry.model.create(
      { login: "full", fullName: "Full", isAdministrator: false, isActive: true },
      userAccessorAdd
    );
    const noExportRecord = await userEntry.model.create(
      { login: "noexport", fullName: "No Export", isAdministrator: false, isActive: true },
      userAccessorAdd
    );

    await userEntry.model.updateOne(
      { id: blockedRecord.id },
      { groups: [blockedGroup.id] },
      userAccessorEdit
    );
    await userEntry.model.updateOne(
      { id: limitedRecord.id },
      { groups: [limitedGroup.id] },
      userAccessorEdit
    );
    await userEntry.model.updateOne(
      { id: fullRecord.id },
      { groups: [fullGroup.id] },
      userAccessorEdit
    );
    await userEntry.model.updateOne(
      { id: noExportRecord.id },
      { groups: [noExportGroup.id] },
      userAccessorEdit
    );

    users = {
      blocked: (await userEntry.model.findOne({ id: blockedRecord.id }, userAccessorView)) as UserAP,
      limited: (await userEntry.model.findOne({ id: limitedRecord.id }, userAccessorView)) as UserAP,
      full: (await userEntry.model.findOne({ id: fullRecord.id }, userAccessorView)) as UserAP,
      noexport: (await userEntry.model.findOne({ id: noExportRecord.id }, userAccessorView)) as UserAP
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

  it("denies token creation without api-token-create", async () => {
    const result = await jsonRequest("/admin/api/user/api-token", {
      method: "POST",
      user: "blocked"
    });

    expect(result.response.status).toBe(403);
  });

  it("denies public API without api-public-access", async () => {
    await seedRecords();
    const filterRecord = await createFilterRecord(users.limited.id);

    const tokenResult = await jsonRequest("/admin/api/user/api-token", {
      method: "POST",
      user: "limited"
    });
    expect(tokenResult.response.status).toBe(201);
    const token = tokenResult.json?.token as string;

    const publicResult = await jsonRequest(
      `/admin/api/public/json/${filterRecord.id}?token=${token}`,
      { user: "limited" }
    );

    expect(publicResult.response.status).toBe(403);
  });

  it("allows public API with required permissions", async () => {
    await seedRecords();
    const filterRecord = await createFilterRecord(users.full.id);

    const tokenResult = await jsonRequest("/admin/api/user/api-token", {
      method: "POST",
      user: "full"
    });
    expect(tokenResult.response.status).toBe(201);
    const token = tokenResult.json?.token as string;

    const publicResult = await jsonRequest(
      `/admin/api/public/json/${filterRecord.id}?token=${token}`,
      { user: "full" }
    );

    expect(publicResult.response.status).toBe(200);
    expect(publicResult.json?.success).toBe(true);
  });

  it("denies public API without export permissions", async () => {
    await seedRecords();
    const filterRecord = await createFilterRecord(users.noexport.id);

    const tokenResult = await jsonRequest("/admin/api/user/api-token", {
      method: "POST",
      user: "noexport"
    });
    expect(tokenResult.response.status).toBe(201);
    const token = tokenResult.json?.token as string;

    const publicResult = await jsonRequest(
      `/admin/api/public/json/${filterRecord.id}?token=${token}`,
      { user: "noexport" }
    );

    expect(publicResult.response.status).toBe(403);
  });
});
