import type { ToyReviewSummary } from "@/lib/seo/programmatic-pages";

export type AwardVariant = "top-pick" | "best-value" | "safest";

interface AwardBadgeProps {
  variant: AwardVariant;
  /** Slightly smaller styling for use inside dense tables */
  size?: "sm" | "md";
  className?: string;
}

const variantConfig: Record<
  AwardVariant,
  { label: string; classes: string }
> = {
  "top-pick": {
    label: "🏆 Top Pick",
    classes: "bg-amber-100 text-amber-800 ring-1 ring-amber-300/70",
  },
  "best-value": {
    label: "💰 Best Value",
    classes: "bg-secondary-100 text-secondary-800 ring-1 ring-secondary-300/70",
  },
  safest: {
    label: "🛡️ Safest Choice",
    classes: "bg-primary-100 text-primary-800 ring-1 ring-primary-300/70",
  },
};

/**
 * A small pill badge used to highlight award-winning toys on listing pages
 * and comparison tables. Calm, on-brand styling — no aggressive urgency.
 */
export function AwardBadge({
  variant,
  size = "md",
  className = "",
}: AwardBadgeProps) {
  const { label, classes } = variantConfig[variant];
  const sizeClasses =
    size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold shadow-sm ${sizeClasses} ${classes} ${className}`}
    >
      {label}
    </span>
  );
}

/**
 * Compute at most one award per review for a given list of reviews.
 *
 * Priority when a review qualifies for more than one award:
 *   top-pick > safest > best-value
 *
 * Rules:
 *   - "safest": the review with the highest safetyScore.
 *   - "top-pick": the review with the highest (safetyScore + developmentScore).
 *   - "best-value": the review with the highest developmentScore that has a
 *     safetyScore >= 85 and did not already receive top-pick. (We have no price
 *     data, so value is approximated via development strength + a safety floor.)
 *
 * Returns a map of review _id -> award variant. Reviews without an award are
 * simply absent from the map.
 */
export function computeAwards(
  reviews: ToyReviewSummary[]
): Record<string, AwardVariant> {
  const awards: Record<string, AwardVariant> = {};

  if (reviews.length === 0) {
    return awards;
  }

  // Highest combined safety + development -> top-pick
  const topPick = reviews.reduce((best, r) =>
    r.safetyScore + r.developmentScore > best.safetyScore + best.developmentScore
      ? r
      : best
  );

  // Highest safetyScore -> safest
  const safest = reviews.reduce((best, r) =>
    r.safetyScore > best.safetyScore ? r : best
  );

  // Best value: highest developmentScore among reviews with safetyScore >= 85
  // that aren't the top pick.
  const valueCandidates = reviews.filter(
    (r) => r.safetyScore >= 85 && r._id !== topPick._id
  );
  const bestValue =
    valueCandidates.length > 0
      ? valueCandidates.reduce((best, r) =>
          r.developmentScore > best.developmentScore ? r : best
        )
      : null;

  // Apply in reverse priority order so higher-priority awards overwrite.
  if (bestValue) {
    awards[bestValue._id] = "best-value";
  }
  awards[safest._id] = "safest";
  awards[topPick._id] = "top-pick";

  return awards;
}
