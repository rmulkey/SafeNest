import type { Metadata } from "next";
import Link from "next/link";
import {
  AGE_MONTHS,
  canonicalAgeSlug,
  getReviewsByAge,
  hasEnoughReviews,
  formatAgeLabel,
} from "@/lib/seo/programmatic-pages";
import { generateOpenGraphMeta } from "@/components/seo/OpenGraphMeta";
import { SITE_URL } from "@/lib/seo/site-config";
import { EmptyState } from "@/components/ui/EmptyState";

const BEST_TOYS_DESCRIPTION =
  "Compare developmentally appropriate toys by age, from 3 to 36 months, using parent-researched reviews built on publicly available product and recall information.";

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
  age: number;
  label: string;
  reviewCount: number;
}

export default async function BestToysLandingPage() {
  const agePages: AgePageLink[] = [];

  for (const age of AGE_MONTHS) {
    const reviews = await getReviewsByAge(age);
    if (hasEnoughReviews(reviews)) {
      agePages.push({
        age,
        label: formatAgeLabel(age),
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
              key={page.age}
              // Link at the canonical spelling for this age so internal links
              // and <link rel="canonical"> agree.
              href={`/best-toys/${canonicalAgeSlug(String(page.age))}`}
              className="block rounded-lg border p-6 hover:shadow-md transition-shadow text-center"
            >
              <div className="text-4xl font-bold text-primary mb-2">
                {page.age}
              </div>
              <div className="text-sm text-muted-foreground mb-1">months</div>
              <h2 className="text-lg font-semibold mt-2">
                Best Toys for {page.label}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {page.reviewCount} reviewed toys
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
