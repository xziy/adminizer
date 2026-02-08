import { describe, it, beforeAll, afterAll, expect } from "vitest";
import Waterline from "waterline";
// @ts-ignore
import sailsDisk from "sails-disk";
import { Sequelize } from "sequelize-typescript";
import { WaterlineAdapter, SequelizeAdapter } from "../src";

async function initWaterline() {
  const orm = new Waterline();
  await WaterlineAdapter.registerSystemModels(orm);
  const config = {
    adapters: { disk: sailsDisk },
    datastores: {
      default: { adapter: "disk", inMemoryOnly: true }
    }
  };
  const ontology = await new Promise<any>((resolve, reject) => {
    orm.initialize(config as any, (err, ontology) => {
      if (err) return reject(err);
      resolve(ontology);
    });
  });
  return { orm, ontology };
}

describe("Filter models", () => {
  describe("Waterline", () => {
    let orm: Waterline.Waterline;
    let ontology: any;

    beforeAll(async () => {
      ({ orm, ontology } = await initWaterline());
    });

    afterAll(async () => {
      await orm.teardown();
    });

    it("creates filter and columns", async () => {
      const user = await ontology.collections.userap.create({
        login: "filter-user",
        fullName: "Filter User"
      }).fetch();

      const filter = await ontology.collections.filterap.create({
        name: "WL Filter",
        modelName: "UserAP",
        slug: "wl-filter",
        owner: user.id
      }).fetch();

      const column = await ontology.collections.filtercolumnap.create({
        filter: filter.id,
        fieldName: "login",
        width: 240
      }).fetch();

      expect(filter.id).toBeDefined();
      expect(column.id).toBeDefined();
      expect(column.width).toBe(240);
    });
  });

  describe("Sequelize", () => {
    let orm: Sequelize;

    beforeAll(async () => {
      orm = new Sequelize("sqlite::memory:", { logging: false });
      await SequelizeAdapter.registerSystemModels(orm);
    });

    afterAll(async () => {
      await orm.close();
    });

    it("applies default values", async () => {
      const { UserAP, FilterAP, FilterColumnAP } = orm.models as any;
      const user = await UserAP.create({ login: "sq-user", fullName: "Sequelize User" });
      const filter = await FilterAP.create({
        name: "SQ Filter",
        modelName: "UserAP",
        slug: "sq-filter",
        ownerId: user.id
      });

      expect(filter.visibility).toBe("private");
      expect(filter.sortDirection).toBe("ASC");
      expect(filter.apiEnabled).toBe(false);
      expect(filter.version).toBe(1);
      expect(filter.conditions).toEqual([]);

      const column = await FilterColumnAP.create({
        filterId: filter.id,
        fieldName: "login",
        width: 180
      });

      expect(column.isVisible).toBe(true);
      expect(column.isEditable).toBe(false);
      expect(column.order).toBe(0);
      expect(column.width).toBe(180);
    });
  });
});
