import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { sanityWriteClient } from "@/lib/sanity/client";
import { publishQueuedBatch } from "@/lib/catalog/publish-queued";

/**
 * GET /api/cron/publish-products
 *
 * Daily cron that publishes up to 5 verified products from the Sanity
 * `queuedProduct` queue into the live catalog. Protected by CRON_SECRET.
 *
 * Data integrity: the publisher re-verifies each product's affiliate URL and
 * image bytes before publishing; failures are flagged and skipped, never
 * published. An empty queue is a no-op.
 */
export const maxDuration = 60;

const DAILY_LIMIT = 5;

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

  try {
    const outcomes = await publishQueuedBatch(sanityWriteClient, DAILY_LIMIT);

    const published = outcomes.filter((o) => o.status === "published");
    const failed = outcomes.filter((o) => o.status === "failed");
    const duplicates = outcomes.filter((o) => o.status === "skipped-duplicate");

    // Revalidate listing pages so new products appear promptly.
    if (published.length > 0) {
      for (const path of ["/", "/reviews", "/best-toys", "/gift-guides"]) {
        try {
          revalidatePath(path);
        } catch {
          // best-effort
        }
      }
    }

    console.log(
      `[cron/publish-products] published=${published.length} failed=${failed.length} duplicate=${duplicates.length}`
    );

    return Response.json({
      ok: true,
      attempted: outcomes.length,
      published: published.length,
      failed: failed.length,
      duplicates: duplicates.length,
      outcomes,
    });
  } catch (error) {
    console.error("[cron/publish-products] error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
