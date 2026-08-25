import type { Metadata } from "next";
import Link from "next/link";
import { sanityClient } from "@/lib/sanity/client";
import {
  allBlogPostsQuery,
  blogPostCountQuery,
  seasonalBlogPostsQuery,
} from "@/lib/sanity/queries";
import { selectInSeason, type SeasonalWindow } from "@/lib/content/seasonal";
import { generateOpenGraphMeta } from "@/components/seo/OpenGraphMeta";
import { SITE_URL } from "@/lib/seo/site-config";
import { NewsletterForm } from "@/components/newsletter/NewsletterForm";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Toy Safety Blog — Guides & Research | SafeNest Toys",
  description:
    "Read the latest articles on toy safety, developmental play, and parenting tips from the SafeNest Toys editorial team.",
  alternates: {
    canonical: `${SITE_URL}/blog`,
  },
  ...generateOpenGraphMeta({
    title: "Toy Safety Blog — Guides & Research | SafeNest Toys",
    description:
      "Read the latest articles on toy safety, developmental play, and parenting tips from the SafeNest Toys editorial team.",
    url: `${SITE_URL}/blog`,
  }),
};

const POSTS_PER_PAGE = 20;

interface BlogPost {
  _id: string;
  title: string;
  slug: { current: string };
  publishedAt: string;
  excerpt: string;
  author: string;
  seasonal?: Partial<SeasonalWindow>;
}

interface BlogPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams;
  const currentPage = Math.max(1, Number(params.page) || 1);
  const start = (currentPage - 1) * POSTS_PER_PAGE;
  const end = start + POSTS_PER_PAGE;

  const [posts, totalCount, seasonalCandidates] = await Promise.all([
    sanityClient.fetch<BlogPost[]>(allBlogPostsQuery, { start, end }),
    sanityClient.fetch<number>(blogPostCountQuery),
    sanityClient.fetch<BlogPost[]>(seasonalBlogPostsQuery),
  ]);

  const totalPages = Math.ceil(totalCount / POSTS_PER_PAGE);

  // Feature seasonal posts only while their annually recurring window is open.
  // Out-of-season posts are NOT removed — they stay in the chronological archive
  // below (and in the sitemap), they just aren't promoted. Only shown on page 1.
  const inSeason = currentPage === 1 ? selectInSeason(seasonalCandidates) : [];
  const featuredIds = new Set(inSeason.map((p) => p._id));

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        Blog
      </h1>

      {inSeason.length > 0 && (
        <section aria-labelledby="in-season-heading" className="mb-12">
          <h2
            id="in-season-heading"
            className="mb-4 text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400"
          >
            In season now
          </h2>
          <ul className="space-y-4">
            {inSeason.map((post) => (
              <li key={post._id}>
                <article className="group rounded-lg border border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
                  <Link
                    href={`/blog/${post.slug.current}`}
                    className="block space-y-2"
                  >
                    <h3 className="text-lg font-semibold text-zinc-900 group-hover:text-emerald-700 dark:text-zinc-50 dark:group-hover:text-emerald-400">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {post.excerpt}
                      </p>
                    )}
                  </Link>
                </article>
              </li>
            ))}
          </ul>
        </section>
      )}

      {posts.length === 0 ? (
        <EmptyState
          title="Nothing posted yet"
          body="We write these as questions come up in our own house, so they arrive in bursts."
          action={{ href: "/reviews", label: "Browse the reviews" }}
        />
      ) : (
        <ul className="space-y-8">
          {posts
            .filter((post) => !featuredIds.has(post._id))
            .map((post) => (
            <li key={post._id}>
              <article className="group">
                <Link
                  href={`/blog/${post.slug.current}`}
                  className="block space-y-2"
                >
                  <h2 className="text-xl font-semibold text-zinc-900 group-hover:text-blue-600 dark:text-zinc-50 dark:group-hover:text-blue-400">
                    {post.title}
                  </h2>
                  <time
                    dateTime={post.publishedAt}
                    className="text-sm text-zinc-500 dark:text-zinc-400"
                  >
                    {new Date(post.publishedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                  {post.excerpt && (
                    <p className="text-zinc-600 dark:text-zinc-400">
                      {post.excerpt}
                    </p>
                  )}
                </Link>
              </article>
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          aria-label="Blog pagination"
          className="mt-12 flex items-center justify-center gap-4"
        >
          {currentPage > 1 && (
            <Link
              href={`/blog?page=${currentPage - 1}`}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Previous
            </Link>
          )}
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            Page {currentPage} of {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link
              href={`/blog?page=${currentPage + 1}`}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Next
            </Link>
          )}
        </nav>
      )}

      {/* Newsletter inline signup */}
      <section
        aria-labelledby="newsletter-heading"
        className="mt-16 rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-900"
      >
        <h2
          id="newsletter-heading"
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Stay updated on toy safety
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Get the latest safety alerts, reviews, and parenting tips delivered to
          your inbox.
        </p>
        <div className="mt-4">
          <NewsletterForm variant="inline" />
        </div>
      </section>
    </div>
  );
}
