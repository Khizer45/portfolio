import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { apiBaseUrl, CONTENT_TAG } from "@/lib/api/server";

/**
 * POST /api/revalidate — called by the admin dashboard after a change so the public
 * pages are rebuilt on their next visit instead of waiting for the 5-minute refresh.
 *
 * Only a signed-in administrator can trigger it: the request's session cookie is
 * checked against the backend before anything is invalidated.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ detail: "Request origin is not allowed." }, { status: 403 });
  }
  const cookie = request.headers.get("cookie");
  if (!cookie) return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });

  let authorized = false;
  try {
    const response = await fetch(`${apiBaseUrl()}/api/v1/auth/me`, {
      headers: { cookie, accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    authorized = response.ok;
  } catch {
    return NextResponse.json({ detail: "Backend unavailable." }, { status: 502 });
  }
  if (!authorized) return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });

  revalidateTag(CONTENT_TAG, { expire: 0 });
  revalidatePath("/", "layout");
  return NextResponse.json({ revalidated: true }, { headers: { "Cache-Control": "no-store" } });
}
