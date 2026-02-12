import { describe, expect, it, vi } from "vitest";
import { FilterBuilder } from "../src/lib/filter-builder/FilterBuilder";
import { FilterProgrammaticApi } from "../src/lib/filter-builder/FilterProgrammaticApi";
import type { ProgrammaticFilterRepository } from "../src/lib/filter-builder/FilterProgrammaticApi";
import type { UserAP } from "../src/models/UserAP";

const user: UserAP = {
  id: 7,
  login: "script-user",
  fullName: "Script User",
  isAdministrator: false,
  groups: []
};

// Creates a repository mock with stable async return values for CRUD checks.
const buildRepository = (): ProgrammaticFilterRepository => ({
  create: vi.fn(async (data) => ({ id: "f-1", ...data })),
  update: vi.fn(async (filterId, data) => ({ id: filterId, ...data })),
  delete: vi.fn(async () => {}),
  findById: vi.fn(async (filterId) => ({ id: filterId, name: "ById", modelName: "test" })),
  findBySlug: vi.fn(async (slug) => ({ id: "slug-id", slug, name: "BySlug", modelName: "test" })),
  findMany: vi.fn(async () => ({
    data: [{ id: "f-1", name: "List", modelName: "test" }],
    total: 1,
    page: 1,
    limit: 50,
    pages: 1
  }))
});

describe("FilterProgrammaticApi", () => {
  it("executes create/update/delete/find through repository", async () => {
    const repository = buildRepository();
    const api = new FilterProgrammaticApi(repository, user);
    const draft = FilterBuilder.create("Scripted", "test").build();

    const created = await api.create(draft);
    const updated = await api.update("f-1", { name: "Scripted 2" });
    await api.delete("f-1");
    const byId = await api.findById("f-1");
    const bySlug = await api.findBySlug("scripted");
    const listed = await api.findMany({ modelName: "test" });

    expect((repository.create as any).mock.calls).toHaveLength(1);
    expect((repository.update as any).mock.calls).toHaveLength(1);
    expect((repository.delete as any).mock.calls).toHaveLength(1);
    expect((repository.findById as any).mock.calls).toHaveLength(1);
    expect((repository.findBySlug as any).mock.calls).toHaveLength(1);
    expect((repository.findMany as any).mock.calls).toHaveLength(1);

    expect(created.id).toBe("f-1");
    expect(updated?.id).toBe("f-1");
    expect(byId?.id).toBe("f-1");
    expect(bySlug?.slug).toBe("scripted");
    expect(listed.total).toBe(1);
  });

  it("runs lifecycle hooks in order around create/update/delete", async () => {
    const repository = buildRepository();
    const api = new FilterProgrammaticApi(repository, user);
    const callOrder: string[] = [];

    api.on("beforeCreate", async () => {
      callOrder.push("beforeCreate");
    });
    api.on("afterCreate", async () => {
      callOrder.push("afterCreate");
    });
    api.on("beforeUpdate", async () => {
      callOrder.push("beforeUpdate");
    });
    api.on("afterUpdate", async () => {
      callOrder.push("afterUpdate");
    });
    api.on("beforeDelete", async () => {
      callOrder.push("beforeDelete");
    });
    api.on("afterDelete", async () => {
      callOrder.push("afterDelete");
    });

    const draft = FilterBuilder.create("Lifecycle", "test").build();
    await api.create(draft);
    await api.update("f-1", { name: "Lifecycle Updated" });
    await api.delete("f-1");

    expect(callOrder).toEqual([
      "beforeCreate",
      "afterCreate",
      "beforeUpdate",
      "afterUpdate",
      "beforeDelete",
      "afterDelete"
    ]);
  });
});
