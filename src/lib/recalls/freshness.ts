/**
 * Recall data freshness.
 *
 * The site previously claimed recalls were "monitored daily" with no mechanism
 * behind it. Rather than asserting a frequency, the recalls page now renders the
 * real last-successful-sync time and degrades to an explicit warning when the
 * data is stale. If the scheduled job stops running, the page says so instead of
 * silently continuing to imply freshness.
 */

export type FreshnessLevel = "fresh" | "aging" | "stale" | "unknown";

export interface FreshnessStatus {
  level: FreshnessLevel;
  /** Short label for UI. */
  label: string;
  /** Full sentence suitable for display under a heading. */
  detail: string;
  hoursSinceSync: number | null;
  /** True when the claim of ongoing monitoring is currently defensible. */
  monitoringClaimSupported: boolean;
}

/** A daily job is expected; allow a grace period before calling it stale. */
export const FRESH_LIMIT_HOURS = 48;
export const AGING_LIMIT_HOURS = 96;

function formatWhen(d: Date): string {
  return d.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

/**
 * Classify the freshness of recall data given the last successful sync.
 *
 * `lastSuccessfulSync` must be the completion time of a sync that had zero
 * failed windows. A partial sync must not be recorded as successful, otherwise
 * this status would overstate coverage.
 */
export function getFreshnessStatus(
  lastSuccessfulSync: Date | string | null | undefined,
  now: Date = new Date()
): FreshnessStatus {
  if (!lastSuccessfulSync) {
    return {
      level: "unknown",
      label: "Not yet synchronised",
      detail:
        "Recall data has not been synchronised yet. Check the official CPSC recall database directly.",
      hoursSinceSync: null,
      monitoringClaimSupported: false,
    };
  }

  const then = new Date(lastSuccessfulSync);
  if (Number.isNaN(then.getTime())) {
    return {
      level: "unknown",
      label: "Sync time unavailable",
      detail:
        "The last synchronisation time could not be read. Check the official CPSC recall database directly.",
      hoursSinceSync: null,
      monitoringClaimSupported: false,
    };
  }

  const hours = Math.max(0, (now.getTime() - then.getTime()) / 3_600_000);
  const when = formatWhen(then);

  if (hours <= FRESH_LIMIT_HOURS) {
    return {
      level: "fresh",
      label: `Updated ${when}`,
      detail: `Last successful synchronisation with the CPSC recall database: ${when}.`,
      hoursSinceSync: hours,
      monitoringClaimSupported: true,
    };
  }

  if (hours <= AGING_LIMIT_HOURS) {
    return {
      level: "aging",
      label: `Last updated ${when}`,
      detail: `Recall data was last synchronised on ${when}, which is longer ago than intended. Newer recalls may not appear here yet — check the official CPSC database.`,
      hoursSinceSync: hours,
      monitoringClaimSupported: false,
    };
  }

  return {
    level: "stale",
    label: `Out of date — last updated ${when}`,
    detail: `Recall data is out of date. The last successful synchronisation was ${when}. Do not rely on this page; check the official CPSC recall database directly.`,
    hoursSinceSync: hours,
    monitoringClaimSupported: false,
  };
}
