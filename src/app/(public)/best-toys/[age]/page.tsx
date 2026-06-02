import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  AGE_MONTHS,
  getReviewsByAge,
  hasEnoughReviews,
  formatAgeLabel,
} from "@/lib/seo/programmatic-pages";
import { generateOpenGraphMeta } from "@/components/seo/OpenGraphMeta";
import { SITE_URL } from "@/lib/seo/site-config";
import { InternalLinks } from "@/components/seo/InternalLinks";
import { ComparisonTable } from "@/components/reviews/ComparisonTable";
import { computeAwards } from "@/components/reviews/AwardBadge";

export async function generateStaticParams() {
  const params: Array<{ age: string }> = [];

  for (const age of AGE_MONTHS) {
    const reviews = await getReviewsByAge(age);
    if (hasEnoughReviews(reviews)) {
      params.push({ age: String(age) });
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
  const label = formatAgeLabel(Number(age));

  const title = `Best Toys for ${label} | SafeNest Toys`;
  const description = `Discover the safest and most developmentally appropriate toys for babies and toddlers at ${label}. Expert safety reviews and scores.`;

  return {
    title,
    description,
    ...generateOpenGraphMeta({
      title,
      description,
      url: `${SITE_URL}/best-toys/${age}`,
    }),
  };
}

export default async function BestToysForAgePage({
  params,
}: {
  params: Promise<{ age: string }>;
}) {
  const { age } = await params;
  const ageMonths = Number(age);
  const reviews = await getReviewsByAge(ageMonths);

  if (!hasEnoughReviews(reviews)) {
    notFound();
  }

  const label = formatAgeLabel(ageMonths);
  const awards = computeAwards(reviews);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Best Toys for {label}</h1>
      <p className="text-muted-foreground mb-8">
        {reviews.length} expert-reviewed toys suitable for {label} old, sorted
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
