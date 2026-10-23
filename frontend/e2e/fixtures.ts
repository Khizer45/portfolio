/**
 * Shared settings, fixtures, and helpers for the end-to-end suite.
 *
 * Import `test` and `expect` from this file (not from "@playwright/test") so every
 * spec gets the `adminApi` fixture: an authenticated API client used to prepare
 * and clean up test data without clicking through the UI.
 */
import path from "node:path";

import {
  expect,
  test as base,
  type APIRequestContext,
  type APIResponse,
  type Page,
  type PlaywrightWorkerArgs,
} from "@playwright/test";

export { expect };

export const BASE_URL = (process.env.E2E_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
export const ORIGIN = new URL(BASE_URL).origin;
// No defaults: the admin account's credentials always come from the environment.
export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "";
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "";

/** Session saved by auth.setup.ts and reused by the admin tests. */
export const ADMIN_STATE = path.join(__dirname, ".auth", "admin.json");
/** Use with `test.use({ storageState: SIGNED_OUT })` for a visitor with no session. */
export const SIGNED_OUT = { cookies: [], origins: [] };

/**
 * Every record the suite creates has a name starting with this prefix. The cleanup
 * step (cleanup.teardown.ts) deletes anything left over with this prefix, e.g. after
 * an interrupted run. Never give real content a name that starts with it.
 */
export const TEST_PREFIX = "E2E Test";

/** "E2E Test Project 1729500000000-k3x9" */
export function uniqueName(kind: string): string {
  return `${TEST_PREFIX} ${kind} ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/** "E2E Test Project 17..." → "e2e-test-project-17..." (matches the backend's slugify). */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function ensureOk(response: APIResponse, what: string): Promise<APIResponse> {
  if (!response.ok()) {
    throw new Error(`${what} failed: HTTP ${response.status()} ${await response.text()}`);
  }
  return response;
}

type Item = Record<string, unknown> & { id: string };

/** Admin API client with the saved session cookie and the matching CSRF token. */
export class AdminApi {
  private constructor(
    readonly request: APIRequestContext,
    private readonly csrfToken: string,
  ) {}

  static async connect(playwright: PlaywrightWorkerArgs["playwright"], storageState: string = ADMIN_STATE) {
    const request = await playwright.request.newContext({ baseURL: BASE_URL, storageState });
    const me = await ensureOk(await request.get("/api/v1/auth/me"), "GET /auth/me (is the saved session still valid?)");
    const { csrf_token } = (await me.json()) as { csrf_token: string };
    return new AdminApi(request, csrf_token);
  }

  /** Headers every state-changing request needs: CSRF token and an allowed Origin. */
  get writeHeaders() {
    return { "X-CSRF-Token": this.csrfToken, Origin: ORIGIN };
  }

  async get<T>(apiPath: string): Promise<T> {
    const response = await ensureOk(await this.request.get(`/api/v1${apiPath}`), `GET ${apiPath}`);
    return (await response.json()) as T;
  }

  async post<T>(apiPath: string, data: unknown): Promise<T> {
    const response = await ensureOk(
      await this.request.post(`/api/v1${apiPath}`, { data, headers: this.writeHeaders }),
      `POST ${apiPath}`,
    );
    return (await response.json()) as T;
  }

  async put<T>(apiPath: string, data: unknown): Promise<T> {
    const response = await ensureOk(
      await this.request.put(`/api/v1${apiPath}`, { data, headers: this.writeHeaders }),
      `PUT ${apiPath}`,
    );
    return (await response.json()) as T;
  }

  async delete(apiPath: string): Promise<void> {
    const response = await this.request.delete(`/api/v1${apiPath}`, { headers: this.writeHeaders });
    // Already gone is fine for cleanup.
    if (response.status() !== 404) await ensureOk(response, `DELETE ${apiPath}`);
  }

  /** All items of an admin list endpoint (e.g. "/admin/projects"). */
  async list(endpoint: string): Promise<Item[]> {
    const items: Item[] = [];
    for (let page = 1; ; page++) {
      const data = await this.get<{ items: Item[]; pages: number }>(`${endpoint}?page=${page}&page_size=100`);
      items.push(...data.items);
      if (page >= data.pages) return items;
    }
  }

  /** Delete every item whose `field` starts with the test prefix. Returns how many. */
  async deleteTestRecords(endpoint: string, field: string): Promise<number> {
    const leftovers = (await this.list(endpoint)).filter((item) => String(item[field] ?? "").startsWith(TEST_PREFIX));
    for (const item of leftovers) await this.delete(`${endpoint}/${item.id}`);
    return leftovers.length;
  }

  /** Technologies are created on the fly by project forms and survive project deletion. */
  async deleteTestTechnologies(): Promise<number> {
    const all = await this.get<Array<{ id: string; name: string; project_count: number }>>("/admin/technologies");
    const leftovers = all.filter((t) => t.name.startsWith(TEST_PREFIX) && t.project_count === 0);
    for (const tech of leftovers) await this.delete(`/admin/technologies/${tech.id}`);
    return leftovers.length;
  }

  /** Ask Next.js to rebuild the cached public pages (what the admin UI does after a save). */
  async revalidatePublicSite(): Promise<void> {
    await ensureOk(
      await this.request.post("/api/revalidate", { headers: { Origin: ORIGIN } }),
      "POST /api/revalidate",
    );
  }

  async signOut(): Promise<void> {
    await this.request.post("/api/v1/auth/logout", { headers: this.writeHeaders });
  }

  async dispose() {
    await this.request.dispose();
  }
}

export const test = base.extend<object, { adminApi: AdminApi }>({
  adminApi: [
    async ({ playwright }, use) => {
      const api = await AdminApi.connect(playwright);
      await use(api);
      await api.dispose();
    },
    { scope: "worker" },
  ],
});

/**
 * Retry `check` until it passes. Public pages are cached (ISR) and rebuilt after the
 * admin asks for revalidation, so a change can take a moment to show up.
 */
export async function eventually(check: () => Promise<void>, timeout = 20_000): Promise<void> {
  await expect(check).toPass({ timeout, intervals: [500, 1_000, 2_000] });
}

/** Resolves with the admin UI's on-demand revalidation call after a save. */
export function waitForRevalidation(page: Page) {
  return page.waitForResponse(
    (response) => new URL(response.url()).pathname === "/api/revalidate" && response.request().method() === "POST",
  );
}

/** Fill and submit the admin sign-in form. */
export async function submitLogin(page: Page, email = ADMIN_EMAIL, password = ADMIN_PASSWORD) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

/**
 * End the browser context's own session on the server (for tests that sign in
 * through the UI), so no stray sessions are left behind. Best effort.
 */
export async function signOutContext(request: APIRequestContext): Promise<void> {
  const me = await request.get("/api/v1/auth/me");
  if (!me.ok()) return;
  const { csrf_token } = (await me.json()) as { csrf_token: string };
  await request.post("/api/v1/auth/logout", { headers: { "X-CSRF-Token": csrf_token, Origin: ORIGIN } });
}
