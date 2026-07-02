import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, LayoutGrid } from "lucide-react";
import { sanityClient } from "@/lib/sanity/client";
import { allCategoriesQuery } from "@/lib/sanity/queries";
import { generateOpenGraphMeta } from "@/components/seo/OpenGraphMeta";
import { SITE_URL } from "@/lib/seo/site-config";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";

export const metadata: Metadata = {
  title: "Toy Categories | SafeNest Toys",
  description:
    "Browse safety-reviewed toys by category — building, sensory, outdoor, educational, and more. Every toy is independently safety-scored by SafeNest Toys.",
  alternates: { canonical: `${SITE_URL}/categories` },
  ...generateOpenGraphMeta({
    title: "Toy Categories | SafeNest Toys",
    description:
      "Browse safety-reviewed toys by category — building, sensory, outdoor, educational, and more. Every toy is independently safety-scored by SafeNest Toys.",
    url: `${SITE_URL}/categories`,
  }),
};

interface CategoryListItem {
  _id: string;
  title: string;
  slug: { current: string };
  description?: string;
}

export default async function CategoriesIndexPage() {
  const categories =
    await sanityClient.fetch<CategoryListItem[]>(allCategoriesQuery);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 lg:px-8">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: SITE_URL },
          { name: "Categories", url: `${SITE_URL}/categories` },
        ]}
      />

      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          Toy Categories
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Explore our independently safety-scored reviews grouped by category.
          Pick a category to see every toy we&apos;ve tested in it.
        </p>
      </header>

      {categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
          <h2 className="text-xl font-semibold text-foreground">
            Categories coming soon
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We&apos;re organizing our reviews into categories now — check back
            shortly, or{" "}
            <Link href="/reviews" className="text-primary-600 underline">
              browse all reviews
            </Link>
            .
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <li key={category._id}>
              <Link
                href={`/categories/${category.slug.current}`}
                className="group flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary-200 hover:shadow-lg"
              >
                <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-primary-50 text-primary-600 group-hover:bg-primary-100 transition-colors">
                  <LayoutGrid className="size-5" aria-hidden="true" />
                </div>
                <h2 className="text-lg font-medium text-card-foreground transition-colors group-hover:text-primary-600">
                  {category.title}
                </h2>
                {category.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {category.description}
                  </p>
                )}
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600">
                  View reviews
                  <ArrowRight
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
