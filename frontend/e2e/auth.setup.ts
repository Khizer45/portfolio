/**
 * Signs in once through the API and saves the session cookie to e2e/.auth/admin.json.
 * Admin specs reuse it with `test.use({ storageState: ADMIN_STATE })`.
 *
 * This is a successful login, so it never counts towards the login rate limit.
 */
import fs from "node:fs";
import path from "node:path";

import { test as setup, expect } from "@playwright/test";

import { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_STATE, ORIGIN } from "./fixtures";

setup("sign in as the admin and save the session", async ({ request }) => {
  expect(
    ADMIN_EMAIL && ADMIN_PASSWORD,
    "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to a local (non-production) admin account.",
  ).toBeTruthy();

  const response = await request.post("/api/v1/auth/login", {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    // The backend only accepts logins from allowed origins.
    headers: { Origin: ORIGIN },
  });
  expect(
    response.status(),
    `Sign-in failed (${await response.text()}). Check E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD and that the backend is running.`,
  ).toBe(200);

  const me = await request.get("/api/v1/auth/me");
  expect(me.status(), "The session cookie was not accepted by /auth/me").toBe(200);

  fs.mkdirSync(path.dirname(ADMIN_STATE), { recursive: true });
  await request.storageState({ path: ADMIN_STATE });
});
