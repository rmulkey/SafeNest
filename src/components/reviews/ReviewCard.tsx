/**
 * ReviewCard - Compact card component for toy review listings.
 *
 * Displays: product name, safety score, development score, age range, and category.
 * Links to the full review page.
 *
 * Requirements: 1.1, 11.2
 */

import Link from "next/link";
import { formatAgeRange } from "@/lib/content/format-age";
import { RecallFlag } from "@/components/recalls/RecallFlag";

interface ReviewCardProps {
  productName: string;
  slug: { current: string };
  safetyScore: number;
  developmentScore: number;
  ageRange: { minMonths: number; maxMonths: number };
  category?: { title: string; slug: { current: string } } | null;
  hasActiveRecall?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 70) return "text-safety-high";
  if (score >= 40) return "text-safety-medium";
  return "text-safety-low";
}



export function ReviewCard({
  productName,
  slug,
  safetyScore,
  developmentScore,
  ageRange,
  category,
  hasActiveRecall,
}: ReviewCardProps) {
  return (
    <Link
      href={`/reviews/${slug.current}`}
      className="block rounded-lg border border-border p-4 hover:border-primary-400 transition-colors"
    >
      <article>
        {hasActiveRecall && (
          <div className="mb-2">
            <RecallFlag />
          </div>
        )}

        <h3 className="font-semibold text-base mb-2 line-clamp-2">
          {productName}
        </h3>

        <div className="flex items-center gap-4 text-sm mb-2">
          <div>
            <span className="text-muted-foreground">Safety: </span>
            <span className={`font-bold ${getScoreColor(safetyScore)}`}>
              {safetyScore}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Dev: </span>
            <span className={`font-bold ${getScoreColor(developmentScore)}`}>
              {developmentScore}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatAgeRange(ageRange.minMonths, ageRange.maxMonths)}</span>
          {category && (
            <>
              <span>·</span>
              <span>{category.title}</span>
            </>
          )}
        </div>
      </article>
    </Link>
  );
}
