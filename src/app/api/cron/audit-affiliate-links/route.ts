import { NextRequest } from "next/server";
import { sanityWriteClient } from "@/lib/sanity/client";
import {
  auditReviewLinks,
  type ReviewWithLinks,
} from "@/lib/affiliate/audit-sanity-links";
import { notifyAdminUnhealthyLinks } from "@/lib/notifications/admin-notify";

/**
 * GET /api/cron/audit-affiliate-links
 *
 * Weekly audit of the affiliate links stored on Sanity `toyReview` documents —
 * the links customers actually click.
 *
 * This complements /api/cron/check-links, which reads the Postgres
 * `AffiliateLinkStatus` table. Nothing in the codebase ever inserts rows into
 * that table, so it currently audits an empty set; a dead /dp/{ASIN} link went
 * unnoticed as a result. This route checks the real source of truth.
 *
 * Behaviour:
 *  - Amazon SEARCH urls are skipped (always valid, no request made).
 *  - Direct /dp/{ASIN} urls are probed. Hard 404s and Amazon's 200-with-
 *    not-found-body are treated as dead. Bot walls, rate limits, and network
 *    errors are INCONCLUSIVE and never acted on.
 *  - Dead direct links get a safe Amazon search URL as the replacement, which is
 *    the fallback this project's data-integrity rules prescribe. A replacement
 *    ASIN is never invented.
 *
 * Writes are OPT-IN. Set AFFILIATE_AUDIT_AUTOFIX=true to let the job repair dead
 * links automatically; otherwise it reports and notifies without mutating
 * content. `?apply=1` forces a fix run for a manual invocation.
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
  const autoFix =
    process.env.AFFILIATE_AUDIT_AUTOFIX === "true" ||
    url.searchParams.get("apply") === "1";

  try {
    const reviews = await sanityWriteClient.fetch<ReviewWithLinks[]>(
      `*[_type == "toyReview" && count(affiliateLinks) > 0]{
        _id, productName, brand, "slug": slug.current, affiliateLinks
      }`
    );

    const summary = await auditReviewLinks(reviews, {
      autoFix,
      applyFix: async (reviewId, links) => {
        await sanityWriteClient
          .patch(reviewId)
          .set({ affiliateLinks: links })
          .commit();
      },
    });

    const dead = summary.results.filter((r) => r.verdict === "dead");

    // Reuse the existing admin alert channel for anything found dead.
    let notificationSent = false;
    if (dead.length > 0) {
      notificationSent = await notifyAdminUnhealthyLinks(
        dead.map((d) => ({
          linkId: `${d.reviewId}`,
          destinationUrl: d.url,
          httpStatus: d.httpStatus,
          flaggedAt: new Date(),
        }))
      );
    }

    console.log(
      `[cron/audit-affiliate-links] reviews=${reviews.length} checked=${summary.checked} ` +
        `ok=${summary.ok} dead=${summary.dead} inconclusive=${summary.inconclusive} ` +
        `skipped=${summary.skipped} autoFix=${autoFix} fixed=${summary.fixed}`
    );

    return Response.json({
      ok: true,
      autoFix,
      reviews: reviews.length,
      checked: summary.checked,
      healthy: summary.ok,
      dead: summary.dead,
      inconclusive: summary.inconclusive,
      skipped: summary.skipped,
      fixed: summary.fixed,
      notificationSent,
      deadLinks: dead.map((d) => ({
        product: d.productName,
        slug: d.slug,
        url: d.url,
        httpStatus: d.httpStatus,
        suggestedUrl: d.suggestedUrl,
      })),
    });
  } catch (error) {
    console.error("[cron/audit-affiliate-links] error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
