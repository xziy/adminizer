import { defineConfig } from "@playwright/test";

// Ensure local webServer checks bypass proxy settings.
process.env.NO_PROXY = "127.0.0.1,localhost";
process.env.HTTP_PROXY = "";
process.env.HTTPS_PROXY = "";

// Keep the base URL configurable for local and CI runs.
const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const serverReadyUrl = new URL("/adminizer/model/userap/login", baseURL).toString();

export default defineConfig({
  testDir: "test/e2e",
  timeout: 120_000,
  expect: {
    timeout: 10_000
  },
  // Run serially to avoid rate-limit collisions and shared server state.
  workers: 1,
  use: {
    baseURL,
    // Prefer a configured browser channel when available; fallback to bundled Chromium.
    channel: process.env.PW_CHANNEL as "chrome" | "msedge" | undefined,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Disable video to avoid ffmpeg downloads in constrained environments.
    video: "off"
  },
  webServer: {
    // Use the TSX-based server to exercise the real runtime.
    command: "npm run start",
    // Wait for a real page (the root path is not defined in the fixture app).
    url: serverReadyUrl,
    // Reuse an existing server when running locally.
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      ADMINIZER_AUTH_CAPTCHA: "false",
      ADMINIZER_CSRF: "false",
      NO_SEED_DATA: "true",
      CLEAN_TMP: "true",
      ADMINPANEL_LAZY_GEN_ADMIN_ENABLE: "1",
      ADMIN_LOGIN: process.env.E2E_ADMIN_LOGIN ?? "admin",
      ADMIN_PASS: process.env.E2E_ADMIN_PASS ?? "45345345FF38"
    }
  }
});
