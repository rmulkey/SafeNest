import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  AGE_MONTHS,
  AGE_SLUG_TO_MONTHS,
  resolveAgeParam,
  canonicalAgeSlug,
  formatAgeParamLabel,
  getReviewsByAge,
  hasEnoughReviews,
} from "@/lib/seo/programmatic-pages";
import { generateOpenGraphMeta } from "@/components/seo/OpenGraphMeta";
import { SITE_URL } from "@/lib/seo/site-config";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { InternalLinks } from "@/components/seo/InternalLinks";
import { ComparisonTable } from "@/components/reviews/ComparisonTable";
import { computeAwards } from "@/components/reviews/AwardBadge";

export async function generateStaticParams() {
  const params: Array<{ age: string }> = [];

  // Numeric age pages (e.g. /best-toys/3)
  for (const age of AGE_MONTHS) {
    const reviews = await getReviewsByAge(age);
    if (hasEnoughReviews(reviews)) {
      params.push({ age: String(age) });
    }
  }

  // Named age-range slugs used by the nav, homepage cards, and sitemap
  // (e.g. /best-toys/1-2-years). Only emit ones that have enough reviews.
  for (const [slug, months] of Object.entries(AGE_SLUG_TO_MONTHS)) {
    const reviews = await getReviewsByAge(months);
    if (hasEnoughReviews(reviews)) {
      params.push({ age: slug });
    }
  }

  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ age: string }>;
}): Promise<Metadata> {
  const { age } = await params;
  const label = formatAgeParamLabel(age);

  const title = `Best Toys for ${label} | SafeNest Toys`;
  const description = `Parent-researched toy reviews for babies and toddlers at ${label}, compared using publicly available product and recall information.`;

  return {
    title,
    description,
    ...generateOpenGraphMeta({
      title,
      description,
      // Several params resolve to the same age and render the same toys, so the
      // canonical points at one preferred slug per age instead of self-
      // referencing every spelling.
      url: `${SITE_URL}/best-toys/${canonicalAgeSlug(age)}`,
      useRouteImage: true,
    }),
  };
}

export default async function BestToysForAgePage({
  params,
}: {
  params: Promise<{ age: string }>;
}) {
  const { age } = await params;
  const ageMonths = resolveAgeParam(age);

  if (ageMonths === null) {
    notFound();
  }

  const reviews = await getReviewsByAge(ageMonths);

  if (!hasEnoughReviews(reviews)) {
    notFound();
  }

  const label = formatAgeParamLabel(age);
  const awards = computeAwards(reviews);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: SITE_URL },
          { name: "Best Toys by Age", url: `${SITE_URL}/best-toys` },
          { name: label, url: `${SITE_URL}/best-toys/${age}` },
        ]}
      />
      <h1 className="text-3xl font-bold mb-2">Best Toys for {label}</h1>
      <p className="text-muted-foreground mb-8">
        {reviews.length} parent-researched toys suitable for {label}, sorted
        by safety score.
      </p>

      <ComparisonTable reviews={reviews} awards={awards} />

      {/* Internal Links - Related Content (Requirement 4.3) */}
      <InternalLinks
        currentDocId={`programmatic-age-${age}`}
        ageRange={{ minMonths: ageMonths, maxMonths: ageMonths }}
      />
    </main>
  );
}
