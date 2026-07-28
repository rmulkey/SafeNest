import { NextRequest } from "next/server";
import { sanityWriteClient } from "@/lib/sanity/client";
import { syncRecalls } from "@/lib/recalls/sync";

/**
 * GET /api/cron/sync-recalls
 *
 * Daily synchronisation with the official CPSC recall database
 * (https://www.saferproducts.gov/RestWebServices/Recall).
 *
 * Before this existed the site claimed recalls were "monitored daily" while no
 * ingestion code existed at all and the public page showed a single stale entry.
 * The claim is now backed by a real job, and the recalls page renders the actual
 * last-successful-sync time so a broken job is visible rather than hidden.
 *
 * Behaviour:
 *  - Idempotent: recalls are keyed on the CPSC recall number.
 *  - Partial fetches are recorded as FAILED, so freshness never overstates.
 *  - Only high-confidence matches are attached to a review; weaker signals become
 *    recallMatchCandidate documents for human adjudication.
 *
 * Query params (all optional):
 *   ?dryRun=1        preview without writing
 *   ?lookbackDays=N  override history window
 *   ?all=1           include non-child-product recalls
 *
 * Protected by CRON_SECRET.
 */
export const maxDuration = 300;

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

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const all = url.searchParams.get("all") === "1";
  const lookbackParam = Number(url.searchParams.get("lookbackDays"));

  const outcome = await syncRecalls(sanityWriteClient, {
    dryRun,
    childProductsOnly: !all,
    ...(Number.isFinite(lookbackParam) && lookbackParam > 0
      ? { lookbackDays: lookbackParam }
      : {}),
  });

  // Log loudly on failure so the platform's log alerting can catch a silently
  // broken schedule.
  if (!outcome.ok) {
    console.error(
      `[cron/sync-recalls] FAILED ${JSON.stringify({
        error: outcome.error,
        failedWindows: outcome.failedWindows,
      })}`
    );
  } else {
    console.log(`[cron/sync-recalls] ${JSON.stringify(outcome)}`);
  }

  return Response.json(outcome, { status: outcome.ok ? 200 : 500 });
}
