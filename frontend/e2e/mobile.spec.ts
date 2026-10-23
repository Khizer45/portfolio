/**
 * Small-screen navigation. Runs only in the "mobile" project (Pixel 5 viewport).
 */
import { ADMIN_STATE, SIGNED_OUT, expect, test } from "./fixtures";

test.describe("public mobile menu", () => {
  test.use({ storageState: SIGNED_OUT });

  test("opens, closes, and navigates", async ({ page }) => {
    await page.goto("/");
    // The desktop navigation is hidden on small screens.
    await expect(page.getByRole("navigation", { name: "Main", exact: true })).toBeHidden();
    const mobileNav = page.getByRole("navigation", { name: "Main mobile" });
    await expect(mobileNav).toBeHidden();

    await page.getByRole("button", { name: "Open menu" }).click();
    const closeButton = page.getByRole("button", { name: "Close menu" });
    await expect(closeButton).toHaveAttribute("aria-expanded", "true");
    await expect(mobileNav).toBeVisible();
    await expect(mobileNav.getByRole("link")).toHaveCount(8);

    await closeButton.click();
    await expect(mobileNav).toBeHidden();
    await expect(page.getByRole("button", { name: "Open menu" })).toHaveAttribute("aria-expanded", "false");

    // Escape closes it too.
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(mobileNav).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(mobileNav).toBeHidden();

    // Choosing a page navigates and closes the menu.
    await page.getByRole("button", { name: "Open menu" }).click();
    await mobileNav.getByRole("link", { name: "Projects" }).click();
    await expect(page).toHaveURL("/projects");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Things I've built and am building");
    await expect(mobileNav).toBeHidden();
  });
});

test.describe("admin drawer", () => {
  test.use({ storageState: ADMIN_STATE });

  test("opens, closes, and navigates between admin pages", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Welcome back|Dashboard/);

    const drawer = page.getByRole("dialog", { name: "Admin menu" });
    await expect(drawer).toBeHidden();

    await page.getByRole("button", { name: "Open admin menu" }).click();
    await expect(drawer).toBeVisible();
    await drawer.getByRole("button", { name: "Close admin menu" }).click();
    await expect(drawer).toBeHidden();

    await page.getByRole("button", { name: "Open admin menu" }).click();
    await expect(drawer.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
    await drawer.getByRole("link", { name: "Projects" }).click();
    await expect(page).toHaveURL("/admin/projects");
    await expect(drawer).toBeHidden();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Projects");

    await page.getByRole("button", { name: "Open admin menu" }).click();
    await expect(drawer.getByRole("link", { name: "Projects" })).toHaveAttribute("aria-current", "page");
    await drawer.getByRole("link", { name: "Skills", exact: true }).click();
    await expect(page).toHaveURL("/admin/skills");
    await expect(drawer).toBeHidden();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Skills");
  });
});
