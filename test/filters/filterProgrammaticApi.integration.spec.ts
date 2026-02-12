import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import Waterline, { Config } from "waterline";
// @ts-ignore
import sailsDisk from "sails-disk";
import { Adminizer, WaterlineAdapter } from "../../src";
import { FilterProgrammaticApi } from "../../src/lib/filter-builder/FilterProgrammaticApi";
import { FilterBuilder } from "../../src/lib/filter-builder/FilterBuilder";
import { FilterMigration } from "../../src/lib/filter-builder/FilterMigration";
import { FilterPresets } from "../../src/lib/filter-builder/FilterPresets";
import { config as baseConfig } from "../datamocks/adminizerConfig";
import Test from "../datamocks/Test";
import Example from "../datamocks/Example";
import type { UserAP } from "../../src/models/UserAP";
import { buildEntity, resolveModelEntry } from "../../src/lib/filters/utils/modelResolver";
import { DataAccessor } from "../../src/lib/DataAccessor";

process.env.VITEST = "1";

const systemUser: UserAP = {
  id: 0,
  login: "system",
  fullName: "System",
  isAdministrator: true,
  groups: []
};

describe("FilterProgrammaticApi integration", () => {
  let adminizer: Adminizer;
  let orm: Waterline.Waterline;
  let users: { admin: UserAP; alice: UserAP; bob: UserAP };

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
      adapters: { disk: sailsDisk },
      datastores: { default: { adapter: "disk", inMemoryOnly: true as any } }
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

    await adminizer.init({
      ...baseConfig,
      auth: { enable: false },
      history: { enabled: false },
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
      admin: { id: Number(adminRecord.id), login: "admin", fullName: "Admin", isAdministrator: true, groups: [] },
      alice: { id: Number(aliceRecord.id), login: "alice", fullName: "Alice", isAdministrator: false, groups: [] },
      bob: { id: Number(bobRecord.id), login: "bob", fullName: "Bob", isAdministrator: false, groups: [] }
    };
  });

  beforeEach(async () => {
    await clearFilters();
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => orm.teardown(resolve));
  });

  it("creates filter from preset and migrates draft before persistence", async () => {
    const presets = new FilterPresets();
    presets.register(
      "integration-preset",
      () =>
        FilterBuilder.create("Integration Filter", "test")
          .withConditions([
            {
              id: "cond-status",
              field: "title",
              operator: "like",
              value: "demo",
              logic: "AND"
            }
          ])
          .build(),
      { overwrite: true }
    );

    const migration = new FilterMigration();
    migration.register(1, (draft) => ({
      ...draft,
      selectedFields: draft.selectedFields ?? ["id", "title"]
    }));

    const v1Draft = presets.apply("integration-preset");
    const v2Draft = migration.migrate(v1Draft, 1, 2);

    const api = new FilterProgrammaticApi(adminizer.filters.repository, users.alice);
    const created = await api.create(v2Draft);
    const found = await api.findById(String(created.id));

    expect(created.id).toBeTruthy();
    expect(found?.name).toBe("Integration Filter");
    expect(found?.selectedFields).toEqual(["id", "title"]);
  });

  it("executes lifecycle hooks around update and delete on real repository", async () => {
    const api = new FilterProgrammaticApi(adminizer.filters.repository, users.alice);
    const callOrder: string[] = [];

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

    const created = await api.create(FilterBuilder.create("Lifecycle Integration", "test").build());
    const filterId = String(created.id);
    const updated = await api.update(filterId, { name: "Lifecycle Integration Updated" });

    expect(updated?.name).toBe("Lifecycle Integration Updated");
    await api.delete(filterId);

    const missing = await api.findById(filterId);
    expect(missing).toBeNull();
    expect(callOrder).toEqual(["beforeUpdate", "afterUpdate", "beforeDelete", "afterDelete"]);
  });
});
