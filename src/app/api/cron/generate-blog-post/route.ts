import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { sanityWriteClient } from "@/lib/sanity/client";
import { generateBiweeklyPost, isoWeek } from "@/lib/catalog/generate-blog-post";

/**
 * GET /api/cron/generate-blog-post
 *
 * Runs daily (cheap no-op most days) but only generates a post on EVEN ISO
 * weeks — giving an every-other-week cadence from a single daily schedule.
 * Protected by CRON_SECRET.
 *
 * Data integrity: the post is an editorial roundup built only from products
 * already in the catalog (real, verified reviews). No external data invented.
 */
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.SANITY_API_TOKEN) {
    return Response.json(
      { error: "SANITY_API_TOKEN not configured" },
      { status: 500 }
    );
  }

  const now = new Date();
  const { week } = isoWeek(now);

  // Bi-weekly cadence: only act on even ISO weeks. Allow ?force=1 for manual
  // testing (still requires the CRON_SECRET auth above).
  const force = new URL(request.url).searchParams.get("force") === "1";
  if (week % 2 !== 0 && !force) {
    return Response.json({
      ok: true,
      skipped: true,
      reason: `odd ISO week (${week}) — bi-weekly cadence runs on even weeks`,
    });
  }

  try {
    const outcome = await generateBiweeklyPost(sanityWriteClient, now);

    if (outcome.status === "published") {
      for (const path of ["/", "/blog"]) {
        try {
          revalidatePath(path);
        } catch {
          // best-effort
        }
      }
    }

    console.log(`[cron/generate-blog-post] ${JSON.stringify(outcome)}`);
    return Response.json({ ok: true, ...outcome });
  } catch (error) {
    console.error("[cron/generate-blog-post] error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
