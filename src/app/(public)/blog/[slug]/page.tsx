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
import { BuyButton } from "@/components/affiliate/BuyButton";
import { AffiliateDisclosure } from "@/components/affiliate/AffiliateDisclosure";
import { ProductThumb } from "@/components/reviews/ProductThumb";
import { RecallFlag } from "@/components/recalls/RecallFlag";

/** Fallback tag for legacy links stored without one. */
const AMAZON_TAG = "safeneststore-20";

interface RelatedReview {
  _id: string;
  productName: string;
  slug: { current: string };
  brand?: string;
  safetyScore?: number;
  developmentScore?: number;
  ageRange?: { minMonths: number; maxMonths: number };
  mainImage?: { asset: { _ref: string }; alt?: string } | null;
  hasActiveRecall?: boolean;
  affiliateLinks?: { partnerId?: string; url: string; tag?: string }[] | null;
}

interface BlogPost {
  _id: string;
  title: string;
  slug: { current: string };
  publishedAt: string;
  excerpt?: string;
  body: PortableBlock[];
  author: string;
  relatedReviews?: RelatedReview[] | null;
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

  // Products this post covers. Empty for the explainer articles, which is why the
  // section below is conditional rather than always rendered.
  const picks = post.relatedReviews ?? [];

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

      {/* Products covered in this post.
          
          A roundup is the highest purchase-intent page type on an affiliate site,
          and these carried no buy path: each product mention linked to a review,
          so buying took an extra hop. Rendered from relatedReviews rather than
          from links in the body, so the CTA inherits BuyButton's
          rel="nofollow sponsored noopener" instead of the generic external-link
          treatment. Posts without the field — the explainer articles — render
          nothing, which is correct: a piece about button batteries should not
          try to sell anything. */}
      {picks.length > 0 && (
        <section aria-labelledby="post-picks-heading" className="mt-12">
          <h2
            id="post-picks-heading"
            className="mb-6 text-2xl font-semibold tracking-tight text-foreground"
          >
            Where to find the toys in this post
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {picks.map((review) => {
              const link = review.affiliateLinks?.[0];
              return (
                <li
                  key={review._id}
                  className="flex flex-col rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
                >
                  <Link
                    href={`/reviews/${review.slug.current}`}
                    className="group flex-1 p-4"
                    aria-label={review.productName}
                  >
                    <div className="flex items-start gap-3">
                      <ProductThumb
                        mainImage={review.mainImage}
                        productName={review.productName}
                        size={56}
                      />
                      <div className="min-w-0">
                        <h3 className="font-medium text-foreground transition-colors group-hover:text-primary-600">
                          {review.productName}
                        </h3>
                        {typeof review.safetyScore === "number" && (
                          <p className="mt-1 text-sm">
                            <span className="font-semibold text-secondary-700">
                              Safety {review.safetyScore}
                            </span>
                            <span className="text-muted-foreground">/100</span>
                          </p>
                        )}
                      </div>
                    </div>
                    {review.hasActiveRecall && (
                      <p className="mt-2">
                        <RecallFlag detail="see the review" />
                      </p>
                    )}
                  </Link>
                  {link && (
                    <div className="border-t border-border px-4 py-4">
                      <BuyButton
                        url={link.url}
                        tag={link.tag || AMAZON_TAG}
                        size="sm"
                        className="w-full"
                        productId={review.slug.current}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <AffiliateDisclosure className="mt-4" />
        </section>
      )}

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
