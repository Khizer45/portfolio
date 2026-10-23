import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests for the public site and the admin CMS.
 *
 * They run against servers that are ALREADY RUNNING (the Next.js frontend and the
 * FastAPI backend); nothing is started from here. See e2e/README.md.
 *
 *   E2E_BASE_URL        frontend URL (default http://localhost:3000)
 *   E2E_ADMIN_EMAIL     local admin account used by the admin tests (required)
 *   E2E_ADMIN_PASSWORD  its password (required)
 */
const baseURL = (process.env.E2E_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

export default defineConfig({
  testDir: "./e2e",
  // The tests share one database (and one admin account), so they run one at a time.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  forbidOnly: Boolean(process.env.CI),
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    // Signs in once through the API and saves the session for the admin tests.
    { name: "setup", testMatch: /auth\.setup\.ts$/, teardown: "cleanup" },
    // Runs after everything else: removes leftover "E2E Test" records and signs out.
    { name: "cleanup", testMatch: /cleanup\.teardown\.ts$/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
      testIgnore: /mobile/,
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 5"] },
      dependencies: ["setup"],
      testMatch: /mobile.*\.spec\.ts$/,
    },
  ],
});
