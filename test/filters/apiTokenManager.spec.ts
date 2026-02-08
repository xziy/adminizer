import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Waterline, { Config } from "waterline";
// @ts-ignore
import sailsDisk from "sails-disk";
import { randomUUID } from "node:crypto";
import { Adminizer, WaterlineAdapter } from "../../src";
import { config as baseConfig } from "../datamocks/adminizerConfig";
import Test from "../datamocks/Test";
import Example from "../datamocks/Example";
import { ApiTokenManager } from "../../src/lib/public-api/ApiTokenManager";
import { resolveModelEntry, buildEntity } from "../../src/lib/filters/utils/modelResolver";
import { DataAccessor } from "../../src/lib/DataAccessor";
import type { UserAP } from "../../src/models/UserAP";

process.env.VITEST = "1";

const systemUser: UserAP = {
  id: 0,
  login: "system",
  fullName: "System",
  isAdministrator: true,
  groups: []
};

describe("ApiTokenManager", () => {
  let adminizer: Adminizer;
  let orm: Waterline.Waterline;
  let userEntry: ReturnType<typeof resolveModelEntry>;

  const createUser = async (overrides: Partial<UserAP> = {}) => {
    const accessor = new DataAccessor(
      adminizer,
      systemUser,
      buildEntity(adminizer, userEntry),
      "add"
    );

    const record = await userEntry.model.create(
      {
        login: `user-${randomUUID().slice(0, 8)}`,
        fullName: "Test User",
        isAdministrator: false,
        isActive: true,
        ...overrides
      } as any,
      accessor
    );

    return record as UserAP;
  };

  const updateUser = async (id: number | string, changes: Partial<UserAP>) => {
    const accessor = new DataAccessor(
      adminizer,
      systemUser,
      buildEntity(adminizer, userEntry),
      "edit"
    );
    await userEntry.model.updateOne({ id }, changes as any, accessor);
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

    userEntry = resolveModelEntry(adminizer, "UserAP");
  });

  afterAll(async () => {
    await orm.teardown();
  });

  it("creates and reuses tokens", async () => {
    const manager = new ApiTokenManager(adminizer);
    const user = await createUser();

    const first = await manager.getOrCreateToken(user);
    const second = await manager.getOrCreateToken(user);

    expect(first.token).toMatch(/^ap_/);
    expect(second.token).toBe(first.token);
    expect(second.createdAt).toBeTruthy();
  });

  it("regenerates tokens", async () => {
    const manager = new ApiTokenManager(adminizer);
    const user = await createUser();

    const first = await manager.getOrCreateToken(user);
    const regenerated = await manager.regenerateToken(user);

    expect(regenerated.token).toMatch(/^ap_/);
    expect(regenerated.token).not.toBe(first.token);
  });

  it("revokes tokens", async () => {
    const manager = new ApiTokenManager(adminizer);
    const user = await createUser();

    await manager.getOrCreateToken(user);
    await manager.revokeToken(user);

    const info = await manager.getTokenInfo(user);
    expect(info).toBeNull();
  });

  it("validates tokens and rejects inactive users", async () => {
    const manager = new ApiTokenManager(adminizer);
    const user = await createUser();

    const tokenInfo = await manager.getOrCreateToken(user);
    const validated = await manager.validateToken(tokenInfo.token);
    expect(validated?.id).toBe(user.id);

    await updateUser(user.id, { isActive: false });

    const rejected = await manager.validateToken(tokenInfo.token);
    expect(rejected).toBeNull();
  });
});
