import { AlertTriangle, CheckCircle2, Clock, HelpCircle } from "lucide-react";
import type { FreshnessStatus } from "@/lib/recalls/freshness";

/**
 * Renders the true freshness of recall data.
 *
 * The recalls page previously printed `new Date()` as "Last updated", so it
 * always claimed to be current regardless of how old the data actually was. This
 * component shows the real last-successful-sync time and escalates to a warning
 * when the scheduled job has not completed recently, so a broken pipeline is
 * visible to users instead of hidden.
 */
export function RecallFreshness({
  status,
  sourceAttribution = "U.S. Consumer Product Safety Commission (CPSC)",
}: {
  status: FreshnessStatus;
  sourceAttribution?: string;
}) {
  const style = {
    fresh: {
      wrap: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100",
      Icon: CheckCircle2,
    },
    aging: {
      wrap: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
      Icon: Clock,
    },
    stale: {
      wrap: "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100",
      Icon: AlertTriangle,
    },
    unknown: {
      wrap: "border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200",
      Icon: HelpCircle,
    },
  }[status.level];

  const Icon = style.Icon;
  const isProblem = status.level === "stale" || status.level === "aging";

  return (
    <div
      className={`rounded-lg border p-4 text-sm ${style.wrap}`}
      // Announce staleness to assistive tech, since it changes how much the page
      // can be trusted.
      role={isProblem ? "alert" : undefined}
    >
      <p className="flex items-start gap-2 font-medium">
        <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{status.detail}</span>
      </p>
      <p className="mt-2 pl-6 text-xs opacity-90">
        Source: {sourceAttribution}. SafeNest republishes this public data and
        does not determine recalls. Always follow the official notice for final
        instructions.
      </p>
    </div>
  );
}
