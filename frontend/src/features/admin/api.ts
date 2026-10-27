"use client";

/**
 * Browser API client for the admin dashboard.
 *
 * By default requests go to the same origin (`/api/v1/...`), which Next.js forwards to
 * the FastAPI backend (see `rewrites` in next.config.ts). The session cookie is then a
 * first-party, HttpOnly cookie on the frontend's domain. Set NEXT_PUBLIC_API_URL only
 * if the browser must call the backend directly (see docs/DEPLOYMENT.md).
 */

import type { SessionInfo } from "@/types/api";

const BASE = `${(process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "")}/api/v1`;
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** Field name → message, from the backend's `errors` array. */
    readonly fieldErrors: Record<string, string> = {},
    /** Messages from `errors` that belong to no single field. */
    readonly formErrors: string[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let csrfToken: string | null = null;
const unauthorizedListeners = new Set<() => void>();

/** Stored in memory only; the backend returns it from login and /auth/me. */
export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

/** Called when any admin request reports that the session has ended. */
export function onUnauthorized(listener: () => void) {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

type RequestOptions = { method?: string; body?: unknown; signal?: AbortSignal };

export async function apiRequest<T>(path: string, options: RequestOptions = {}, retried = false): Promise<T> {
  const { method = "GET", body, signal } = options;
  const headers: Record<string, string> = { Accept: "application/json" };
  // A file (Blob) is sent as-is with its own type; anything else as JSON.
  const isFile = body instanceof Blob;
  if (body !== undefined) headers["Content-Type"] = isFile ? body.type || "application/octet-stream" : "application/json";
  if (UNSAFE_METHODS.has(method) && csrfToken) headers["X-CSRF-Token"] = csrfToken;

  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isFile ? body : JSON.stringify(body),
      credentials: "include",
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new ApiError(0, "Could not reach the server. Check your connection and try again.");
  }

  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const fieldErrors: Record<string, string> = {};
    const formErrors: string[] = [];
    for (const error of (data?.errors ?? []) as Array<{ field: string | null; message: string }>) {
      const text = String(error.message).replace(/^Value error, /, "");
      if (error.field) fieldErrors[error.field] ??= text;
      else formErrors.push(text);
    }
    const message =
      typeof data?.detail === "string"
        ? data.detail
        : response.status >= 500
          ? "The server had a problem. Please try again."
          : `Request failed (${response.status}).`;
    // A 401 on a normal request means the session expired. (Login and /auth/me
    // report 401 as part of their normal flow and are handled by the caller.)
    if (response.status === 401 && !path.startsWith("/auth/")) {
      unauthorizedListeners.forEach((listener) => listener());
    }
    // Signing in again in another tab replaces the session, so the token held here is
    // stale. Fetch the current one and try once more.
    if (response.status === 403 && UNSAFE_METHODS.has(method) && !retried && /csrf/i.test(message)) {
      const session = await apiRequest<SessionInfo>("/auth/me", { signal }).catch(() => null);
      if (session) {
        setCsrfToken(session.csrf_token);
        return apiRequest<T>(path, options, true);
      }
    }
    throw new ApiError(response.status, message, fieldErrors, formErrors);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => apiRequest<T>(path, { signal }),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "POST", body }),
  put: <T>(path: string, body: unknown) => apiRequest<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body: unknown) => apiRequest<T>(path, { method: "PATCH", body }),
  delete: <T = void>(path: string) => apiRequest<T>(path, { method: "DELETE" }),
};

/**
 * Ask the Next.js server to refresh cached public pages after a change. Without this,
 * pages update on their own within five minutes.
 */
export function revalidatePublicSite() {
  void fetch("/api/revalidate", {
    method: "POST",
    credentials: "include",
    headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
  }).catch(() => undefined);
}

export function errorMessage(error: unknown): string {
  // For validation errors the detail is just "Validation failed"; the first specific
  // message says what to fix.
  if (error instanceof ApiError) return error.formErrors[0] ?? Object.values(error.fieldErrors)[0] ?? error.message;
  return "Something went wrong. Please try again.";
}
