import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  getReviewsByToyType,
  getValidToyTypeParams,
  getToyTypeFromSlug,
  hasEnoughReviews,
} from "@/lib/seo/programmatic-pages";
import { generateOpenGraphMeta } from "@/components/seo/OpenGraphMeta";
import { SITE_URL } from "@/lib/seo/site-config";
import { InternalLinks } from "@/components/seo/InternalLinks";
import { formatAgeRange } from "@/lib/content/format-age";
import { ProductThumb } from "@/components/reviews/ProductThumb";
import { RecallFlag } from "@/components/recalls/RecallFlag";

export async function generateStaticParams() {
  return getValidToyTypeParams();
}

/**
 * Sentence-cases a material name for headings and <title>.
 *
 * Material values are stored lowercase ("wood") except where they start with an
 * acronym ("BPA-free plastic"), so only the first character is touched — upper-
 * casing the whole string would mangle those.
 */
function toDisplayType(toyType: string): string {
  return toyType.charAt(0).toUpperCase() + toyType.slice(1);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ toyType: string }>;
}): Promise<Metadata> {
  const { toyType: toyTypeSlug } = await params;
  const toyType = await getToyTypeFromSlug(toyTypeSlug);

  if (!toyType) {
    return { title: "Not Found" };
  }

  // Same 60-char budget as the review pages. Long material names such as
  // "UV-stabilized polyethylene" push the branded form past what Google renders,
  // so the suffix is dropped rather than letting the material name be cut.
  const baseTitle = `${toDisplayType(toyType)} Toys: Safety Reviews`;
  const TITLE_SUFFIX = " | SafeNest Toys";
  const title =
    baseTitle.length + TITLE_SUFFIX.length <= 60
      ? `${baseTitle}${TITLE_SUFFIX}`
      : baseTitle;
  const description = `Parent-researched reviews of ${toyType.toLowerCase()} toys for babies and toddlers, with SafeNest's editorial safety assessment, choking-risk notes and recall checks.`;

  return {
    title,
    description,
    ...generateOpenGraphMeta({
      title,
      description,
      url: `${SITE_URL}/safe-toys/${toyTypeSlug}`,
    }),
  };
}

export default async function SafeToyTypePage({
  params,
}: {
  params: Promise<{ toyType: string }>;
}) {
  const { toyType: toyTypeSlug } = await params;
  const toyType = await getToyTypeFromSlug(toyTypeSlug);

  if (!toyType) {
    notFound();
  }

  const reviews = await getReviewsByToyType(toyType);

  if (!hasEnoughReviews(reviews)) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">
        {toDisplayType(toyType)} Toys: Safety Reviews
      </h1>
      <p className="text-muted-foreground mb-8">
        {reviews.length} parent-researched {toyType.toLowerCase()} toys, sorted by
        SafeNest&apos;s editorial safety score. Each entry records what we found on
        choking risk, material information and recall history.
      </p>

      <div className="grid gap-6">
        {reviews.map((review) => (
          <Link
            key={review._id}
            href={`/reviews/${review.slug.current}`}
            className="block rounded-lg border p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-4">
                <ProductThumb
                  mainImage={review.mainImage}
                  productName={review.productName}
                  size={72}
                />
                <div className="min-w-0">
                  <h2 className="text-xl font-semibold">{review.productName}</h2>
                  {review.category && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {review.category.title}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    Ages:{" "}
                    {formatAgeRange(
                      review.ageRange.minMonths,
                      review.ageRange.maxMonths
                    )}
                  </p>
                </div>
              </div>
              <div className="flex gap-4 shrink-0">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-700">
                    {review.safetyScore}
                  </div>
                  <div className="text-xs text-muted-foreground">Safety</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-700">
                    {review.developmentScore}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Development
                  </div>
                </div>
              </div>
            </div>
            {review.hasActiveRecall && (
              <div className="mt-3">
                <RecallFlag detail="see the review before buying" />
              </div>
            )}
          </Link>
        ))}
      </div>

      <InternalLinks currentDocId={`programmatic-safe-${toyTypeSlug}`} />
    </main>
  );
}
