import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import { sanityClient, urlForImage } from "@/lib/sanity/client";
import { generateOpenGraphMeta } from "@/components/seo/OpenGraphMeta";
import { SITE_URL } from "@/lib/seo/site-config";
import { ScoreBadge } from "@/components/reviews/ScoreBadge";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";

export const metadata: Metadata = {
  title: "All Toy Safety Reviews | SafeNest Toys",
  description:
    "Browse every toy with a SafeNest editorial safety assessment — material information, choking-risk research, recall checks, and developmental value, researched by parents.",
  alternates: { canonical: `${SITE_URL}/reviews` },
  ...generateOpenGraphMeta({
    title: "All Toy Safety Reviews | SafeNest Toys",
    description:
      "Browse every toy with a SafeNest editorial safety assessment — material information, choking-risk research, recall checks, and developmental value, researched by parents.",
    url: `${SITE_URL}/reviews`,
  }),
};

interface ReviewListItem {
  _id: string;
  productName: string;
  slug: { current: string };
  ageRange: { minMonths: number; maxMonths: number };
  safetyScore: number;
  developmentScore: number;
  category: { title: string; slug: { current: string } } | null;
  hasActiveRecall: boolean;
  mainImage?: { asset: { _ref: string }; alt?: string };
}

// All reviews, highest safety score first. Includes mainImage + category for
// rich cards (the shared allToyReviewsQuery omits mainImage, so query inline).
const reviewsIndexQuery = `*[_type == "toyReview"] | order(safetyScore desc) {
  _id,
  productName,
  slug,
  ageRange,
  safetyScore,
  developmentScore,
  category->{title, slug},
  hasActiveRecall,
  mainImage
}`;

function formatAgeRange(minMonths: number, maxMonths: number): string {
  const fmt = (m: number) =>
    m < 12 ? `${m}mo` : Number.isInteger(m / 12) ? `${m / 12}yr` : `${m}mo`;
  return `${fmt(minMonths)} – ${fmt(maxMonths)}`;
}

export default async function ReviewsIndexPage() {
  const reviews = await sanityClient.fetch<ReviewListItem[]>(reviewsIndexQuery);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 md:px-6 lg:px-8">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: SITE_URL },
          { name: "Reviews", url: `${SITE_URL}/reviews` },
        ]}
      />

      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          All Toy Safety Reviews
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Every toy below has received a SafeNest editorial safety assessment and has been
          checked against publicly available recall information. Scores are editorial
          research tools, not certifications or guarantees. Sorted by safety score, highest first.
        </p>
        <div className="mt-4 flex items-center gap-2 text-sm text-primary-700">
          <ShieldCheck className="size-4" aria-hidden="true" />
          <span>
            {reviews.length} {reviews.length === 1 ? "review" : "reviews"} and
            growing.
          </span>
        </div>
      </header>

      {reviews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
          <h2 className="text-xl font-semibold text-foreground">
            Reviews coming soon
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We&apos;re publishing safety-scored toy reviews now — check back
            shortly.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review) => (
            <li key={review._id}>
              <Link
                href={`/reviews/${review.slug.current}`}
                className="group flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary-200 hover:shadow-lg"
              >
                {review.mainImage ? (
                  <div className="relative mb-4 h-40 w-full overflow-hidden rounded-lg bg-muted">
                    <Image
                      src={urlForImage(review.mainImage)
                        .width(400)
                        .height(260)
                        .url()}
                      alt={review.mainImage.alt || review.productName}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                ) : (
                  <div className="mb-4 flex h-40 w-full items-center justify-center rounded-lg bg-muted text-4xl">
                    🧸
                  </div>
                )}

                <h2 className="text-lg font-medium text-card-foreground transition-colors group-hover:text-primary-600">
                  {review.productName}
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Ages: {formatAgeRange(review.ageRange.minMonths, review.ageRange.maxMonths)}
                  {review.category && <> · {review.category.title}</>}
                </p>

                <div className="mt-4 flex items-center gap-5">
                  <ScoreBadge score={review.safetyScore} label="Safety" size="sm" />
                  <ScoreBadge
                    score={review.developmentScore}
                    label="Development"
                    size="sm"
                  />
                </div>

                {review.hasActiveRecall && (
                  <span className="mt-3 inline-block rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                    Active Recall
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
