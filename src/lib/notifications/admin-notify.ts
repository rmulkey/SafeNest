/**
 * Admin notification utilities.
 * Sends alerts to admin for critical platform events.
 *
 * In production, this should integrate with a real notification service
 * (e.g., Slack webhook, email via SendGrid/Resend, PagerDuty, etc.)
 * Currently supports webhook URL via ADMIN_WEBHOOK_URL environment variable.
 */

export interface UnhealthyLinkAlert {
  linkId: string;
  destinationUrl: string;
  httpStatus: number | null;
  flaggedAt: Date;
}

export interface AdminNotificationPayload {
  type: "unhealthy_links";
  timestamp: string;
  summary: string;
  links: UnhealthyLinkAlert[];
}

/**
 * Sends an admin notification about unhealthy affiliate links.
 * Attempts to send via configured webhook URL, falls back to console logging.
 *
 * @param unhealthyLinks - Array of links that failed health checks
 * @returns true if notification was sent successfully
 */
export async function notifyAdminUnhealthyLinks(
  unhealthyLinks: UnhealthyLinkAlert[]
): Promise<boolean> {
  if (unhealthyLinks.length === 0) return true;

  const payload: AdminNotificationPayload = {
    type: "unhealthy_links",
    timestamp: new Date().toISOString(),
    summary: `${unhealthyLinks.length} affiliate link(s) flagged as unhealthy and require admin review.`,
    links: unhealthyLinks,
  };

  const webhookUrl = process.env.ADMIN_WEBHOOK_URL;

  if (webhookUrl) {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log(
          `[admin-notify] Notification sent successfully for ${unhealthyLinks.length} unhealthy link(s).`
        );
        return true;
      }

      console.error(
        `[admin-notify] Webhook responded with status ${response.status}`
      );
    } catch (error) {
      console.error(`[admin-notify] Failed to send webhook notification:`, error);
    }
  }

  // Fallback: log the notification payload for admin visibility
  console.warn(
    `[admin-notify] UNHEALTHY LINKS ALERT:`,
    JSON.stringify(payload, null, 2)
  );

  return !webhookUrl; // true if no webhook configured (fallback is success), false if webhook failed
}
