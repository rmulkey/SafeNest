import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { checkLinkHealth } from "@/lib/affiliate/link-checker";
import {
  notifyAdminUnhealthyLinks,
  UnhealthyLinkAlert,
} from "@/lib/notifications/admin-notify";

/**
 * GET /api/cron/check-links
 *
 * Daily cron job that checks all affiliate link health.
 * Protected by CRON_SECRET environment variable.
 * Vercel cron jobs invoke GET endpoints.
 *
 * - Checks each affiliate link target URL for reachability
 * - Flags links with 4xx/5xx or timeout (>10s) as unhealthy (isHealthy=false, flaggedAt set)
 * - Sends notification to admin for unhealthy links within 24 hours
 *
 * Requirements: 5.6
 */
export async function GET(request: NextRequest) {
  // Validate authorization
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const links = await prisma.affiliateLinkStatus.findMany();

  const results: {
    id: string;
    url: string;
    isHealthy: boolean;
    httpStatus: number | null;
  }[] = [];

  const newlyFlaggedLinks: UnhealthyLinkAlert[] = [];

  for (const link of links) {
    const { isHealthy, httpStatus } = await checkLinkHealth(
      link.destinationUrl
    );
    const now = new Date();

    if (isHealthy) {
      await prisma.affiliateLinkStatus.update({
        where: { id: link.id },
        data: {
          lastChecked: now,
          isHealthy: true,
          httpStatus,
          flaggedAt: null,
        },
      });
    } else {
      const flaggedAt = link.flaggedAt ?? now;

      await prisma.affiliateLinkStatus.update({
        where: { id: link.id },
        data: {
          lastChecked: now,
          isHealthy: false,
          httpStatus,
          flaggedAt,
        },
      });

      // Collect newly flagged or persistently unhealthy links for notification
      newlyFlaggedLinks.push({
        linkId: link.id,
        destinationUrl: link.destinationUrl,
        httpStatus,
        flaggedAt,
      });
    }

    results.push({
      id: link.id,
      url: link.destinationUrl,
      isHealthy,
      httpStatus,
    });
  }

  const healthyCount = results.filter((r) => r.isHealthy).length;
  const unhealthyCount = results.filter((r) => !r.isHealthy).length;

  console.log(
    `[cron/check-links] Checked ${results.length} links: ${healthyCount} healthy, ${unhealthyCount} unhealthy`
  );

  // Send admin notification for unhealthy links (within 24 hours requirement)
  let notificationSent = false;
  if (newlyFlaggedLinks.length > 0) {
    notificationSent = await notifyAdminUnhealthyLinks(newlyFlaggedLinks);
    console.log(
      `[cron/check-links] Admin notification ${notificationSent ? "sent" : "failed"} for ${newlyFlaggedLinks.length} unhealthy link(s)`
    );
  }

  return Response.json({
    checked: results.length,
    healthy: healthyCount,
    unhealthy: unhealthyCount,
    notificationSent,
    results,
  });
}
