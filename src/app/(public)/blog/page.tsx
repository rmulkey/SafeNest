import type { Metadata } from "next";
import Link from "next/link";
import { sanityClient } from "@/lib/sanity/client";
import { allBlogPostsQuery, blogPostCountQuery } from "@/lib/sanity/queries";
import { generateOpenGraphMeta } from "@/components/seo/OpenGraphMeta";
import { SITE_URL } from "@/lib/seo/site-config";
import { NewsletterForm } from "@/components/newsletter/NewsletterForm";

export const metadata: Metadata = {
  title: "Toy Safety Blog - Expert Guides & Tips | SafeNest Toys",
  description:
    "Read the latest articles on toy safety, developmental play, and parenting tips from the SafeNest Toys editorial team.",
  alternates: {
    canonical: `${SITE_URL}/blog`,
  },
  ...generateOpenGraphMeta({
    title: "Toy Safety Blog - Expert Guides & Tips | SafeNest Toys",
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
}

interface BlogPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams;
  const currentPage = Math.max(1, Number(params.page) || 1);
  const start = (currentPage - 1) * POSTS_PER_PAGE;
  const end = start + POSTS_PER_PAGE;

  const [posts, totalCount] = await Promise.all([
    sanityClient.fetch<BlogPost[]>(allBlogPostsQuery, { start, end }),
    sanityClient.fetch<number>(blogPostCountQuery),
  ]);

  const totalPages = Math.ceil(totalCount / POSTS_PER_PAGE);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        Blog
      </h1>

      {posts.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">
          No blog posts yet. Check back soon!
        </p>
      ) : (
        <ul className="space-y-8">
          {posts.map((post) => (
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
    </main>
  );
}
