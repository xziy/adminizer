import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import {
  CriteriaBuilder,
  FilterBuilder,
  FilterMigration,
  FilterPresets,
  FilterRegistry
} from "../../src";

const routePrefix = "/adminizer";
const adminCredentials = {
  login: process.env.E2E_ADMIN_LOGIN ?? "admin",
  password: process.env.E2E_ADMIN_PASS ?? "45345345FF38"
};
const loginPath = `${routePrefix}/model/userap/login`;

// Log in through UI to establish authenticated cookies for API requests.
const loginViaUi = async (page: import("@playwright/test").Page) => {
  await page.goto(loginPath);
  await page.fill("#login", adminCredentials.login);
  await page.fill("#password", adminCredentials.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(
    (url) => url.pathname.startsWith(routePrefix) && url.pathname !== loginPath,
    { timeout: 15_000 }
  );
};

// Creates a filter via API and returns persisted payload for assertions.
const createFilterViaApi = async (
  request: import("@playwright/test").APIRequestContext,
  draft: Record<string, unknown>
) => {
  const response = await request.post(`${routePrefix}/filters`, { data: draft });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok()) {
    throw new Error(`Create filter failed (${response.status()}): ${JSON.stringify(payload)}`);
  }
  expect(payload.success).toBe(true);
  return payload.data as { id: string; name: string; selectedFields?: string[] };
};

test.describe("Programmatic Filters E2E", () => {
  test("creates filter via API from FilterBuilder draft", async ({ page }) => {
    await loginViaUi(page);
    const request = page.context().request;

    const criteria = new CriteriaBuilder()
      .where("title", "Test")
      .whereLike("title", "Te");

    const draft = FilterBuilder.create(
      `E2E Programmatic ${randomUUID().slice(0, 8)}`,
      "test"
    )
      .withCriteria(criteria)
      .withVisibility("private")
      .selectFields(["id", "title"])
      .build();

    const created = await createFilterViaApi(request, draft as unknown as Record<string, unknown>);
    expect(created.id).toBeTruthy();
    expect(created.name).toBe(draft.name);
    expect(created.selectedFields).toEqual(["id", "title"]);
  });

  test("uses FilterRegistry and FilterPresets drafts with API execution", async ({ page }) => {
    await loginViaUi(page);
    const request = page.context().request;

    const registry = new FilterRegistry();
    registry.register("e2e-registry-filter", () =>
      FilterBuilder.create(`E2E Registry ${randomUUID().slice(0, 8)}`, "test")
        .withConditions([
          {
            id: "registry-cond",
            field: "title",
            operator: "like",
            value: "Test",
            logic: "AND"
          }
        ])
        .build()
    );

    const presets = new FilterPresets();
    presets.register(
      "e2e-preset-filter",
      () =>
        FilterBuilder.create(`E2E Preset ${randomUUID().slice(0, 8)}`, "test")
          .withSort("id", "DESC")
          .build(),
      { overwrite: true }
    );

    const registryCreated = await createFilterViaApi(
      request,
      registry.create("e2e-registry-filter") as unknown as Record<string, unknown>
    );
    const presetCreated = await createFilterViaApi(
      request,
      presets.apply("e2e-preset-filter") as unknown as Record<string, unknown>
    );

    expect(registryCreated.id).toBeTruthy();
    expect(presetCreated.id).toBeTruthy();
  });

  test("migrates draft and persists upgraded payload", async ({ page }) => {
    await loginViaUi(page);
    const request = page.context().request;

    const migration = new FilterMigration();
    migration.register(1, (draft) => ({
      ...draft,
      selectedFields: draft.selectedFields ?? ["id", "title"]
    }));

    const v1Draft = FilterBuilder.create(
      `E2E Migration ${randomUUID().slice(0, 8)}`,
      "test"
    )
      .withConditions([
        {
          id: "migration-cond",
          field: "title",
          operator: "like",
          value: "Test",
          logic: "AND"
        }
      ])
      .build();

    const v2Draft = migration.migrate(v1Draft, 1, 2);
    const created = await createFilterViaApi(
      request,
      v2Draft as unknown as Record<string, unknown>
    );

    expect(created.selectedFields).toEqual(["id", "title"]);
  });
});
