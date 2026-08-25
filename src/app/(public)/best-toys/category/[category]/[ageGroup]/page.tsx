import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  getReviewsByCategoryAndAgeGroup,
  getValidCategoryAgeParams,
  getCategoryBySlug,
  getAgeGroupBySlug,
  hasEnoughReviews,
} from "@/lib/seo/programmatic-pages";
import { generateOpenGraphMeta } from "@/components/seo/OpenGraphMeta";
import { SITE_URL } from "@/lib/seo/site-config";
import { InternalLinks } from "@/components/seo/InternalLinks";
import { formatAgeRange } from "@/lib/content/format-age";
import { BuyButton } from "@/components/affiliate/BuyButton";
import { ProductThumb } from "@/components/reviews/ProductThumb";
import { RecallFlag } from "@/components/recalls/RecallFlag";
import { AffiliateDisclosure } from "@/components/affiliate/AffiliateDisclosure";

/** Fallback tag for legacy links stored without one. */
const AMAZON_TAG = "safeneststore-20";

export async function generateStaticParams() {
  return getValidCategoryAgeParams();
}

/**
 * Category titles already read as "Sensory Toys", "Building Toys", and so on,
 * so appending "Toys" unconditionally produced "Best Sensory Toys Toys for …".
 * Only add the noun when the title does not already carry it.
 */
function withToysSuffix(categoryTitle: string): string {
  return /\btoys$/i.test(categoryTitle.trim())
    ? categoryTitle
    : `${categoryTitle} Toys`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; ageGroup: string }>;
}): Promise<Metadata> {
  const { category, ageGroup } = await params;
  const categoryData = await getCategoryBySlug(category);
  const ageGroupData = getAgeGroupBySlug(ageGroup);

  if (!categoryData || !ageGroupData) {
    return { title: "Not Found" };
  }

  const title = `Best ${withToysSuffix(categoryData.title)} for ${ageGroupData.label} | SafeNest Toys`;
  const description = `Parent-researched reviews of ${categoryData.title.toLowerCase()} for babies and toddlers aged ${ageGroupData.label}, with SafeNest's editorial safety and development scores.`;

  return {
    title,
    description,
    ...generateOpenGraphMeta({
      title,
      description,
      url: `${SITE_URL}/best-toys/category/${category}/${ageGroup}`,
    }),
  };
}

export default async function BestCategoryToysForAgeGroupPage({
  params,
}: {
  params: Promise<{ category: string; ageGroup: string }>;
}) {
  const { category, ageGroup } = await params;
  const categoryData = await getCategoryBySlug(category);
  const ageGroupData = getAgeGroupBySlug(ageGroup);

  if (!categoryData || !ageGroupData) {
    notFound();
  }

  const reviews = await getReviewsByCategoryAndAgeGroup(
    categoryData._id,
    ageGroupData.minMonths,
    ageGroupData.maxMonths
  );

  if (!hasEnoughReviews(reviews)) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Visible breadcrumb. This is the deepest route on the site and it
          previously rendered no upward link at all — no route to the category,
          none to the age band, none to the hub. */}
      <nav className="mb-6 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/best-toys" className="hover:text-foreground">
          Best Toys by Age
        </Link>
        <span className="mx-2" aria-hidden="true">
          /
        </span>
        <Link href={`/categories/${category}`} className="hover:text-foreground">
          {categoryData.title}
        </Link>
        <span className="mx-2" aria-hidden="true">
          /
        </span>
        <span className="text-foreground">{ageGroupData.label}</span>
      </nav>

      <h1 className="text-3xl font-bold mb-2">
        Best {withToysSuffix(categoryData.title)} for {ageGroupData.label}
      </h1>
      <p className="text-muted-foreground mb-8">
        {reviews.length} parent-researched{" "}
        {categoryData.title.toLowerCase()} suitable for ages{" "}
        {ageGroupData.label.toLowerCase()}, sorted by SafeNest&apos;s editorial
        safety score.
      </p>

      <div className="grid gap-6">
        {reviews.map((review) => {
          const link = review.affiliateLinks?.[0];
          return (
          <div
            key={review._id}
            className="rounded-lg border hover:shadow-md transition-shadow"
          >
          {/* Card body links to the review; the buy button is a sibling, because
              an interactive control cannot nest inside an anchor. */}
          <Link
            href={`/reviews/${review.slug.current}`}
            className="block p-6"
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
          {link && (
            <div className="border-t px-6 py-4">
              <BuyButton
                url={link.url}
                tag={link.tag || AMAZON_TAG}
                size="sm"
                productId={review.slug.current}
              />
            </div>
          )}
          </div>
          );
        })}
      </div>
      {/* One disclosure for the page, adjacent to the buy buttons above. */}
      <AffiliateDisclosure className="mt-4" />

      <InternalLinks
        currentDocId={`programmatic-category-${category}-${ageGroup}`}
        categoryId={categoryData._id}
        ageRange={{
          minMonths: ageGroupData.minMonths,
          maxMonths: ageGroupData.maxMonths,
        }}
      />
    </div>
  );
}
