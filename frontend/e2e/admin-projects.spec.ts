/**
 * Full project lifecycle in the admin, checked against the public site:
 * validate → create draft → (not public) → publish → (public) → edit → delete → (gone).
 */
import type { Page } from "@playwright/test";

import {
  ADMIN_STATE,
  TEST_PREFIX,
  eventually,
  expect,
  slugify,
  test,
  uniqueName,
  waitForRevalidation,
} from "./fixtures";

test.use({ storageState: ADMIN_STATE });

/** The row for one item in an admin list. */
function listRow(page: Page, title: string) {
  return page
    .getByRole("main")
    .getByRole("listitem")
    .filter({ has: page.getByRole("link", { name: title, exact: true }) });
}

/** Success toasts use role="status". */
function toast(page: Page, text: string) {
  return page.getByRole("status").filter({ hasText: text });
}

let createdTitle: string | null = null;

test.afterEach(async ({ adminApi }) => {
  // Remove the project even if the test failed half-way, plus the technology it created.
  if (createdTitle) {
    const prefix = createdTitle;
    const leftovers = (await adminApi.list("/admin/projects")).filter((p) => String(p.title).startsWith(prefix));
    for (const project of leftovers) await adminApi.delete(`/admin/projects/${project.id}`);
    if (leftovers.length) await adminApi.revalidatePublicSite();
  }
  await adminApi.deleteTestTechnologies();
  createdTitle = null;
});

test("create a project, publish it, edit it, and delete it", async ({ page, context }) => {
  const title = uniqueName("Project");
  const editedTitle = `${title} (edited)`;
  const newTechnology = `${TEST_PREFIX} Tech ${Date.now()}`;
  const featureName = "E2E feature: image upload";
  createdTitle = title;
  const publicPage = await context.newPage();
  let slug = "";

  await test.step("submitting the empty form shows required-field errors", async () => {
    const writes: string[] = [];
    page.on("request", (r) => r.method() === "POST" && r.url().includes("/api/v1/admin/projects") && writes.push(r.url()));

    await page.goto("/admin/projects/new");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("New project");
    await page.getByRole("button", { name: "Create project" }).click();

    const summary = page.getByRole("main").getByRole("alert");
    await expect(summary).toContainText("Please fix the highlighted fields.");
    await expect(summary.getByRole("listitem")).toHaveText([
      "Title: Title is required.",
      "Short description: Short description is required.",
      "Primary category: Primary category is required.",
    ]);
    const titleField = page.getByRole("textbox", { name: "Title", exact: true });
    await expect(titleField).toHaveAttribute("aria-invalid", "true");
    await expect(titleField).toHaveAccessibleDescription("Title is required.");
    const summaryField = page.getByRole("textbox", { name: "Short description", exact: true });
    await expect(summaryField).toHaveAttribute("aria-invalid", "true");
    await expect(summaryField).toHaveAccessibleDescription(/Short description is required\./);
    await expect(page.getByRole("combobox", { name: "Primary category" })).toHaveAttribute("aria-invalid", "true");
    expect(writes, "an invalid form must not be sent").toHaveLength(0);
  });

  await test.step("fill the required fields, technologies and a feature, and save as a draft", async () => {
    const titleField = page.getByRole("textbox", { name: "Title", exact: true });
    await titleField.fill(title);
    // Fixing a field clears its error.
    await expect(titleField).not.toHaveAttribute("aria-invalid", "true");
    await page
      .getByRole("textbox", { name: "Short description", exact: true })
      .fill("Created by the end-to-end tests to check the project lifecycle.");
    await page.getByRole("combobox", { name: "Primary category" }).selectOption({ label: "Computer Vision & OpenCV" });
    await page
      .getByRole("region", { name: "Classification" })
      .getByRole("combobox", { name: "Status", exact: true })
      .selectOption({ label: "In Progress" });

    // Tags input: Enter or comma adds a tag.
    const technologies = page.getByRole("textbox", { name: "Technologies", exact: true });
    await technologies.fill("Python");
    await technologies.press("Enter");
    await technologies.pressSequentially(`${newTechnology},`);
    await technologies.fill("python"); // duplicates (any case) are ignored
    await technologies.press("Enter");
    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(2);
    await expect(page.getByRole("button", { name: "Remove Python" })).toBeVisible();
    await expect(page.getByRole("button", { name: `Remove ${newTechnology}` })).toBeVisible();

    // Repeater: add one feature.
    const features = page.getByRole("group", { name: "Features" });
    await features.getByRole("button", { name: "Add feature" }).click();
    await features.getByRole("textbox", { name: "Feature", exact: true }).fill(featureName);
    await features.getByRole("combobox", { name: "Status" }).selectOption({ label: "Implemented" });
    await features.getByRole("textbox", { name: "Description" }).fill("Upload an image and get a result.");
    await expect(features.getByText(`Feature 1 · ${featureName}`)).toBeVisible();

    await expect(page.getByRole("checkbox", { name: /^Published/ })).not.toBeChecked();

    const revalidation = waitForRevalidation(page);
    await page.getByRole("button", { name: "Create project" }).click();
    await expect(toast(page, `Created ${title}.`)).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/projects\/[0-9a-f-]{36}$/);
    expect((await revalidation).status(), "on-demand revalidation should succeed").toBe(200);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    slug = await page.getByRole("textbox", { name: "Slug" }).inputValue();
    expect(slug).toBe(slugify(title));
  });

  await test.step("the draft is not public", async () => {
    const response = await publicPage.goto(`/projects/${slug}`);
    expect(response?.status()).toBe(404);
  });

  await test.step("publish it with the list toggle", async () => {
    await page.goto("/admin/projects");
    await page.getByRole("searchbox", { name: "Search projects" }).fill(title);
    const row = listRow(page, title);
    await expect(row).toHaveCount(1);

    const revalidation = waitForRevalidation(page);
    await row.getByRole("button", { name: "Publishing: Draft. Click to change." }).click();
    await expect(toast(page, `${title}: Published.`)).toBeVisible();
    expect((await revalidation).status()).toBe(200);
    await expect(row.getByRole("button", { name: "Publishing: Published. Click to change." })).toBeVisible();
    await expect(row.getByRole("link", { name: `View ${title} on the site (opens in a new tab)` })).toHaveAttribute(
      "href",
      `/projects/${slug}`,
    );
  });

  await test.step("the public page shows the project", async () => {
    await eventually(async () => {
      const response = await publicPage.goto(`/projects/${slug}`);
      expect(response?.status()).toBe(200);
      await expect(publicPage.getByRole("heading", { level: 1 })).toHaveText(title, { timeout: 1_000 });
    });
    const featuresSection = publicPage.getByRole("region", { name: "Features" });
    await expect(featuresSection.getByText(featureName, { exact: true })).toBeVisible();
    await expect(featuresSection.getByText("Implemented", { exact: true })).toBeVisible();
    const details = publicPage.getByRole("complementary", { name: "Project details" });
    await expect(details.getByRole("link", { name: "Python", exact: true })).toBeVisible();
    await expect(details.getByRole("link", { name: newTechnology, exact: true })).toBeVisible();

    await publicPage.goto("/projects");
    await expect(publicPage.getByRole("main").getByRole("heading", { name: title, exact: true })).toBeVisible();
  });

  await test.step("feature it on the home page with the list toggle", async () => {
    const row = listRow(page, title);
    const revalidation = waitForRevalidation(page);
    await row.getByRole("button", { name: "Featured: Not featured. Click to change." }).click();
    await expect(toast(page, `${title}: Featured.`)).toBeVisible();
    expect((await revalidation).status()).toBe(200);

    await eventually(async () => {
      await publicPage.goto("/");
      const selected = publicPage.getByRole("region", { name: "Selected projects" });
      await expect(selected.getByRole("heading", { name: title, exact: true })).toBeVisible({ timeout: 1_000 });
    });
  });

  await test.step("edit the title", async () => {
    await listRow(page, title).getByRole("link", { name: `Edit ${title}` }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await page.getByRole("textbox", { name: "Title", exact: true }).fill(editedTitle);
    await expect(page.getByText("Unsaved changes")).toBeVisible();

    const revalidation = waitForRevalidation(page);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(toast(page, `Saved ${editedTitle}.`)).toBeVisible();
    expect((await revalidation).status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(editedTitle);
    await expect(page.getByText("All changes saved")).toBeVisible();
    // The slug (and so the URL) is kept.
    await expect(page.getByRole("textbox", { name: "Slug" })).toHaveValue(slug);

    await eventually(async () => {
      await publicPage.goto(`/projects/${slug}`);
      await expect(publicPage.getByRole("heading", { level: 1 })).toHaveText(editedTitle, { timeout: 1_000 });
    });
  });

  await test.step("delete it through the confirmation dialog", async () => {
    await page.goto("/admin/projects");
    await page.getByRole("searchbox", { name: "Search projects" }).fill(editedTitle);
    const row = listRow(page, editedTitle);
    await expect(row).toHaveCount(1);

    // Cancelling keeps it.
    await row.getByRole("button", { name: `Delete ${editedTitle}` }).click();
    const dialog = page.getByRole("dialog", { name: "Delete project?" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(`${editedTitle} will be permanently deleted. This cannot be undone.`);
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
    await expect(row).toHaveCount(1);

    await row.getByRole("button", { name: `Delete ${editedTitle}` }).click();
    const revalidation = waitForRevalidation(page);
    await dialog.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(toast(page, `Deleted ${editedTitle}.`)).toBeVisible();
    expect((await revalidation).status()).toBe(200);
    await expect(row).toHaveCount(0);
    await expect(page.getByText("No projects match your search")).toBeVisible();
  });

  await test.step("the public page is gone", async () => {
    await eventually(async () => {
      const response = await publicPage.goto(`/projects/${slug}`);
      expect(response?.status()).toBe(404);
    });
    await publicPage.goto("/projects");
    await expect(publicPage.getByText(editedTitle)).toHaveCount(0);
  });
});

test("unpublishing a project removes it from the public site", async ({ page, context, adminApi }) => {
  const title = uniqueName("Project");
  createdTitle = title;
  const categories = await adminApi.list("/admin/project-categories");
  const category = categories.find((c) => c.slug === "backend") ?? categories[0];
  const project = await adminApi.post<{ id: string; slug: string }>("/admin/projects", {
    title,
    summary: "Published by the end-to-end tests, then unpublished.",
    category_id: category.id,
    status: "prototype",
    is_published: true,
  });
  await adminApi.revalidatePublicSite();

  const publicPage = await context.newPage();
  await eventually(async () => {
    const response = await publicPage.goto(`/projects/${project.slug}`);
    expect(response?.status()).toBe(200);
  });

  await page.goto("/admin/projects");
  await page.getByRole("searchbox", { name: "Search projects" }).fill(title);
  const row = listRow(page, title);
  const revalidation = waitForRevalidation(page);
  await row.getByRole("button", { name: "Publishing: Published. Click to change." }).click();
  await expect(toast(page, `${title}: Draft.`)).toBeVisible();
  expect((await revalidation).status()).toBe(200);
  await expect(row.getByRole("button", { name: "Publishing: Draft. Click to change." })).toBeVisible();
  // Drafts have no "view on site" link.
  await expect(row.getByRole("link", { name: /on the site/ })).toHaveCount(0);

  await eventually(async () => {
    const response = await publicPage.goto(`/projects/${project.slug}`);
    expect(response?.status()).toBe(404);
  });
  await publicPage.goto(`/projects/category/${category.slug}`);
  await expect(publicPage.getByRole("heading", { level: 1 })).toHaveText(String(category.title));
  await expect(publicPage.getByText(title)).toHaveCount(0);
});
