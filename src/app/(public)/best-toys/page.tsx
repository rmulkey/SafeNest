import type { Metadata } from "next";
import Link from "next/link";
import {
  AGE_MONTHS,
  getReviewsByAge,
  hasEnoughReviews,
  formatAgeLabel,
} from "@/lib/seo/programmatic-pages";
import { generateOpenGraphMeta } from "@/components/seo/OpenGraphMeta";
import { SITE_URL } from "@/lib/seo/site-config";

export const metadata: Metadata = {
  title: "Best Toys by Age | SafeNest Toys",
  description:
    "Find the safest, most developmentally appropriate toys for your child's age. Expert safety reviews for babies and toddlers from 3 to 36 months.",
  ...generateOpenGraphMeta({
    title: "Best Toys by Age | SafeNest Toys",
    description:
      "Find the safest, most developmentally appropriate toys for your child's age. Expert safety reviews for babies and toddlers from 3 to 36 months.",
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
        Find the safest, most developmentally appropriate toys for your
        child&apos;s age. Our parent-researched reviews evaluate safety scores, choking
        hazards, materials, and developmental benefits.
      </p>

      {agePages.length === 0 ? (
        <p className="text-muted-foreground">
          No age-based toy guides are available yet. Check back soon!
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agePages.map((page) => (
            <Link
              key={page.age}
              href={`/best-toys/${page.age}`}
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
