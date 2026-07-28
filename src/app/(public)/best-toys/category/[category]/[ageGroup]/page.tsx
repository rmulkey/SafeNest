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

export async function generateStaticParams() {
  return getValidCategoryAgeParams();
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

  const title = `Best ${categoryData.title} Toys for ${ageGroupData.label} | SafeNest Toys`;
  const description = `Discover the safest ${categoryData.title.toLowerCase()} toys for babies and toddlers aged ${ageGroupData.label}. Expert safety reviews and developmental scores.`;

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
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">
        Best {categoryData.title} Toys for {ageGroupData.label}
      </h1>
      <p className="text-muted-foreground mb-8">
        {reviews.length} parent-researched {categoryData.title.toLowerCase()} toys
        suitable for {ageGroupData.label} old, sorted by safety score.
      </p>

      <div className="grid gap-6">
        {reviews.map((review) => (
          <Link
            key={review._id}
            href={`/reviews/${review.slug.current}`}
            className="block rounded-lg border p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{review.productName}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Ages: {review.ageRange.minMonths}–{review.ageRange.maxMonths}{" "}
                  months
                </p>
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
              <div className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-800">
                ⚠️ Active recall alert
              </div>
            )}
          </Link>
        ))}
      </div>

      <InternalLinks
        currentDocId={`programmatic-category-${category}-${ageGroup}`}
        categoryId={categoryData._id}
        ageRange={{
          minMonths: ageGroupData.minMonths,
          maxMonths: ageGroupData.maxMonths,
        }}
      />
    </main>
  );
}
