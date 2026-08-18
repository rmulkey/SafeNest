import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PackageOpen, ArrowRight } from "lucide-react";
import { sanityClient } from "@/lib/sanity/client";
import { urlForImage } from "@/lib/sanity/client";
import {
  categoryBySlugQuery,
  toyReviewsByCategoryQuery,
  toyReviewCountByCategoryQuery,
} from "@/lib/sanity/queries";
import { generateOpenGraphMeta } from "@/components/seo/OpenGraphMeta";
import { SITE_URL } from "@/lib/seo/site-config";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { BuyButton } from "@/components/affiliate/BuyButton";
import { AwardBadge, computeAwards } from "@/components/reviews/AwardBadge";
import type { ToyReviewSummary } from "@/lib/seo/programmatic-pages";
import { formatAgeRange } from "@/lib/content/format-age";

const AMAZON_TAG = "safeneststore-20";

const REVIEWS_PER_PAGE = 20;

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

interface Category {
  _id: string;
  title: string;
  slug: { current: string };
  description?: string;
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await sanityClient.fetch<Category | null>(
    categoryBySlugQuery,
    { slug }
  );

  if (!category) {
    return { title: "Category Not Found" };
  }

  const title = `${category.title} - Toy Reviews | SafeNest Toys`;
  const description =
    category.description ||
    `Browse parent-researched ${category.title.toLowerCase()} toy reviews, with SafeNest's editorial safety and development scores.`;

  return {
    title,
    description,
    ...generateOpenGraphMeta({
      title,
      description,
      url: `${SITE_URL}/categories/${slug}`,
    }),
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { slug } = await params;
  const { page } = await searchParams;

  const category = await sanityClient.fetch<Category | null>(
    categoryBySlugQuery,
    { slug }
  );

  if (!category) {
    notFound();
  }

  const currentPage = Math.max(1, parseInt(page || "1", 10) || 1);
  const start = (currentPage - 1) * REVIEWS_PER_PAGE;
  const end = start + REVIEWS_PER_PAGE;

  const [reviews, totalCount] = await Promise.all([
    sanityClient.fetch<ToyReviewSummary[]>(toyReviewsByCategoryQuery, {
      categoryId: category._id,
      start,
      end,
    }),
    sanityClient.fetch<number>(toyReviewCountByCategoryQuery, {
      categoryId: category._id,
    }),
  ]);

  const totalPages = Math.ceil(totalCount / REVIEWS_PER_PAGE);
  const awards = computeAwards(reviews);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: SITE_URL },
          { name: "Categories", url: `${SITE_URL}/categories` },
          { name: category.title, url: `${SITE_URL}/categories/${slug}` },
        ]}
      />
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {category.title}
        </h1>
        {category.description && (
          <p className="mt-2 text-base text-muted-foreground">
            {category.description}
          </p>
        )}
      </header>

      {reviews.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-secondary-50">
            <PackageOpen className="size-8 text-primary-600" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            No reviews here yet
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            We haven&apos;t published any {category.title.toLowerCase()} reviews
            so far. It&apos;s on our list — in the meantime, here&apos;s
            everything else we&apos;ve written up.
          </p>
          <Link
            href="/reviews"
            className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700"
          >
            Browse all reviews
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => {
              const award = awards[review._id];
              const link = review.affiliateLinks?.[0];
              return (
                <li
                  key={review._id}
                  className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
                >
                  <Link
                    href={`/reviews/${review.slug.current}`}
                    className="group block p-4"
                  >
                    <div className="relative mb-3 aspect-square w-24 overflow-hidden rounded-lg bg-muted">
                      {award && (
                        <span className="absolute left-1.5 top-1.5 z-10">
                          <AwardBadge variant={award} size="sm" />
                        </span>
                      )}
                      {review.mainImage ? (
                        <Image
                          src={urlForImage(review.mainImage)
                            .width(192)
                            .height(192)
                            .url()}
                          alt={review.mainImage.alt || review.productName}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          sizes="96px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl">
                          🧸
                        </div>
                      )}
                    </div>
                    <h2 className="text-lg font-semibold text-foreground group-hover:text-primary-600 transition-colors">
                      {review.productName}
                    </h2>
                    <dl className="mt-3 space-y-1 text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <dt>Safety Score</dt>
                        <dd className="font-medium text-foreground">
                          {review.safetyScore}/100
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Development Score</dt>
                        <dd className="font-medium text-foreground">
                          {review.developmentScore}/100
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Age Range</dt>
                        <dd className="font-medium text-foreground">
                          {formatAgeRange(
                            review.ageRange.minMonths,
                            review.ageRange.maxMonths
                          )}
                        </dd>
                      </div>
                    </dl>
                    {review.hasActiveRecall && (
                      <p className="mt-2 text-xs font-medium text-red-600">
                        ⚠ Active Recall
                      </p>
                    )}
                  </Link>
                  {link && (
                    <div className="mt-auto px-4 pb-4">
                      <BuyButton
                        url={link.url}
                        tag={link.tag || AMAZON_TAG}
                        size="sm"
                        label="Check Price"
                        className="w-full"
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {totalPages > 1 && (
            <nav
              aria-label="Pagination"
              className="mt-8 flex items-center justify-center gap-4"
            >
              {currentPage > 1 ? (
                <Link
                  href={`/categories/${slug}?page=${currentPage - 1}`}
                  className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Previous
                </Link>
              ) : (
                <span className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground opacity-50">
                  Previous
                </span>
              )}

              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>

              {currentPage < totalPages ? (
                <Link
                  href={`/categories/${slug}?page=${currentPage + 1}`}
                  className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Next
                </Link>
              ) : (
                <span className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground opacity-50">
                  Next
                </span>
              )}
            </nav>
          )}
        </>
      )}
    </main>
  );
}
