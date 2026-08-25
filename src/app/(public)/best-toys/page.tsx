import type { Metadata } from "next";
import Link from "next/link";
import {
  AGE_SLUG_TO_MONTHS,
  CANONICAL_AGE_SLUGS,
  getReviewsByAge,
  hasEnoughReviews,
  formatAgeParamLabel,
} from "@/lib/seo/programmatic-pages";
import { generateOpenGraphMeta } from "@/components/seo/OpenGraphMeta";
import { SITE_URL } from "@/lib/seo/site-config";
import { EmptyState } from "@/components/ui/EmptyState";

const BEST_TOYS_DESCRIPTION =
  "Compare developmentally appropriate toys by age, from newborn to 3 years and up, using parent-researched reviews built on publicly available product and recall information.";

export const metadata: Metadata = {
  title: "Best Toys by Age | SafeNest Toys",
  description: BEST_TOYS_DESCRIPTION,
  ...generateOpenGraphMeta({
    title: "Best Toys by Age | SafeNest Toys",
    description: BEST_TOYS_DESCRIPTION,
    url: `${SITE_URL}/best-toys`,
  }),
};

interface AgePageLink {
  slug: string;
  label: string;
  reviewCount: number;
}

export default async function BestToysLandingPage() {
  const agePages: AgePageLink[] = [];

  // Only the canonical age slugs, which are also the only ones in the sitemap.
  // Iterating raw month counts instead sent four of these cards to
  // `/best-toys/6`, `/12`, `/24` and `/36` — self-canonical near-duplicates
  // that the sitemap omits — while skipping `2-3-years` and `3-plus-years`
  // entirely, because neither 30 nor 42 months is in AGE_MONTHS.
  for (const slug of CANONICAL_AGE_SLUGS) {
    const reviews = await getReviewsByAge(AGE_SLUG_TO_MONTHS[slug]);
    if (hasEnoughReviews(reviews)) {
      agePages.push({
        slug,
        label: formatAgeParamLabel(slug),
        reviewCount: reviews.length,
      });
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Best Toys by Age</h1>
      <p className="text-muted-foreground mb-8">
        Compare developmentally appropriate toys for your child&apos;s age. Our
        parent-researched reviews record SafeNest&apos;s editorial safety score
        alongside what we found on choking risk, materials, recall history and
        developmental value.
      </p>

      {agePages.length === 0 ? (
        <EmptyState
          title="No age pages yet"
          body="These build themselves once there are enough reviews in an age band to compare fairly."
          action={{ href: "/reviews", label: "Browse the reviews" }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agePages.map((page) => (
            <Link
              key={page.slug}
              href={`/best-toys/${page.slug}`}
              className="block rounded-lg border p-6 hover:shadow-md transition-shadow text-center"
            >
              <h2>
                <span className="block text-sm font-normal text-muted-foreground">
                  Best toys for
                </span>
                <span className="block text-2xl font-bold text-primary">
                  {page.label}
                </span>
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                {page.reviewCount} reviewed toys
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
