import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Access control for the admin dashboard.
 *
 * WHY THIS EXISTS
 * `/dashboard/links` and `/dashboard/clicks` were publicly reachable and
 * returned HTTP 200 to anyone. They render affiliate click analytics and link
 * health from Postgres. `robots.txt` disallows `/dashboard`, but that only asks
 * crawlers not to index it — it is not access control.
 *
 * They only failed to leak because the Prisma client was misconfigured and every
 * query threw. Fixing that without adding this gate would have published the
 * analytics, so the two changes belong in the same deploy.
 *
 * WHY A SHARED SECRET RATHER THAN CLERK
 * The Clerk keys in the environment are auto-provisioned *test* keys from a
 * keyless dev instance, and `@clerk/nextjs` is not installed — Clerk was never
 * actually wired up. Two internal pages do not need identity management, and a
 * shared secret ships today without depending on an external service or an
 * account being created first. Clerk remains the upgrade path if these pages
 * ever need per-user accounts or an audit trail.
 *
 * FAILS CLOSED
 * If ADMIN_DASHBOARD_TOKEN is unset the dashboard is unreachable. A missing
 * environment variable must never be the thing that opens it.
 */

/** Constant-time comparison. Avoids leaking the secret via response timing. */
function timingSafeEqual(a: string, b: string): boolean {
  // Compare over a fixed length so the loop count does not reveal the length.
  const len = Math.max(a.length, b.length);
  let mismatch = a.length === b.length ? 0 : 1;
  for (let i = 0; i < len; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/** 404 rather than 401, so the route's existence is not advertised. */
function notFound(): NextResponse {
  return new NextResponse("Not found", {
    status: 404,
    headers: { "X-Robots-Tag": "noindex, nofollow" },
  });
}

function unauthorized(): NextResponse {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      // Basic auth means the browser supplies the prompt; no login UI needed.
      "WWW-Authenticate": 'Basic realm="SafeNest admin", charset="UTF-8"',
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "no-store",
    },
  });
}

export function proxy(request: NextRequest): NextResponse {
  const expected = process.env.ADMIN_DASHBOARD_TOKEN;

  // No secret configured => no dashboard. Fail closed.
  if (!expected || expected.length < 16) {
    return notFound();
  }

  const header = request.headers.get("authorization") ?? "";
  const [scheme, encoded] = header.split(" ");
  if (scheme?.toLowerCase() !== "basic" || !encoded) {
    return unauthorized();
  }

  let decoded: string;
  try {
    decoded = atob(encoded);
  } catch {
    return unauthorized();
  }

  // Username is ignored; the password carries the secret.
  const password = decoded.slice(decoded.indexOf(":") + 1);
  if (!timingSafeEqual(password, expected)) {
    return unauthorized();
  }

  const response = NextResponse.next();
  // Belt and braces: even when authenticated, keep it out of any index.
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  matcher: "/dashboard/:path*",
};
