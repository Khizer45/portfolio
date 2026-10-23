/**
 * Runs after all other tests (it is the `teardown` of the setup project).
 *
 * Each test deletes what it creates, but an interrupted run can leave records behind.
 * This removes anything whose name starts with "E2E Test", then signs the shared
 * session out so no session is left open on the server.
 */
import fs from "node:fs";

import { test as teardown } from "@playwright/test";

import { ADMIN_STATE, AdminApi } from "./fixtures";

teardown("remove leftover test records and sign out", async ({ playwright }) => {
  if (!fs.existsSync(ADMIN_STATE)) return;
  const api = await AdminApi.connect(playwright);
  try {
    const removed = {
      projects: await api.deleteTestRecords("/admin/projects", "title"),
      skills: await api.deleteTestRecords("/admin/skills", "name"),
      experiences: await api.deleteTestRecords("/admin/experiences", "role"),
      certifications: await api.deleteTestRecords("/admin/certifications", "name"),
      articles: await api.deleteTestRecords("/admin/articles", "title"),
      technologies: await api.deleteTestTechnologies(),
    };
    const total = Object.values(removed).reduce((a, b) => a + b, 0);
    if (total > 0) {
      console.log("Removed leftover E2E records:", removed);
      await api.revalidatePublicSite();
    }
  } finally {
    await api.signOut();
    await api.dispose();
    fs.rmSync(ADMIN_STATE, { force: true });
  }
});
