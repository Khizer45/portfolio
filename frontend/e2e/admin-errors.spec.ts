/**
 * Error handling in the admin. `page.route` makes one admin API call fail so the
 * error UI can be checked without breaking the real backend.
 */
import { ADMIN_STATE, expect, test } from "./fixtures";

test.use({ storageState: ADMIN_STATE });

test("the dashboard shows the server's error and 'Try again' reloads it", async ({ page }) => {
  let failing = true;
  await page.route(
    (url) => url.pathname === "/api/v1/admin/stats",
    async (route) => {
      if (!failing) return route.fallback();
      // Same body the FastAPI backend sends for an unexpected error.
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Internal server error" }),
      });
    },
  );

  await page.goto("/admin");
  const error = page.getByRole("main").getByRole("alert");
  await expect(error).toContainText("Internal server error");
  const retry = error.getByRole("button", { name: "Try again" });
  await expect(retry).toBeVisible();
  // The rest of the page still works.
  await expect(page.getByRole("link", { name: "New project" })).toBeVisible();

  failing = false;
  await retry.click();
  await expect(error).toBeHidden();
  await expect(
    page.getByRole("region", { name: "Totals" }).getByRole("link", { name: /^Published projects/ }),
  ).toContainText(/\d/);
});

test("a list page shows a generic message for a 500 without details, and recovers", async ({ page }) => {
  let failing = true;
  await page.route(
    (url) => url.pathname === "/api/v1/admin/projects",
    async (route) => {
      if (!failing || route.request().method() !== "GET") return route.fallback();
      // e.g. a proxy error page: not JSON, no "detail".
      await route.fulfill({ status: 500, contentType: "text/html", body: "<html><body>Bad gateway</body></html>" });
    },
  );

  await page.goto("/admin/projects");
  const error = page.getByRole("main").getByRole("alert");
  await expect(error).toContainText("The server had a problem. Please try again.");

  failing = false;
  await error.getByRole("button", { name: "Try again" }).click();
  await expect(error).toBeHidden();
  await expect(page.getByText(/^\d+ (project|projects)$/)).toBeVisible();
  await expect(page.getByRole("main").getByRole("listitem").first()).toBeVisible();
});

test("an unknown record shows a 'not found' message", async ({ page }) => {
  await page.goto("/admin/projects/00000000-0000-0000-0000-000000000000");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Project not found");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("It may have been deleted.");
  await page.getByRole("link", { name: "← Projects" }).click();
  await expect(page).toHaveURL("/admin/projects");
});
