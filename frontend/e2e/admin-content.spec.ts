/**
 * Admin CRUD for skills, experience, certifications, and the profile, each checked on
 * the public site. Every test removes what it creates (and restores the profile).
 */
import type { Page } from "@playwright/test";

import {
  ADMIN_STATE,
  TEST_PREFIX,
  eventually,
  expect,
  test,
  uniqueName,
  waitForRevalidation,
  type AdminApi,
} from "./fixtures";

test.use({ storageState: ADMIN_STATE });

function listRow(page: Page, title: string) {
  return page
    .getByRole("main")
    .getByRole("listitem")
    .filter({ has: page.getByRole("link", { name: title, exact: true }) });
}

function toast(page: Page, text: string) {
  return page.getByRole("status").filter({ hasText: text });
}

/** Delete an item from an admin list page through the confirmation dialog. */
async function deleteFromList(page: Page, listPath: string, searchLabel: string, title: string, singular: string) {
  await page.goto(listPath);
  await page.getByRole("searchbox", { name: searchLabel }).fill(title);
  const row = listRow(page, title);
  await expect(row).toHaveCount(1);
  await row.getByRole("button", { name: `Delete ${title}` }).click();
  const dialog = page.getByRole("dialog", { name: `Delete ${singular}?` });
  await expect(dialog).toBeVisible();
  const revalidation = waitForRevalidation(page);
  await dialog.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(toast(page, `Deleted ${title}.`)).toBeVisible();
  expect((await revalidation).status()).toBe(200);
  await expect(row).toHaveCount(0);
}

/** Safety net: remove test records of one type, even if a test failed half-way. */
async function cleanUp(adminApi: AdminApi, endpoint: string, field: string) {
  if ((await adminApi.deleteTestRecords(endpoint, field)) > 0) await adminApi.revalidatePublicSite();
}

test.describe("skills", () => {
  test.afterEach(async ({ adminApi }) => cleanUp(adminApi, "/admin/skills", "name"));

  test("create a skill in a category, hide it, and delete it", async ({ page, context }) => {
    const name = uniqueName("Skill");
    const category = "Developer Tools";
    const publicPage = await context.newPage();

    await page.goto("/admin/skills/new");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("New skill");
    await page.getByRole("textbox", { name: "Name", exact: true }).fill(name);
    await page.getByRole("combobox", { name: "Category", exact: true }).selectOption({ label: category });
    await page.getByRole("combobox", { name: "Proficiency" }).selectOption({ label: "Intermediate" });
    await expect(page.getByRole("checkbox", { name: "Visible on the public site" })).toBeChecked();

    let revalidation = waitForRevalidation(page);
    await page.getByRole("button", { name: "Create skill" }).click();
    await expect(toast(page, `Created ${name}.`)).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/skills\/[0-9a-f-]{36}$/);
    expect((await revalidation).status()).toBe(200);

    await eventually(async () => {
      await publicPage.goto("/skills");
      const group = publicPage.getByRole("region", { name: category });
      await expect(group.getByText(name, { exact: true })).toBeVisible({ timeout: 1_000 });
    });

    // Hide it with the list toggle.
    await page.goto("/admin/skills");
    await page.getByRole("searchbox", { name: "Search skills" }).fill(name);
    const row = listRow(page, name);
    await expect(row).toHaveCount(1);
    revalidation = waitForRevalidation(page);
    await row.getByRole("button", { name: "Visibility: Visible. Click to change." }).click();
    await expect(toast(page, `${name}: Hidden.`)).toBeVisible();
    expect((await revalidation).status()).toBe(200);
    await expect(row.getByRole("button", { name: "Visibility: Hidden. Click to change." })).toBeVisible();

    await eventually(async () => {
      await publicPage.goto("/skills");
      await expect(publicPage.getByRole("region", { name: category })).toBeVisible({ timeout: 1_000 });
      await expect(publicPage.getByText(name)).toHaveCount(0, { timeout: 1_000 });
    });

    // The "Hidden" filter in the admin still finds it.
    await page.getByRole("combobox", { name: "Visibility" }).selectOption({ label: "Hidden" });
    await expect(row).toHaveCount(1);

    await deleteFromList(page, "/admin/skills", "Search skills", name, "skill");
  });

  test("a duplicate skill name is rejected on the Name field", async ({ page, adminApi }) => {
    const existing = (await adminApi.list("/admin/skills"))[0];
    const total = (await adminApi.list("/admin/skills")).length;

    await page.goto("/admin/skills/new");
    await page.getByRole("textbox", { name: "Name", exact: true }).fill(String(existing.name).toUpperCase());
    await page.getByRole("combobox", { name: "Category", exact: true }).selectOption({ index: 1 });
    await page.getByRole("button", { name: "Create skill" }).click();

    await expect(page.getByRole("main").getByRole("alert")).toContainText("This conflicts with an existing record.");
    const nameField = page.getByRole("textbox", { name: "Name", exact: true });
    await expect(nameField).toHaveAttribute("aria-invalid", "true");
    await expect(nameField).toHaveAccessibleDescription("A skill with this name already exists.");
    await expect(page).toHaveURL("/admin/skills/new");
    expect((await adminApi.list("/admin/skills")).length).toBe(total);
  });
});

test.describe("experience", () => {
  test.afterEach(async ({ adminApi }) => cleanUp(adminApi, "/admin/experiences", "role"));

  async function fillExperience(page: Page, role: string, organization: string) {
    await page.goto("/admin/experience/new");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("New experience entry");
    await page.getByRole("textbox", { name: "Job title", exact: true }).fill(role);
    await page.getByRole("combobox", { name: "Type", exact: true }).selectOption({ label: "Internship" });
    await page.getByRole("textbox", { name: "Organization or client", exact: true }).fill(organization);
    await page.getByRole("textbox", { name: "Start date", exact: true }).fill("2024-01");
    await page.getByRole("textbox", { name: "End date", exact: true }).fill("2024-06");
  }

  test("a current position with an end date shows a validation error", async ({ page, adminApi }) => {
    const role = uniqueName("Experience");
    await fillExperience(page, role, `${TEST_PREFIX} Organization`);
    await page.getByRole("checkbox", { name: "I currently work here" }).check();
    await page.getByRole("button", { name: "Create experience entry" }).click();

    const summary = page.getByRole("main").getByRole("alert");
    await expect(summary).toContainText("A current position cannot have an end date.");
    await expect(page).toHaveURL("/admin/experience/new");
    const saved = (await adminApi.list("/admin/experiences")).filter((e) => e.role === role);
    expect(saved, "nothing may be saved").toHaveLength(0);
  });

  test("the 'current position' error is shown in plain language on a highlighted field", async ({ page }) => {
    await fillExperience(page, uniqueName("Experience"), `${TEST_PREFIX} Organization`);
    await page.getByRole("checkbox", { name: "I currently work here" }).check();
    await page.getByRole("button", { name: "Create experience entry" }).click();

    const summary = page.getByRole("main").getByRole("alert");
    await expect(summary).toContainText("A current position cannot have an end date.");
    await expect(summary).not.toContainText("Value error", { timeout: 2_000 });
    await expect(summary.getByRole("link", { name: "request" })).toHaveCount(0, { timeout: 2_000 });
    const highlighted = page.getByRole("main").locator('[aria-invalid="true"]');
    await expect(highlighted.first()).toBeVisible({ timeout: 2_000 });
  });

  test("create a valid entry, see it on the site, and delete it", async ({ page, context }) => {
    const role = uniqueName("Experience");
    const organization = `${TEST_PREFIX} Organization`;
    const publicPage = await context.newPage();

    await fillExperience(page, role, organization);
    await expect(page.getByRole("checkbox", { name: "I currently work here" })).not.toBeChecked();
    const revalidation = waitForRevalidation(page);
    await page.getByRole("button", { name: "Create experience entry" }).click();
    await expect(toast(page, `Created ${role}.`)).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/experience\/[0-9a-f-]{36}$/);
    expect((await revalidation).status()).toBe(200);

    await eventually(async () => {
      await publicPage.goto("/experience");
      await expect(publicPage.getByRole("heading", { name: role, exact: true })).toBeVisible({ timeout: 1_000 });
    });

    await deleteFromList(page, "/admin/experience", "Search experience", role, "experience entry");
    await eventually(async () => {
      await publicPage.goto("/experience");
      await expect(publicPage.getByRole("heading", { level: 1 })).toHaveText("Experience", { timeout: 1_000 });
      await expect(publicPage.getByText(role)).toHaveCount(0, { timeout: 1_000 });
    });
  });
});

test.describe("certifications", () => {
  test.afterEach(async ({ adminApi }) => cleanUp(adminApi, "/admin/certifications", "name"));

  test("create a certification, see it on /certifications, delete it", async ({ page, context, request }) => {
    const name = uniqueName("Certification");
    const publicPage = await context.newPage();
    const before = (await (await request.get("/api/v1/certifications")).json()) as unknown[];

    await page.goto("/admin/certifications/new");
    await page.getByRole("textbox", { name: "Name", exact: true }).fill(name);
    await page.getByRole("textbox", { name: "Issuing organization", exact: true }).fill(`${TEST_PREFIX} Issuer`);
    await page.getByRole("textbox", { name: "Issue date", exact: true }).fill("2025-03");
    await page.getByRole("textbox", { name: "Verification URL" }).fill("https://example.com/verify/e2e");
    const revalidation = waitForRevalidation(page);
    await page.getByRole("button", { name: "Create certification" }).click();
    await expect(toast(page, `Created ${name}.`)).toBeVisible();
    expect((await revalidation).status()).toBe(200);

    await eventually(async () => {
      await publicPage.goto("/certifications");
      await expect(publicPage.getByRole("heading", { level: 3, name })).toBeVisible({ timeout: 1_000 });
    });
    await expect(publicPage.getByText("Certifications will be added as completed")).toHaveCount(0);
    await expect(publicPage.getByRole("link", { name: /Verify credential/ })).toHaveAttribute(
      "href",
      "https://example.com/verify/e2e",
    );

    await deleteFromList(page, "/admin/certifications", "Search certifications", name, "certification");
    await eventually(async () => {
      await publicPage.goto("/certifications");
      await expect(publicPage.getByRole("heading", { level: 1 })).toHaveText("Certifications", { timeout: 1_000 });
      await expect(publicPage.getByText(name)).toHaveCount(0, { timeout: 1_000 });
    });
    if (before.length === 0) {
      await expect(publicPage.getByText("Certifications will be added as completed")).toBeVisible();
    }
  });
});

test.describe("profile", () => {
  type Profile = Record<string, unknown> & { availability_label: string; availability_open: boolean };
  const withoutTimestamp = (profile: Profile) => {
    const copy: Record<string, unknown> = { ...profile };
    delete copy.updated_at;
    return copy;
  };
  let original: Profile | null = null;

  test.afterEach(async ({ adminApi }) => {
    // Put the original profile back if the test did not finish restoring it.
    if (!original) return;
    const current = await adminApi.get<Profile>("/admin/profile");
    if (JSON.stringify(withoutTimestamp(current)) !== JSON.stringify(withoutTimestamp(original))) {
      await adminApi.put("/admin/profile", withoutTimestamp(original));
      await adminApi.revalidatePublicSite();
    }
    original = null;
  });

  test("change the availability text, see it on /contact, then restore it", async ({ page, context, adminApi }) => {
    original = await adminApi.get<Profile>("/admin/profile");
    const saved = original;
    const label = `${TEST_PREFIX} availability ${Date.now()}`;
    const publicPage = await context.newPage();
    const field = page.getByRole("textbox", { name: "Availability text" });
    const badge = page.getByRole("checkbox", { name: "Show the availability badge" });

    await page.goto("/admin/profile");
    await expect(field).toHaveValue(saved.availability_label);
    await field.fill(label);
    await badge.check(); // the text is only shown while the badge is on
    let revalidation = waitForRevalidation(page);
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(toast(page, "Profile saved.")).toBeVisible();
    expect((await revalidation).status()).toBe(200);

    await eventually(async () => {
      await publicPage.goto("/contact");
      // The page introduction reads "<availability text>. Email is the most reliable…".
      await expect(publicPage.getByRole("main").getByText(`${label}.`)).toBeVisible({ timeout: 1_000 });
    });

    // Restore the original value through the form.
    await expect(field).toHaveValue(label);
    await field.fill(saved.availability_label);
    await badge.setChecked(saved.availability_open);
    revalidation = waitForRevalidation(page);
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(toast(page, "Profile saved.")).toBeVisible();
    expect((await revalidation).status()).toBe(200);

    await eventually(async () => {
      await publicPage.goto("/contact");
      await expect(publicPage.getByText(label)).toHaveCount(0, { timeout: 1_000 });
      if (saved.availability_open && saved.availability_label) {
        await expect(publicPage.getByText(`${saved.availability_label}.`)).toBeVisible({ timeout: 1_000 });
      }
    });

    // Saving through the form must not have changed any other field.
    const after = await adminApi.get<Profile>("/admin/profile");
    expect(withoutTimestamp(after)).toEqual(withoutTimestamp(saved));
  });
});
