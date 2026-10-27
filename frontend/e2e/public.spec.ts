/**
 * Public site: pages a visitor sees. Expected values are read from the public API, so
 * the tests keep working when the seeded content is edited in the admin.
 */
import type { APIRequestContext, Page } from "@playwright/test";

import { SIGNED_OUT, expect, test, uniqueName } from "./fixtures";

test.use({ storageState: SIGNED_OUT });

type Category = { slug: string; title: string; short_title: string };
type ProjectSummary = {
  slug: string;
  title: string;
  status: string;
  is_featured: boolean;
  technologies: string[];
  categories: Category[];
};
type Profile = { display_name: string; headline: string; availability_open: boolean; availability_label: string };

async function publicGet<T>(request: APIRequestContext, path: string): Promise<T> {
  const response = await request.get(`/api/v1${path}`);
  expect(response.ok(), `GET ${path} → ${response.status()}`).toBeTruthy();
  return (await response.json()) as T;
}

async function publishedProjects(request: APIRequestContext) {
  return (await publicGet<{ items: ProjectSummary[] }>(request, "/projects?page_size=100")).items;
}

/** Project cards rendered by the projects explorer (one <article> per project). */
function projectCards(page: Page) {
  return page.getByRole("main").getByRole("article");
}

function resultCount(page: Page, shown: number, total: number) {
  return page.getByText(new RegExp(`^Showing ${shown} of ${total} projects?$`));
}

test.describe("home page", () => {
  test("shows the profile name, headline and featured projects", async ({ page, request }) => {
    const profile = await publicGet<Profile>(request, "/profile");
    const projects = await publishedProjects(request);
    const featured = projects.filter((p) => p.is_featured);

    await page.goto("/");

    await expect(page.getByRole("banner").getByRole("link", { name: new RegExp(profile.display_name) })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(profile.display_name);
    await expect(page.getByText(profile.headline, { exact: true })).toBeVisible();
    if (profile.availability_open && profile.availability_label) {
      await expect(page.getByText(profile.availability_label, { exact: true }).first()).toBeVisible();
    }

    const selected = page.getByRole("region", { name: "Selected projects" });
    await expect(selected).toBeVisible();
    expect(featured.length, "the seeded data should have featured projects").toBeGreaterThan(0);
    await expect(selected.getByRole("article")).toHaveCount(featured.length);
    for (const project of featured) {
      await expect(selected.getByRole("heading", { name: project.title, exact: true })).toBeVisible();
    }
    await expect(selected.getByRole("link", { name: "View all projects" })).toHaveAttribute("href", "/projects");
  });
});

test.describe("footer", () => {
  test("shows icon links, no stack credits, and no written-out email address", async ({ page, request }) => {
    const profile = await publicGet<Profile & { contact_email: string | null; github_url: string | null }>(
      request,
      "/profile",
    );
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await expect(footer).not.toContainText("Built with");
    if (profile.contact_email) {
      await expect(footer).not.toContainText(profile.contact_email);
      const email = footer.getByRole("link", { name: new RegExp(`^Email ${profile.display_name.split(" ")[0]}`) });
      await expect(email).toHaveAttribute("href", `mailto:${profile.contact_email}`);
    }
    if (profile.github_url) {
      await expect(footer.getByRole("link", { name: /GitHub/ })).toHaveAttribute("href", profile.github_url);
    }
  });
});

test.describe("navigation", () => {
  const pages = [
    { link: "Projects", path: "/projects", heading: "Things I've built and am building" },
    { link: "Skills", path: "/skills", heading: "Skills and tools" },
    { link: "Experience", path: "/experience", heading: "Experience" },
    { link: "Education", path: "/education", heading: "Education" },
    { link: "About", path: "/about", heading: "About me" },
    { link: "Contact", path: "/contact", heading: "Get in touch" },
  ];

  test("sections with nothing to show yet are left out of the menu", async ({ page, request }) => {
    const certifications = await publicGet<unknown[]>(request, "/certifications");
    const achievements = await publicGet<unknown[]>(request, "/achievements");
    const articles = await publicGet<{ items: unknown[] }>(request, "/articles");
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Main", exact: true });
    await expect(nav.getByRole("link", { name: "Certifications", exact: true })).toHaveCount(
      certifications.length + achievements.length > 0 ? 1 : 0,
    );
    await expect(nav.getByRole("link", { name: "Writing", exact: true })).toHaveCount(articles.items.length > 0 ? 1 : 0);
  });

  test("main navigation links open each page", async ({ page, request }) => {
    const profile = await publicGet<Profile>(request, "/profile");
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Main", exact: true });

    for (const target of pages) {
      await nav.getByRole("link", { name: target.link, exact: true }).click();
      await expect(page).toHaveURL(target.path);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(target.heading);
      await expect(nav.getByRole("link", { name: target.link, exact: true })).toHaveAttribute("aria-current", "page");
    }

    await nav.getByRole("link", { name: "Home", exact: true }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(profile.display_name);
  });
});

test.describe("projects page", () => {
  test("search narrows the list and can be cleared", async ({ page, request }) => {
    const projects = await publishedProjects(request);
    const target = projects[0];

    await page.goto("/projects");
    await expect(resultCount(page, projects.length, projects.length)).toBeVisible();
    await expect(projectCards(page)).toHaveCount(projects.length);

    await page.getByRole("searchbox", { name: "Search projects" }).fill(target.title);
    await expect(projectCards(page).getByRole("heading", { name: target.title, exact: true })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`[?&]q=${encodeURIComponent(target.title).replace(/%20/g, "\\+")}`));

    await page.getByRole("searchbox", { name: "Search projects" }).fill("zz-no-project-matches-this-zz");
    await expect(page.getByText("No projects match these filters")).toBeVisible();
    await expect(resultCount(page, 0, projects.length)).toBeVisible();

    await page.getByRole("button", { name: "Clear filters" }).first().click();
    await expect(projectCards(page)).toHaveCount(projects.length);
    await expect(page).toHaveURL("/projects");
  });

  test("category, status and technology filters update the results and the URL", async ({ page, request }) => {
    const projects = await publishedProjects(request);
    const category = "computer-vision";
    const inCategory = projects.filter((p) => p.categories.some((c) => c.slug === category));
    expect(inCategory.length, `seeded data should have ${category} projects`).toBeGreaterThan(0);

    await page.goto("/projects");
    const categorySelect = page.getByRole("combobox", { name: "Category", exact: true });
    await categorySelect.selectOption(category);
    await expect(page).toHaveURL(`/projects?category=${category}`);
    await expect(projectCards(page)).toHaveCount(inCategory.length);
    for (const project of inCategory) {
      await expect(projectCards(page).getByRole("heading", { name: project.title, exact: true })).toBeVisible();
    }

    // Narrow further by the status of the first matching project.
    const status = inCategory[0].status;
    const both = inCategory.filter((p) => p.status === status);
    await page.getByRole("combobox", { name: "Status", exact: true }).selectOption(status);
    await expect(page).toHaveURL(`/projects?category=${category}&status=${status}`);
    await expect(projectCards(page)).toHaveCount(both.length);

    // Technology filter on its own: pick a technology used by exactly one project.
    await page.getByRole("button", { name: "Clear filters" }).click();
    const counts = new Map<string, number>();
    projects.forEach((p) => p.technologies.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    const tech = [...counts].find(([, n]) => n === 1)?.[0] ?? projects[0].technologies[0];
    const withTech = projects.filter((p) => p.technologies.includes(tech));
    await page.getByRole("combobox", { name: "Technology", exact: true }).selectOption(tech);
    await expect(page).toHaveURL(`/projects?tech=${encodeURIComponent(tech).replace(/%20/g, "+")}`);
    await expect(projectCards(page)).toHaveCount(withTech.length);
    await expect(projectCards(page).getByRole("heading", { name: withTech[0].title, exact: true })).toBeVisible();
  });

  test("filters are read from URL parameters", async ({ page, request }) => {
    const projects = await publishedProjects(request);
    const inCategory = projects.filter((p) => p.categories.some((c) => c.slug === "computer-vision"));

    await page.goto("/projects?category=computer-vision");
    await expect(page.getByRole("combobox", { name: "Category", exact: true })).toHaveValue("computer-vision");
    await expect(projectCards(page)).toHaveCount(inCategory.length);
    await expect(resultCount(page, inCategory.length, projects.length)).toBeVisible();

    // Unknown values are ignored rather than producing an empty page.
    await page.goto("/projects?category=not-a-category&status=nonsense");
    await expect(page.getByRole("combobox", { name: "Category", exact: true })).toHaveValue("all");
    await expect(projectCards(page)).toHaveCount(projects.length);
  });
});

test.describe("category pages", () => {
  test("list the category's projects, or 'Projects coming soon' when empty", async ({ page, request }) => {
    const categories = await publicGet<Array<Category & { project_count: number }>>(request, "/project-categories");
    const projects = await publishedProjects(request);
    const active = categories.find((c) => c.project_count > 0)!;
    const inActive = projects.filter((p) => p.categories.some((c) => c.slug === active.slug));

    await page.goto(`/projects/category/${active.slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(active.title);
    const list = page.getByRole("region", { name: `Projects in ${active.title}` });
    await expect(list.getByRole("article")).toHaveCount(inActive.length);

    const empty = categories.find((c) => c.project_count === 0);
    if (empty) {
      await page.goto(`/projects/category/${empty.slug}`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(empty.title);
      await expect(page.getByText("Projects coming soon")).toBeVisible();
    }

    const missing = await page.goto("/projects/category/not-a-real-category");
    expect(missing?.status()).toBe(404);
  });
});

test.describe("project detail page", () => {
  test("shows the case-study sections that have content", async ({ page, request }) => {
    const [first] = await publishedProjects(request);
    const project = await publicGet<Record<string, unknown> & { title: string; slug: string; technologies: string[] }>(
      request,
      `/projects/${first.slug}`,
    );

    const response = await page.goto(`/projects/${project.slug}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(project.title);
    const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(breadcrumb.getByRole("link", { name: "Projects" })).toHaveAttribute("href", "/projects");

    const has = (key: string) => {
      const value = project[key];
      return Array.isArray(value) ? value.length > 0 : Boolean(value);
    };
    const sections: Array<[string, boolean]> = [
      ["Overview", has("description")],
      ["The problem", has("problem")],
      ["Features", has("features")],
      ["My contribution", has("contribution")],
      ["Technical implementation", has("implementation")],
      ["Key engineering decisions", has("decisions")],
      ["Challenges", has("challenges")],
      ["Lessons learned", has("lessons")],
      ["Results & evaluation", has("results") || has("evaluation_note")],
      ["Next steps", has("next_steps")],
    ];
    expect(sections.some(([, present]) => present), "the project should have some case-study content").toBeTruthy();
    for (const [title, present] of sections) {
      // Empty sections are hidden.
      await expect(page.getByRole("heading", { level: 2, name: title, exact: true })).toHaveCount(present ? 1 : 0);
    }

    for (const feature of (project.features as Array<{ name: string }>) ?? []) {
      await expect(page.getByRole("region", { name: "Features" }).getByText(feature.name, { exact: true })).toBeVisible();
    }
    const details = page.getByRole("complementary", { name: "Project details" });
    for (const tech of project.technologies) {
      await expect(details.getByRole("link", { name: tech, exact: true })).toBeVisible();
    }
    if (project.notice_title) {
      await expect(page.getByRole("note")).toContainText(String(project.notice_title));
    }

    // A tech-stack tag opens the projects page filtered by that technology.
    const tech = project.technologies[project.technologies.length - 1];
    await details.getByRole("link", { name: tech, exact: true }).click();
    await expect(page).toHaveURL(`/projects?tech=${encodeURIComponent(tech)}`);
    await expect(page.getByRole("combobox", { name: "Technology", exact: true })).toHaveValue(tech);
    await expect(projectCards(page).getByRole("heading", { name: project.title, exact: true })).toBeVisible();
  });

  test("an unknown slug returns the 404 page", async ({ page }) => {
    const response = await page.goto("/projects/this-project-does-not-exist-e2e");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
  });
});

test.describe("unpublished content", () => {
  let draftId: string | null = null;

  test.afterEach(async ({ adminApi }) => {
    if (draftId) await adminApi.delete(`/admin/projects/${draftId}`);
    draftId = null;
  });

  test("a draft project never appears on the public site", async ({ page, request, adminApi }) => {
    const categories = await adminApi.list("/admin/project-categories");
    const category = categories.find((c) => c.slug === "computer-vision") ?? categories[0];
    const title = uniqueName("Draft Project");
    const draft = await adminApi.post<{ id: string; slug: string }>("/admin/projects", {
      title,
      summary: "Draft created by the end-to-end tests. It must never be public.",
      category_id: category.id,
      status: "planned",
      is_published: false,
      is_featured: true,
    });
    draftId = draft.id;
    await adminApi.revalidatePublicSite();

    expect((await request.get(`/api/v1/projects/${draft.slug}`)).status()).toBe(404);

    const detail = await page.goto(`/projects/${draft.slug}`);
    expect(detail?.status()).toBe(404);

    for (const path of ["/", "/projects", `/projects/category/${category.slug}`]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByText(title)).toHaveCount(0);
    }

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBeTruthy();
    expect(await sitemap.text()).not.toContain(draft.slug);
  });

  test("the writing page lists no draft articles", async ({ page, request, adminApi }) => {
    const articles = await adminApi.list("/admin/articles");
    const drafts = articles.filter((a) => a.status === "draft");
    const published = articles.filter((a) => a.status === "published");

    await page.goto("/writing");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Writing");
    for (const draft of drafts) {
      await expect(page.getByText(String(draft.title))).toHaveCount(0);
      expect((await request.get(`/api/v1/articles/${draft.slug}`)).status()).toBe(404);
      const response = await page.goto(`/writing/${draft.slug}`);
      expect(response?.status(), `draft article /writing/${draft.slug} must be a 404`).toBe(404);
      await page.goto("/writing");
    }
    if (published.length === 0) {
      await expect(page.getByText("Articles coming soon")).toBeVisible();
    } else {
      for (const article of published) {
        await expect(page.getByRole("heading", { level: 2, name: String(article.title) })).toBeVisible();
      }
    }
  });
});

test.describe("certifications page", () => {
  test("shows the empty state when there are no certifications", async ({ page, request }) => {
    const certifications = await publicGet<unknown[]>(request, "/certifications");
    test.skip(certifications.length > 0, "There are published certifications, so the empty state cannot be shown.");

    await page.goto("/certifications");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Certifications");
    await expect(page.getByText("Certifications will be added as completed")).toBeVisible();
    await expect(
      page.getByText("Verified certificates and completed courses will be listed here with links to confirm them."),
    ).toBeVisible();
  });
});

test.describe("theme", () => {
  test("the theme toggle switches themes and the choice survives a reload", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    const startsDark = await html.evaluate((el) => el.classList.contains("dark"));
    const toggle = page.getByRole("banner").getByRole("button", { name: /Switch to (light|dark) theme/ });

    await toggle.click();
    await expect(html).toHaveClass(startsDark ? /^(?!.*\bdark\b)/ : /\bdark\b/);
    expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe(startsDark ? "light" : "dark");

    await page.reload();
    await expect(html).toHaveClass(startsDark ? /^(?!.*\bdark\b)/ : /\bdark\b/);
    await expect(toggle).toHaveAccessibleName(startsDark ? "Switch to dark theme" : "Switch to light theme");

    // And back again.
    await toggle.click();
    await page.reload();
    await expect(html).toHaveClass(startsDark ? /\bdark\b/ : /^(?!.*\bdark\b)/);
  });
});

test.describe("404 page", () => {
  test("unknown URLs show the custom 404 page with useful links", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist-e2e");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
    const main = page.getByRole("main");
    for (const label of ["Projects", "Skills", "Experience", "Contact"]) {
      await expect(main.getByRole("link", { name: new RegExp(`^${label}`) })).toBeVisible();
    }
    await main.getByRole("link", { name: "Back to home" }).click();
    await expect(page).toHaveURL("/");
  });
});
