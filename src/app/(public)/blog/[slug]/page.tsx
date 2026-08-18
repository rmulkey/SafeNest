import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { sanityClient } from "@/lib/sanity/client";
import { blogPostBySlugQuery } from "@/lib/sanity/queries";
import { SITE_URL } from "@/lib/seo/site-config";
import { NewsletterForm } from "@/components/newsletter/NewsletterForm";
import { generateOpenGraphMeta } from "@/components/seo/OpenGraphMeta";
import { JsonLd } from "@/components/seo/JsonLd";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { generateBlogPostingJsonLd } from "@/lib/seo/structured-data";
import { ArticleBody, type PortableBlock } from "@/components/content/ArticleBody";

interface BlogPost {
  _id: string;
  title: string;
  slug: { current: string };
  publishedAt: string;
  excerpt?: string;
  body: PortableBlock[];
  author: string;
}

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await sanityClient.fetch<BlogPost | null>(blogPostBySlugQuery, {
    slug,
  });

  if (!post) {
    return { title: "Post Not Found" };
  }

  // Only append the brand suffix when there's room for it. Long editorial titles
  // already exceed what Google displays (~60 chars); adding a suffix guarantees
  // the distinctive part of the headline gets truncated away.
  const SUFFIX = " | SafeNest Toys";
  const title =
    post.title.length + SUFFIX.length <= 60 ? `${post.title}${SUFFIX}` : post.title;
  const description =
    post.excerpt ||
    post.body?.[0]?.children?.map((c) => c.text).join("").slice(0, 155) ||
    `Read "${post.title}" on the SafeNest Toys blog.`;
  const url = `${SITE_URL}/blog/${slug}`;
  const og = generateOpenGraphMeta({ title, description, url, type: "article" });
  const ogImages = Array.isArray(og.openGraph?.images)
    ? og.openGraph.images
    : undefined;

  return {
    title,
    description,
    // Reuse the shared helper for canonical + twitter + og:image, then declare
    // openGraph explicitly. Spreading the helper's openGraph would widen the
    // discriminated union and lose the required `type: "article"` literal.
    alternates: og.alternates,
    twitter: og.twitter,
    openGraph: {
      title,
      description,
      url,
      type: "article",
      siteName: "SafeNest Toys",
      images: ogImages,
      ...(post.publishedAt ? { publishedTime: post.publishedAt } : {}),
      ...(post.author ? { authors: [post.author] } : {}),
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  "use cache";
  cacheLife("days");

  const { slug } = await params;
  cacheTag(`blog-post-${slug}`);

  const post = await sanityClient.fetch<BlogPost | null>(blogPostBySlugQuery, {
    slug,
  });

  if (!post) {
    notFound();
  }

  const postUrl = `${SITE_URL}/blog/${slug}`;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <JsonLd
        data={generateBlogPostingJsonLd({
          title: post.title,
          description: post.excerpt,
          url: postUrl,
          datePublished: post.publishedAt,
          author: post.author,
          publisherUrl: SITE_URL,
        })}
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: SITE_URL },
          { name: "Blog", url: `${SITE_URL}/blog` },
          { name: post.title, url: postUrl },
        ]}
      />
      <article>
        <header className="mb-10 border-b border-border pb-8">
          <Link
            href="/blog"
            className="text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            ← Back to Blog
          </Link>
          <h1 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-tight">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              {post.excerpt}
            </p>
          )}
          <div className="mt-5 flex items-center gap-3 text-sm text-muted-foreground">
            {post.author && (
              <span className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                  {post.author
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <span className="font-medium text-foreground">{post.author}</span>
              </span>
            )}
            {post.publishedAt && (
              <>
                <span aria-hidden="true">·</span>
                <time dateTime={post.publishedAt}>
                  {new Date(post.publishedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
              </>
            )}
          </div>
        </header>

        {/* Rich text body rendering */}
        <ArticleBody body={post.body} className="text-foreground/80" />
      </article>

      {/* Newsletter inline signup */}
      <section
        aria-labelledby="post-newsletter-heading"
        className="mt-16 rounded-2xl border border-secondary-200/60 bg-gradient-to-br from-secondary-50 to-primary-50 p-6 md:p-8"
      >
        <h2
          id="post-newsletter-heading"
          className="text-lg font-semibold text-foreground"
        >
          Enjoyed this article?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Subscribe to get the latest toy safety news and reviews delivered to
          your inbox.
        </p>
        <div className="mt-4">
          <NewsletterForm variant="inline" />
        </div>
      </section>
    </main>
  );
}
