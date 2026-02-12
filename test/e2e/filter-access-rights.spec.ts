import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

const routePrefix = "/adminizer";
const adminCredentials = {
  login: process.env.E2E_ADMIN_LOGIN ?? "admin",
  password: process.env.E2E_ADMIN_PASS ?? "45345345FF38"
};
const loginPath = `${routePrefix}/model/userap/login`;

const loginViaUi = async (page: import("@playwright/test").Page) => {
  await page.goto(loginPath);
  await page.fill("#login", adminCredentials.login);
  await page.fill("#password", adminCredentials.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(
    (url) => url.pathname.startsWith(routePrefix) && url.pathname !== loginPath,
    { timeout: 15_000 }
  );
  await expect.poll(
    async () => {
      const cookies = await page.context().cookies();
      return cookies.some((cookie) => cookie.name === "adminizer_jwt");
    },
    { timeout: 15_000 }
  ).toBe(true);
};

const createFilter = async (request: import("@playwright/test").APIRequestContext) => {
  const response = await request.post(`${routePrefix}/filters`, {
    data: {
      name: `E2E Access ${randomUUID().slice(0, 8)}`,
      modelName: "test",
      visibility: "private",
      conditions: [{ id: "1", field: "title", operator: "like", value: "Test" }]
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok()) {
    throw new Error(`Create filter failed (${response.status()}): ${JSON.stringify(payload)}`);
  }
  expect(payload.success).toBe(true);
  return payload.data as { id: string; visibility: string; groupIds?: number[] };
};

test.describe("Filter access rights E2E", () => {
  test("shares filter via group visibility and persists group ids", async ({ page }) => {
    await loginViaUi(page);
    const request = page.context().request;
    const filter = await createFilter(request);

    const updateResponse = await request.patch(`${routePrefix}/filters/${filter.id}`, {
      data: {
        visibility: "groups",
        groupIds: [1]
      }
    });
    expect(updateResponse.ok()).toBe(true);
    const updatePayload = await updateResponse.json();
    expect(updatePayload.data.visibility).toBe("groups");
    expect(Array.isArray(updatePayload.data.groupIds)).toBe(true);
    expect(updatePayload.data.groupIds).toContain(1);
  });

  test("changes filter permissions from groups to public", async ({ page }) => {
    await loginViaUi(page);
    const request = page.context().request;
    const filter = await createFilter(request);

    const toGroups = await request.patch(`${routePrefix}/filters/${filter.id}`, {
      data: { visibility: "groups", groupIds: [1] }
    });
    expect(toGroups.ok()).toBe(true);

    const toPublic = await request.patch(`${routePrefix}/filters/${filter.id}`, {
      data: { visibility: "public", groupIds: [] }
    });
    expect(toPublic.ok()).toBe(true);
    const payload = await toPublic.json();
    expect(payload.data.visibility).toBe("public");
  });

  test("shows filter entries in history audit trail", async ({ page }) => {
    await loginViaUi(page);
    const request = page.context().request;
    const filter = await createFilter(request);

    const updateResponse = await request.patch(`${routePrefix}/filters/${filter.id}`, {
      data: { name: `E2E Access Updated ${randomUUID().slice(0, 6)}` }
    });
    expect(updateResponse.ok()).toBe(true);

    const historyResponse = await request.post(`${routePrefix}/history/get-model-history`, {
      data: {
        modelId: filter.id,
        modelName: "filterap"
      }
    });
    expect(historyResponse.ok()).toBe(true);
    const historyPayload = await historyResponse.json();
    expect(Array.isArray(historyPayload.data)).toBe(true);
    expect(historyPayload.data.length).toBeGreaterThan(0);
  });
});
