/**
 * Server-side API access for public pages (Server Components, sitemap, OG images).
 *
 * Responses are cached for REVALIDATE_SECONDS and tagged "content". After every change
 * in the admin dashboard, /api/revalidate clears the tag so the public site updates on
 * the next visit. Do not import this from client components.
 */

export const REVALIDATE_SECONDS = 300;
export const CONTENT_TAG = "content";

/** Base URL of the FastAPI backend, as reached from the Next.js server. */
export function apiBaseUrl(): string {
  return (process.env.API_URL || "http://localhost:8000").replace(/\/$/, "");
}

const isBuild = process.env.NEXT_PHASE === "phase-production-build";

export class ApiUnavailableError extends Error {}

async function request(path: string): Promise<Response> {
  return fetch(`${apiBaseUrl()}/api/v1${path}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: REVALIDATE_SECONDS, tags: [CONTENT_TAG] },
    // Free-tier backends can take ~1 minute to wake from sleep.
    signal: AbortSignal.timeout(90_000),
  });
}

/**
 * GET a public endpoint.
 *
 * - At build time, an unreachable API returns `fallback` (with a warning) so the site
 *   can be built before the backend exists; pages fill in on their next revalidation.
 * - At request time, errors are thrown. During background revalidation Next.js then
 *   keeps serving the last good version of the page instead of an empty one.
 */
export async function apiGet<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await request(path);
    if (!response.ok) throw new ApiUnavailableError(`GET ${path} → ${response.status}`);
    return (await response.json()) as T;
  } catch (error) {
    if (isBuild) {
      console.warn(`[api] ${path} unavailable during build; using fallback. (${String(error)})`);
      return fallback;
    }
    throw error;
  }
}

/** GET a single item; resolves to null on 404 (so the page can call notFound()). */
export async function apiGetOrNull<T>(path: string): Promise<T | null> {
  try {
    const response = await request(path);
    if (response.status === 404) return null;
    if (!response.ok) throw new ApiUnavailableError(`GET ${path} → ${response.status}`);
    return (await response.json()) as T;
  } catch (error) {
    if (isBuild) {
      console.warn(`[api] ${path} unavailable during build. (${String(error)})`);
      return null;
    }
    throw error;
  }
}
