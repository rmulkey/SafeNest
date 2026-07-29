import Link from "next/link";
import Image from "next/image";
import { urlForImage } from "@/lib/sanity/client";
import { BuyButton } from "@/components/affiliate/BuyButton";
import { AwardBadge, type AwardVariant } from "@/components/reviews/AwardBadge";
import type { ToyReviewSummary } from "@/lib/seo/programmatic-pages";
import { formatAgeRange } from "@/lib/content/format-age";

const AMAZON_TAG = "safeneststore-20";

interface ComparisonTableProps {
  reviews: ToyReviewSummary[];
  awards: Record<string, AwardVariant>;
}

function primaryAffiliateLink(review: ToyReviewSummary) {
  return review.affiliateLinks?.[0] ?? null;
}

function ProductThumb({
  review,
  size,
}: {
  review: ToyReviewSummary;
  size: number;
}) {
  if (!review.mainImage) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <span className="text-lg">🧸</span>
      </div>
    );
  }

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-lg bg-muted"
      style={{ width: size, height: size }}
    >
      <Image
        src={urlForImage(review.mainImage).width(size * 2).height(size * 2).url()}
        alt={review.mainImage.alt || review.productName}
        fill
        className="object-cover"
        sizes={`${size}px`}
      />
    </div>
  );
}

/**
 * Responsive comparison table for best-of pages. Renders a real table on sm+
 * screens and a stacked card list on small screens. Sorted by safetyScore desc.
 */
export function ComparisonTable({ reviews, awards }: ComparisonTableProps) {
  const sorted = [...reviews].sort((a, b) => b.safetyScore - a.safetyScore);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      {/* Table view — sm screens and up */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="px-4 py-3 font-medium">
                Product
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Age Range
              </th>
              <th scope="col" className="px-4 py-3 text-center font-medium">
                Safety
              </th>
              <th scope="col" className="px-4 py-3 text-center font-medium">
                Development
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Award
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Price
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((review) => {
              const link = primaryAffiliateLink(review);
              const award = awards[review._id];
              return (
                <tr
                  key={review._id}
                  className="border-b border-border/60 last:border-0 hover:bg-muted/40 transition-colors"
                >
                  <td className="px-4 py-4">
                    <Link
                      href={`/reviews/${review.slug.current}`}
                      className="group flex items-center gap-3"
                    >
                      <ProductThumb review={review} size={56} />
                      <span className="font-medium text-foreground group-hover:text-primary-600 transition-colors">
                        {review.productName}
                        {review.hasActiveRecall && (
                          <span className="mt-1 block text-xs font-medium text-red-600">
                            ⚠ Active recall
                          </span>
                        )}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground whitespace-nowrap">
                    {formatAgeRange(
                      review.ageRange.minMonths,
                      review.ageRange.maxMonths
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="font-semibold text-secondary-700">
                      {review.safetyScore}
                    </span>
                    <span className="text-muted-foreground">/100</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="font-semibold text-primary-700">
                      {review.developmentScore}
                    </span>
                    <span className="text-muted-foreground">/100</span>
                  </td>
                  <td className="px-4 py-4">
                    {award ? (
                      <AwardBadge variant={award} size="sm" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {link ? (
                      <BuyButton
                        url={link.url}
                        tag={link.tag || AMAZON_TAG}
                        size="sm"
                        label="Check Price"
                      />
                    ) : (
                      <Link
                        href={`/reviews/${review.slug.current}`}
                        className="text-sm font-medium text-primary-600 hover:text-primary-700"
                      >
                        View review →
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Stacked cards — below sm */}
      <ul className="divide-y divide-border sm:hidden">
        {sorted.map((review) => {
          const link = primaryAffiliateLink(review);
          const award = awards[review._id];
          return (
            <li key={review._id} className="p-4">
              <Link
                href={`/reviews/${review.slug.current}`}
                className="group flex items-start gap-3"
              >
                <ProductThumb review={review} size={64} />
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-foreground group-hover:text-primary-600 transition-colors">
                    {review.productName}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Ages{" "}
                    {formatAgeRange(
                      review.ageRange.minMonths,
                      review.ageRange.maxMonths
                    )}
                  </p>
                  {award && (
                    <span className="mt-2 inline-block">
                      <AwardBadge variant={award} size="sm" />
                    </span>
                  )}
                  {review.hasActiveRecall && (
                    <span className="mt-1 block text-xs font-medium text-red-600">
                      ⚠ Active recall
                    </span>
                  )}
                </div>
              </Link>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex gap-4 text-sm">
                  <span>
                    <span className="font-semibold text-secondary-700">
                      {review.safetyScore}
                    </span>
                    <span className="text-muted-foreground"> Safety</span>
                  </span>
                  <span>
                    <span className="font-semibold text-primary-700">
                      {review.developmentScore}
                    </span>
                    <span className="text-muted-foreground"> Dev</span>
                  </span>
                </div>
                {link ? (
                  <BuyButton
                    url={link.url}
                    tag={link.tag || AMAZON_TAG}
                    size="sm"
                    label="Check Price"
                  />
                ) : (
                  <Link
                    href={`/reviews/${review.slug.current}`}
                    className="text-sm font-medium text-primary-600 hover:text-primary-700"
                  >
                    View →
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
