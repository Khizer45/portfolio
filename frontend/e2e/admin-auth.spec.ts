/**
 * Admin sign-in, sign-out, and session handling.
 *
 * LOGIN RATE LIMITING: the backend blocks an email after 5 failed logins (and an IP
 * after 20) in 15 minutes. This file sends exactly ONE failed login (the test tagged
 * @failed-login). Don't add more, and don't run that test in a loop. To skip it:
 *   npx playwright test --grep-invert @failed-login
 */
import type { Page } from "@playwright/test";

import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_STATE,
  SIGNED_OUT,
  expect,
  signOutContext,
  submitLogin,
  test,
} from "./fixtures";

type Stats = {
  projects_published: number;
  projects_draft: number;
  skills: number;
  experiences: number;
  certifications: number;
  education: number;
  articles_published: number;
  achievements: number;
};

/** The dashboard total card with this label, e.g. "Published projects". */
function statCard(page: Page, label: string) {
  return page.getByRole("region", { name: "Totals" }).getByRole("link", { name: new RegExp(`^${label}\\b`) });
}

test.describe("signed out", () => {
  test.use({ storageState: SIGNED_OUT });

  // Sessions created by signing in through the UI are ended after each test.
  test.afterEach(async ({ page }) => {
    await signOutContext(page.request);
  });

  test("/admin redirects to the login page", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL("/admin/login?next=%2Fadmin");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sign in to the admin");
    await expect(page.getByLabel("Email")).toBeVisible();
  });

  test("the login form validates empty and malformed fields without calling the API", async ({ page }) => {
    const loginCalls: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/v1/auth/login")) loginCalls.push(request.url());
    });
    await page.goto("/admin/login");

    await page.getByRole("button", { name: "Sign in" }).click();
    const email = page.getByLabel("Email");
    const password = page.getByLabel("Password");
    await expect(email).toHaveAttribute("aria-invalid", "true");
    await expect(email).toHaveAccessibleDescription("Enter your email address.");
    await expect(password).toHaveAttribute("aria-invalid", "true");
    await expect(password).toHaveAccessibleDescription("Enter your password.");

    await email.fill("not-an-email");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(email).toHaveAccessibleDescription("Enter a valid email address.");
    await expect(password).toHaveAccessibleDescription("Enter your password.");

    expect(loginCalls, "invalid input must not be sent to the server").toHaveLength(0);
    await expect(page).toHaveURL("/admin/login");
  });

  // The ONLY failed login in the suite (see the note at the top of this file).
  test("a wrong password shows an error @failed-login", async ({ page }) => {
    await page.goto("/admin/login");
    await submitLogin(page, ADMIN_EMAIL, `${ADMIN_PASSWORD}-wrong`);

    // Scoped to <main>: Next.js' route announcer is also role="alert".
    const error = page.getByRole("main").getByRole("alert");
    await expect(error).toHaveText("Invalid email or password.");
    await expect(error).toBeFocused();
    await expect(page.getByLabel("Password")).toHaveValue("");
    await expect(page).toHaveURL("/admin/login");
    expect((await page.request.get("/api/v1/auth/me")).status()).toBe(401);
  });

  test("a successful login lands on the dashboard with the content counts", async ({ page }) => {
    await page.goto("/admin/login");
    await submitLogin(page);

    await expect(page).toHaveURL("/admin");
    const me = await page.request.get("/api/v1/auth/me");
    expect(me.status()).toBe(200);
    const { user } = (await me.json()) as { user: { display_name: string; email: string } };
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Welcome back, ${user.display_name.split(" ")[0]}`);

    const stats = (await (await page.request.get("/api/v1/admin/stats")).json()) as Stats;
    const expected: Array<[string, number]> = [
      ["Published projects", stats.projects_published],
      ["Draft projects", stats.projects_draft],
      ["Skills", stats.skills],
      ["Experience entries", stats.experiences],
      ["Certifications", stats.certifications],
      ["Education entries", stats.education],
      ["Articles", stats.articles_published],
      ["Awards & publications", stats.achievements],
    ];
    for (const [label, value] of expected) {
      await expect(statCard(page, label)).toContainText(`${label}${value}`);
    }
    await expect(page.getByRole("heading", { name: "Recent changes" })).toBeVisible();
    await expect(page.getByRole("complementary").getByText(user.email)).toBeVisible();
  });

  test("after signing in, the visitor returns to the admin page they asked for", async ({ page }) => {
    await page.goto("/admin/projects");
    await expect(page).toHaveURL("/admin/login?next=%2Fadmin%2Fprojects");
    await submitLogin(page);
    await expect(page).toHaveURL("/admin/projects");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Projects");
  });

  test("signing out ends the session and /admin redirects to login again", async ({ page, context }) => {
    await page.goto("/admin/login");
    await submitLogin(page);
    await expect(page).toHaveURL("/admin");
    const sessionCookies = await context.cookies();
    expect(sessionCookies.length).toBeGreaterThan(0);

    await page.getByRole("button", { name: "Sign out" }).click();
    // The login page may remember where the admin was (?next=...).
    await expect(page).toHaveURL(/\/admin\/login(\?|$)/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sign in to the admin");

    await page.goto("/admin");
    await expect(page).toHaveURL("/admin/login?next=%2Fadmin");

    // The old session cookie no longer works, even if a client still has it.
    await context.addCookies(sessionCookies);
    expect((await page.request.get("/api/v1/auth/me")).status()).toBe(401);
  });
});

test.describe("signed in", () => {
  test.use({ storageState: ADMIN_STATE });

  test("the login page sends a signed-in admin to the dashboard", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page).toHaveURL("/admin");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Welcome back");
  });

  test("the ?next= parameter cannot redirect outside the admin", async ({ page }) => {
    for (const next of ["https://example.com/phish", "//example.com/phish", "/admin/login"]) {
      await page.goto(`/admin/login?next=${encodeURIComponent(next)}`);
      await expect(page).toHaveURL("/admin");
    }
    await page.goto(`/admin/login?next=${encodeURIComponent("/admin/skills")}`);
    await expect(page).toHaveURL("/admin/skills");
  });
});

test.describe("expired session", () => {
  test.use({ storageState: ADMIN_STATE });

  test("a request without a valid session redirects to login with a 'session expired' message", async ({
    page,
    context,
  }) => {
    await page.goto("/admin/projects");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Projects");
    await expect(page.getByText(/^\d+ (project|projects)$/)).toBeVisible();

    // Simulate the session ending (cookie expired or removed) while the page is open.
    // Only this browser context loses the cookie; the shared session stays valid.
    await context.clearCookies();
    await page.getByRole("searchbox", { name: "Search projects" }).fill("anything");

    await expect(page).toHaveURL("/admin/login?next=%2Fadmin%2Fprojects&expired=1");
    await expect(page.getByRole("main").getByRole("alert")).toHaveText("Your session expired. Please sign in again.");
  });
});
