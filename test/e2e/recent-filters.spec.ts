import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

const routePrefix = "/adminizer";
const adminCredentials = {
  login: process.env.E2E_ADMIN_LOGIN ?? "admin",
  password: process.env.E2E_ADMIN_PASS ?? "45345345FF38"
};
const loginPath = `${routePrefix}/model/userap/login`;

// Log in through UI to establish an authenticated browser session.
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

// Create a private filter via API to drive list navigation scenarios.
const createFilter = async (
  request: import("@playwright/test").APIRequestContext,
  suffix: string
) => {
  const name = `E2E Recent ${suffix}-${randomUUID().slice(0, 8)}`;
  const response = await request.post(`${routePrefix}/filters`, {
    data: {
      name,
      modelName: "test",
      visibility: "private",
      conditions: [
        { id: "1", field: "title", operator: "like", value: "Test" }
      ]
    }
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok()) {
    throw new Error(`Create filter failed (${response.status()}): ${JSON.stringify(payload)}`);
  }

  return {
    id: String(payload.data.id),
    name
  };
};

const readRecentFilters = async (page: import("@playwright/test").Page) => {
  return page.evaluate(() => {
    const raw = window.localStorage.getItem("adminizer:recent-filters");
    return raw ? JSON.parse(raw) : [];
  });
};

const openListWithFilter = async (
  page: import("@playwright/test").Page,
  filterId: string,
  expectedTopFilterId?: string
) => {
  await page.goto(`${routePrefix}/model/test?filterId=${encodeURIComponent(filterId)}`);
  await expect(page).toHaveURL(new RegExp(`/adminizer/model/test\\?filterId=${filterId}`));
  if (!expectedTopFilterId) {
    return;
  }

  await expect.poll(
    async () => {
      const recent = await readRecentFilters(page);
      return recent[0]?.id;
    },
    { timeout: 10_000 }
  ).toBe(expectedTopFilterId);
};

test.describe("Recent filters sidebar", () => {
  test("stores applied filter in local history", async ({ page }) => {
    await loginViaUi(page);
    const request = page.context().request;
    const filter = await createFilter(request, "single");

    await openListWithFilter(page, filter.id, filter.id);

    await expect(page.getByText("Recent Filters")).toBeVisible();
    await expect(page.getByText(filter.name)).toBeVisible();

    const recent = await readRecentFilters(page);

    expect(Array.isArray(recent)).toBe(true);
    expect(recent[0]?.id).toBe(filter.id);
  });

  test("keeps latest filter first and avoids duplicates", async ({ page }) => {
    await loginViaUi(page);
    const request = page.context().request;
    const first = await createFilter(request, "first");
    const second = await createFilter(request, "second");

    await openListWithFilter(page, first.id, first.id);
    await openListWithFilter(page, second.id, second.id);
    await openListWithFilter(page, first.id, first.id);

    const recent = await readRecentFilters(page);

    expect(recent[0]?.id).toBe(first.id);
    expect(recent.filter((item: { id: string }) => item.id === first.id)).toHaveLength(1);
    expect(recent.some((item: { id: string }) => item.id === second.id)).toBe(true);
  });
});
