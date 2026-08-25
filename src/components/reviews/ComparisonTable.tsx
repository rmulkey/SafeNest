import Link from "next/link";
import { BuyButton } from "@/components/affiliate/BuyButton";
import { AwardBadge, type AwardVariant } from "@/components/reviews/AwardBadge";
import { ProductThumb } from "@/components/reviews/ProductThumb";
import type { ToyReviewSummary } from "@/lib/seo/programmatic-pages";
import { formatAgeRange } from "@/lib/content/format-age";
import { RecallFlag } from "@/components/recalls/RecallFlag";

const AMAZON_TAG = "safeneststore-20";

interface ComparisonTableProps {
  reviews: ToyReviewSummary[];
  awards: Record<string, AwardVariant>;
  /**
   * What the table is comparing, e.g. "toys for 1–2 years". Used for the
   * caption and the scroll region's accessible name, so screen-reader users get
   * an identifiable table rather than an unnamed one.
   */
  caption: string;
}

function primaryAffiliateLink(review: ToyReviewSummary) {
  return review.affiliateLinks?.[0] ?? null;
}

/**
 * Responsive comparison table for best-of pages. Renders a real table on sm+
 * screens and a stacked card list on small screens. Sorted by safetyScore desc.
 */
export function ComparisonTable({ reviews, awards, caption }: ComparisonTableProps) {
  const sorted = [...reviews].sort((a, b) => b.safetyScore - a.safetyScore);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      {/*
        Table view — sm screens and up.

        The scroll container is focusable and labelled. Six columns including a
        thumbnail and a button overflow on small tablets, and an `overflow-x-auto`
        div with no tabindex leaves keyboard-only users unable to reach the
        off-screen columns at all (WCAG 2.1.1). `tabIndex={0}` makes the region
        scrollable with arrow keys; role + label make it an identifiable landmark
        rather than an anonymous scroll box.
      */}
      <div
        className="hidden sm:block overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label={`Comparison of ${caption}, scrollable`}
      >
        <table className="w-full text-sm">
          <caption className="sr-only">
            {`Comparison of ${caption}. Columns: product, age range, safety score, development score, award, price. Sorted by safety score, highest first.`}
          </caption>
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="px-4 py-3 font-medium">
                Product
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Age Range
              </th>
              {/* aria-sort: the table is always ordered by safety score, and
                  without this the reader has no way to know that. */}
              <th
                scope="col"
                className="px-4 py-3 text-center font-medium"
                aria-sort="descending"
              >
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
                  {/* th scope="row", not td: in a six-column table the product
                      name is the label every other cell is read against. As a
                      td, cell announcements lost that context entirely. */}
                  <th scope="row" className="px-4 py-4 text-left font-normal">
                    <Link
                      href={`/reviews/${review.slug.current}`}
                      className="group flex items-center gap-3"
                    >
                      <ProductThumb
                        mainImage={review.mainImage}
                        productName={review.productName}
                        size={56}
                      />
                      <span className="font-medium text-foreground group-hover:text-primary-600 transition-colors">
                        {review.productName}
                        {review.hasActiveRecall && (
                          <span className="mt-1 block">
                            <RecallFlag />
                          </span>
                        )}
                      </span>
                    </Link>
                  </th>
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
                <ProductThumb
                  mainImage={review.mainImage}
                  productName={review.productName}
                  size={64}
                />
                <div className="min-w-0 flex-1">
                  {/* h2, not h3: on /best-toys/[age] and the category+age pages
                      these cards are the only content headings under the page h1,
                      so h3 skipped a level. */}
                  <h2 className="font-medium text-foreground group-hover:text-primary-600 transition-colors">
                    {review.productName}
                  </h2>
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
                    <span className="mt-1 block">
                      <RecallFlag />
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
