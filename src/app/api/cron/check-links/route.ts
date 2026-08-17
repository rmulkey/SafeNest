import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { sanityClient } from "@/lib/sanity/client";
import {
  probeUrl,
  isSearchUrl,
  type ReviewWithLinks,
} from "@/lib/affiliate/audit-sanity-links";
import {
  notifyAdminUnhealthyLinks,
  UnhealthyLinkAlert,
} from "@/lib/notifications/admin-notify";

/**
 * GET /api/cron/check-links
 *
 * Daily affiliate link health check.
 *
 * WHAT WAS WRONG
 * This job used to read every row of the Postgres `AffiliateLinkStatus` table
 * and probe it. Nothing in the codebase has ever *created* a row in that table —
 * only `update` — so the query returned an empty set and the job checked nothing,
 * every day. `/dashboard/links` read the same empty table, so it reported "all
 * affiliate links are healthy" as a matter of arithmetic rather than evidence.
 *
 * The links customers actually click live on Sanity
 * `toyReview.affiliateLinks[].url`. This job now reads that source of truth,
 * probes each link, and upserts the result — so the table is populated as a
 * side effect of checking, and the dashboard reflects reality.
 *
 * DATA INTEGRITY
 *  - A link is marked unhealthy ONLY on a conclusive dead verdict (404/410, or
 *    Amazon's 200-with-not-found body). Amazon bot walls and rate limits return
 *    "inconclusive" and leave the previous state untouched, because a 503 is not
 *    evidence a product is gone and must never trigger a false alarm.
 *  - Amazon SEARCH urls are inherently valid and are recorded healthy without a
 *    network call, which is also what keeps this job fast.
 *
 * Protected by CRON_SECRET.
 */
export const maxDuration = 300;

/** Probes are spaced out to stay polite to the retailer. */
const PROBE_DELAY_MS = 500;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reviews = await sanityClient.fetch<ReviewWithLinks[]>(
    `*[_type == "toyReview" && count(affiliateLinks) > 0]{
      _id, productName, brand, "slug": slug.current, affiliateLinks
    }`
  );

  const results: Array<{
    productId: string;
    partnerId: string;
    url: string;
    verdict: string;
    httpStatus: number | null;
  }> = [];
  const newlyFlagged: UnhealthyLinkAlert[] = [];

  let okCount = 0;
  let deadCount = 0;
  let inconclusiveCount = 0;

  for (const review of reviews) {
    for (const link of review.affiliateLinks ?? []) {
      const url = link?.url;
      const partnerId = link?.partnerId ?? "amazon";
      if (!url) continue;

      // Search URLs cannot 404, so record them healthy without a request.
      const probe = isSearchUrl(url)
        ? { verdict: "ok" as const, httpStatus: null, note: "search URL" }
        : await probeUrl(url);

      const now = new Date();
      const key = { productId: review._id, partnerId };

      if (probe.verdict === "inconclusive") {
        // Refresh the timestamp so we know it was attempted, but do not change
        // the health verdict on the strength of a bot wall.
        inconclusiveCount++;
        await prisma.affiliateLinkStatus.upsert({
          where: { productId_partnerId: key },
          update: { lastChecked: now, destinationUrl: url },
          create: {
            ...key,
            destinationUrl: url,
            lastChecked: now,
            isHealthy: true,
            httpStatus: probe.httpStatus,
          },
        });
      } else if (probe.verdict === "ok") {
        okCount++;
        await prisma.affiliateLinkStatus.upsert({
          where: { productId_partnerId: key },
          update: {
            lastChecked: now,
            destinationUrl: url,
            isHealthy: true,
            httpStatus: probe.httpStatus,
            flaggedAt: null,
          },
          create: {
            ...key,
            destinationUrl: url,
            lastChecked: now,
            isHealthy: true,
            httpStatus: probe.httpStatus,
          },
        });
      } else {
        deadCount++;
        const existing = await prisma.affiliateLinkStatus.findUnique({
          where: { productId_partnerId: key },
        });
        // Preserve the original flag time so "how long has this been broken"
        // stays answerable.
        const flaggedAt = existing?.flaggedAt ?? now;
        const row = await prisma.affiliateLinkStatus.upsert({
          where: { productId_partnerId: key },
          update: {
            lastChecked: now,
            destinationUrl: url,
            isHealthy: false,
            httpStatus: probe.httpStatus,
            flaggedAt,
          },
          create: {
            ...key,
            destinationUrl: url,
            lastChecked: now,
            isHealthy: false,
            httpStatus: probe.httpStatus,
            flaggedAt,
          },
        });
        newlyFlagged.push({
          linkId: row.id,
          destinationUrl: url,
          httpStatus: probe.httpStatus,
          flaggedAt,
        });
      }

      results.push({
        productId: review._id,
        partnerId,
        url,
        verdict: probe.verdict,
        httpStatus: probe.httpStatus,
      });

      if (!isSearchUrl(url)) await sleep(PROBE_DELAY_MS);
    }
  }

  console.log(
    `[cron/check-links] ${results.length} link(s): ${okCount} ok, ${deadCount} dead, ${inconclusiveCount} inconclusive`
  );

  let notificationSent = false;
  if (newlyFlagged.length > 0) {
    notificationSent = await notifyAdminUnhealthyLinks(newlyFlagged);
    console.log(
      `[cron/check-links] admin notification ${notificationSent ? "sent" : "failed"} for ${newlyFlagged.length} dead link(s)`
    );
  }

  return Response.json({
    checked: results.length,
    ok: okCount,
    dead: deadCount,
    inconclusive: inconclusiveCount,
    notificationSent,
    results,
  });
}
