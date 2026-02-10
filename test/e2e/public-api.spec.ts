import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";

const routePrefix = "/adminizer";
const adminCredentials = {
  login: process.env.E2E_ADMIN_LOGIN ?? "admin",
  password: process.env.E2E_ADMIN_PASS ?? "45345345FF38"
};
const loginPath = `${routePrefix}/model/userap/login`;

// Log in through the UI to establish an authenticated browser session.
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

// Create a filter via the API to drive public API tests.
const createFilter = async (
  request: import("@playwright/test").APIRequestContext
) => {
  const response = await request.post(`${routePrefix}/filters`, {
    data: {
      name: `E2E Filter ${randomUUID().slice(0, 8)}`,
      modelName: "test",
      apiEnabled: true,
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
  expect(payload.success).toBe(true);
  return payload.data as { id: string };
};

// Request a fresh API token for the current user session.
const createApiToken = async (
  request: import("@playwright/test").APIRequestContext
) => {
  const response = await request.post(`${routePrefix}/api/user/api-token`);
  const payload = await response.json().catch(() => ({}));
  if (response.status() !== 201) {
    throw new Error(`Token create failed (${response.status()}): ${JSON.stringify(payload)}`);
  }
  expect(payload.token).toMatch(/^ap_/);
  return payload.token as string;
};

test.describe("Public API E2E", () => {
  test("generates a token and accesses JSON data", async ({ page }) => {
    // Establish an authenticated session and create a filter.
    await loginViaUi(page);
    const request = page.context().request;
    const filter = await createFilter(request);
    const token = await createApiToken(request);

    // Call the public JSON endpoint with the new token.
    const response = await request.get(
      `${routePrefix}/api/public/json/${filter.id}?token=${token}`
    );

    expect(response.ok()).toBe(true);
    const payload = await response.json();
    expect(payload.success).toBe(true);
  });

  test("serves Atom feeds for public API tokens", async ({ page }) => {
    // Establish an authenticated session and create a filter.
    await loginViaUi(page);
    const request = page.context().request;
    const filter = await createFilter(request);
    const token = await createApiToken(request);

    // Fetch the Atom feed and validate the response.
    const response = await request.get(
      `${routePrefix}/api/public/atom/${filter.id}?token=${token}`
    );
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("application/atom+xml");
    const body = await response.text();
    expect(body).toContain("<feed");
  });

  test("regenerates and revokes API tokens", async ({ page }) => {
    // Establish an authenticated session and create a filter.
    await loginViaUi(page);
    const request = page.context().request;
    const filter = await createFilter(request);

    // Generate an initial token and then regenerate it.
    const originalToken = await createApiToken(request);
    const regenerateResponse = await request.post(
      `${routePrefix}/api/user/api-token/regenerate`
    );
    expect(regenerateResponse.ok()).toBe(true);
    const regeneratePayload = await regenerateResponse.json();
    const newToken = regeneratePayload.token as string;
    expect(newToken).toMatch(/^ap_/);
    expect(newToken).not.toBe(originalToken);

    // Verify the original token is rejected.
    const rejectedResponse = await request.get(
      `${routePrefix}/api/public/json/${filter.id}?token=${originalToken}`
    );
    expect(rejectedResponse.status()).toBe(401);

    // Revoke the new token and confirm access is denied.
    const revokeResponse = await request.delete(
      `${routePrefix}/api/user/api-token`
    );
    expect(revokeResponse.ok()).toBe(true);

    const revokedResult = await request.get(
      `${routePrefix}/api/public/json/${filter.id}?token=${newToken}`
    );
    expect(revokedResult.status()).toBe(401);
  });

  test("exports JSON and Excel formats", async ({ page }) => {
    // Establish an authenticated session before exporting.
    await loginViaUi(page);
    const request = page.context().request;

    const exportJsonResponse = await request.post(`${routePrefix}/export`, {
      data: { format: "json", modelName: "test" }
    });
    expect(exportJsonResponse.ok()).toBe(true);
    const exportJsonPayload = await exportJsonResponse.json();
    const jsonFileName = exportJsonPayload.fileName as string;
    expect(jsonFileName).toMatch(/\.json$/);

    const exportXlsxResponse = await request.post(`${routePrefix}/export`, {
      data: { format: "xlsx", modelName: "test" }
    });
    expect(exportXlsxResponse.ok()).toBe(true);
    const exportXlsxPayload = await exportXlsxResponse.json();
    const xlsxFileName = exportXlsxPayload.fileName as string;
    expect(xlsxFileName).toMatch(/\.xlsx$/);

    // Clean up exported files to keep the workspace tidy.
    const exportDir = path.join(process.cwd(), "exports");
    await Promise.all([
      fs.unlink(path.join(exportDir, jsonFileName)).catch(() => undefined),
      fs.unlink(path.join(exportDir, xlsxFileName)).catch(() => undefined)
    ]);
  });
});
