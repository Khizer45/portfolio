import type { ProjectDetail, ProjectImage } from "@/types/api";

/** Default intrinsic size for project images (16:10). */
export const DEFAULT_IMAGE_SIZE = { width: 1600, height: 1000 };

export function getScreenshots(project: ProjectDetail): ProjectImage[] {
  return project.images.filter((image) => image.kind !== "diagram");
}

export function getDiagrams(project: ProjectDetail): ProjectImage[] {
  return project.images.filter((image) => image.kind === "diagram");
}

export function hasProjectLinks(project: Pick<ProjectDetail, "github_url" | "demo_url" | "docs_url" | "video_url">) {
  return Boolean(project.github_url || project.demo_url || project.docs_url || project.video_url);
}
