import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
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

  it("allows group-scoped filters for users in allowed groups", async () => {
    const created = await jsonRequest("/admin/filters", {
      method: "POST",
      user: "alice",
      body: {
        name: "Alice Group Filter",
        modelName: "test",
        visibility: "groups",
        groupIds: [users.bob.groups?.[0]?.id]
      }
    });
    const filterId = created.json?.data?.id as string;

    const viewAsBob = await jsonRequest(`/admin/filters/${filterId}`, { user: "bob" });
    expect(viewAsBob.response.status).toBe(200);

    const listAsBob = await jsonRequest("/admin/filters?modelName=test", { user: "bob" });
    const bobIds = (listAsBob.json?.data ?? []).map((item: any) => item.id);
    expect(bobIds).toContain(filterId);

    const editAsBob = await jsonRequest(`/admin/filters/${filterId}`, {
      method: "PATCH",
      user: "bob",
      body: { name: "Bob should not edit group filter" }
    });
    expect(editAsBob.response.status).toBe(403);

    const deleteAsBob = await jsonRequest(`/admin/filters/${filterId}`, {
      method: "DELETE",
      user: "bob"
    });
    expect(deleteAsBob.response.status).toBe(403);
  });

  it("allows owner full access to own private filter", async () => {
    const created = await jsonRequest("/admin/filters", {
      method: "POST",
      user: "alice",
      body: { name: "Alice Full Access", modelName: "test", visibility: "private" }
    });
    expect(created.response.status).toBe(201);

    const filterId = created.json?.data?.id as string;
    expect(filterId).toBeTruthy();

    const viewAsOwner = await jsonRequest(`/admin/filters/${filterId}`, { user: "alice" });
    expect(viewAsOwner.response.status).toBe(200);

    const updateAsOwner = await jsonRequest(`/admin/filters/${filterId}`, {
      method: "PATCH",
      user: "alice",
      body: { name: "Alice Full Access Updated" }
    });
    expect(updateAsOwner.response.status).toBe(200);

    const deleteAsOwner = await jsonRequest(`/admin/filters/${filterId}`, {
      method: "DELETE",
      user: "alice"
    });
    expect(deleteAsOwner.response.status).toBe(200);
  });

  it("allows owner to change access visibility and group scope", async () => {
    const created = await jsonRequest("/admin/filters", {
      method: "POST",
      user: "alice",
      body: { name: "Alice Access Settings", modelName: "test", visibility: "private" }
    });
    expect(created.response.status).toBe(201);
    const filterId = created.json?.data?.id as string;

    const updateToGroups = await jsonRequest(`/admin/filters/${filterId}`, {
      method: "PATCH",
      user: "alice",
      body: { visibility: "groups", groupIds: [users.bob.groups?.[0]?.id] }
    });
    expect(updateToGroups.response.status).toBe(200);
    expect(updateToGroups.json?.data?.visibility).toBe("groups");

    const updateToPublic = await jsonRequest(`/admin/filters/${filterId}`, {
      method: "PATCH",
      user: "alice",
      body: { visibility: "public", groupIds: [] }
    });
    expect(updateToPublic.response.status).toBe(200);
    expect(updateToPublic.json?.data?.visibility).toBe("public");
  });

  it("keeps edit rights owner-only even when filter is publicly visible", async () => {
    const created = await jsonRequest("/admin/filters", {
      method: "POST",
      user: "alice",
      body: { name: "Alice Public Editable", modelName: "test", visibility: "public" }
    });
    const filterId = created.json?.data?.id as string;

    const viewAsBob = await jsonRequest(`/admin/filters/${filterId}`, { user: "bob" });
    expect(viewAsBob.response.status).toBe(200);

    const editAsBob = await jsonRequest(`/admin/filters/${filterId}`, {
      method: "PATCH",
      user: "bob",
      body: { name: "Bob should not edit" }
    });
    expect(editAsBob.response.status).toBe(403);

    const deleteAsBob = await jsonRequest(`/admin/filters/${filterId}`, {
      method: "DELETE",
      user: "bob"
    });
    expect(deleteAsBob.response.status).toBe(403);
  });

  it("updates pinned state and filters favorites list", async () => {
    const first = await jsonRequest("/admin/filters", {
      method: "POST",
      body: { name: "Pinned Filter", modelName: "test" }
    });
    const second = await jsonRequest("/admin/filters", {
      method: "POST",
      body: { name: "Regular Filter", modelName: "test" }
    });

    const firstId = first.json?.data?.id as string;
    const secondId = second.json?.data?.id as string;

    const pinResult = await jsonRequest(`/admin/filters/${firstId}`, {
      method: "PATCH",
      body: { isPinned: true }
    });
    expect(pinResult.response.status).toBe(200);
    expect(pinResult.json?.data?.isPinned).toBe(true);

    const pinnedOnly = await jsonRequest("/admin/filters?modelName=test&pinned=true");
    expect(pinnedOnly.response.status).toBe(200);
    const pinnedIds = (pinnedOnly.json?.data ?? []).map((item: any) => item.id);
    expect(pinnedIds).toContain(firstId);
    expect(pinnedIds).not.toContain(secondId);
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

  it("blocks direct-link access to private filters for other users (IDOR)", async () => {
    const created = await jsonRequest("/admin/filters", {
      method: "POST",
      user: "alice",
      body: { name: "Alice Private DirectLink", modelName: "test", visibility: "private" }
    });
    const filterId = created.json?.data?.id as string;

    const forbidden = await jsonRequest(`/admin/filter/${filterId}`, {
      user: "bob",
      redirect: "manual"
    });

    expect(forbidden.response.status).toBe(403);
    expect(forbidden.json?.success).toBe(false);
  });

  it("ignores owner in create payload to prevent mass assignment", async () => {
    const created = await jsonRequest("/admin/filters", {
      method: "POST",
      user: "alice",
      body: {
        name: "Mass Assignment Create",
        modelName: "test",
        owner: users.bob.id
      }
    });

    expect(created.response.status).toBe(201);
    const filterId = created.json?.data?.id as string;

    const asAlice = await jsonRequest(`/admin/filters/${filterId}`, { user: "alice" });
    expect(asAlice.response.status).toBe(200);

    const asBob = await jsonRequest(`/admin/filters/${filterId}`, { user: "bob" });
    expect(asBob.response.status).toBe(403);
  });

  it("ignores owner in update payload to prevent ownership takeover", async () => {
    const created = await jsonRequest("/admin/filters", {
      method: "POST",
      user: "alice",
      body: { name: "Mass Assignment Update", modelName: "test" }
    });
    const filterId = created.json?.data?.id as string;

    const update = await jsonRequest(`/admin/filters/${filterId}`, {
      method: "PATCH",
      user: "alice",
      body: { owner: users.bob.id, name: "Mass Assignment Update Changed" }
    });
    expect(update.response.status).toBe(200);

    const asAlice = await jsonRequest(`/admin/filters/${filterId}`, { user: "alice" });
    expect(asAlice.response.status).toBe(200);

    const asBob = await jsonRequest(`/admin/filters/${filterId}`, { user: "bob" });
    expect(asBob.response.status).toBe(403);
  });

  it("blocks ACL field changes by non-owner users (permission bypass attempt)", async () => {
    const created = await jsonRequest("/admin/filters", {
      method: "POST",
      user: "alice",
      body: { name: "ACL Protected", modelName: "test", visibility: "private" }
    });
    const filterId = created.json?.data?.id as string;

    const bypassAttempt = await jsonRequest(`/admin/filters/${filterId}`, {
      method: "PATCH",
      user: "bob",
      body: {
        visibility: "public",
        groupIds: [users.bob.groups?.[0]?.id],
        apiEnabled: true
      }
    });

    expect(bypassAttempt.response.status).toBe(403);

    const asBobAfterAttempt = await jsonRequest(`/admin/filters/${filterId}`, { user: "bob" });
    expect(asBobAfterAttempt.response.status).toBe(403);
  });

  it("does not leak private filters via list endpoint (ACL bypass)", async () => {
    const privateFilter = await jsonRequest("/admin/filters", {
      method: "POST",
      user: "alice",
      body: { name: "Alice Secret", modelName: "test", visibility: "private" }
    });
    const privateFilterId = privateFilter.json?.data?.id as string;

    const listAsBob = await jsonRequest("/admin/filters?modelName=test&includeSystem=true", {
      user: "bob"
    });
    expect(listAsBob.response.status).toBe(200);

    const listedIds = (listAsBob.json?.data ?? []).map((item: any) => item.id);
    expect(listedIds).not.toContain(privateFilterId);
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

  it("prevents non-admin users from creating system filters (vertical escalation)", async () => {
    const result = await jsonRequest("/admin/filters", {
      method: "POST",
      user: "bob",
      body: {
        name: "Escalation Create System",
        modelName: "test",
        isSystemFilter: true
      }
    });

    expect(result.response.status).toBe(403);
    expect(result.json?.success).toBe(false);
  });

  it("prevents non-admin users from promoting filters to system (vertical escalation)", async () => {
    const filterEntry = resolveModelEntry(adminizer, "FilterAP");
    const accessor = new DataAccessor(
      adminizer,
      users.admin,
      buildEntity(adminizer, filterEntry),
      "add"
    );
    const seeded = await filterEntry.model.create(
      {
        id: randomUUID(),
        name: `Escalation Update System ${randomUUID().slice(0, 8)}`,
        slug: `escalation-update-${randomUUID().slice(0, 8)}`,
        modelName: "test",
        conditions: [],
        visibility: "private",
        owner: users.alice.id,
        version: 1,
        isSystemFilter: false
      } as any,
      accessor
    );
    const filterId = String(seeded.id);

    const update = await jsonRequest(`/admin/filters/${filterId}`, {
      method: "PATCH",
      user: "alice",
      body: { isSystemFilter: true }
    });

    expect(update.response.status).toBe(403);
    expect(update.json?.success).toBe(false);
  });

  it("writes audit trail entries for create, update and delete", async () => {
    const auditSpy = vi.spyOn(adminizer.filters.audit, "record");
    try {
      const created = await jsonRequest("/admin/filters", {
        method: "POST",
        user: "admin",
        body: { name: "Audit Trail Filter", modelName: "test" }
      });
      expect(created.response.status).toBe(201);
      const filterId = created.json?.data?.id as string;

      const updated = await jsonRequest(`/admin/filters/${filterId}`, {
        method: "PATCH",
        user: "admin",
        body: { name: "Audit Trail Filter Updated" }
      });
      expect(updated.response.status).toBe(200);

      const removed = await jsonRequest(`/admin/filters/${filterId}`, {
        method: "DELETE",
        user: "admin"
      });
      expect(removed.response.status).toBe(200);

      const eventNames = auditSpy.mock.calls.map((call) => call[0]);
      expect(eventNames).toContain("created");
      expect(eventNames).toContain("updated");
      expect(eventNames).toContain("deleted");
    } finally {
      auditSpy.mockRestore();
    }
  });
});
