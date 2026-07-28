/**
 * Serves the IndexNow key file.
 *
 * IndexNow verifies that a submitter controls the domain by fetching a key file
 * from it. The protocol's default location is `/{key}.txt`; we serve a fixed
 * path instead and point at it with the submission's `keyLocation` field, so the
 * key can be rotated through an env var without adding a new route.
 *
 * The key is public by design — publishing it is the point.
 */

import { getIndexNowKey, isValidIndexNowKey } from "@/lib/seo/indexnow";

// No `export const dynamic` here: nextConfig.cacheComponents rejects the route
// segment config. The response is tiny and the Cache-Control header below lets
// the CDN serve it, so per-request evaluation costs nothing meaningful.
export async function GET(): Promise<Response> {
  const key = getIndexNowKey();

  if (!isValidIndexNowKey(key)) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(key, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
