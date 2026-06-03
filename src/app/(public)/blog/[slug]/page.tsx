import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { sanityClient } from "@/lib/sanity/client";
import { blogPostBySlugQuery } from "@/lib/sanity/queries";
import { SITE_URL } from "@/lib/seo/site-config";

interface PortableSpan {
  _type: string;
  _key: string;
  text: string;
  marks?: string[];
}

interface PortableBlock {
  _type: string;
  _key: string;
  style?: string;
  listItem?: "bullet" | "number";
  level?: number;
  children?: PortableSpan[];
}

interface BlogPost {
  _id: string;
  title: string;
  slug: { current: string };
  publishedAt: string;
  excerpt?: string;
  body: PortableBlock[];
  author: string;
}

/** Renders the inline spans of a block, honoring strong/em marks. */
function renderSpans(children: PortableSpan[] | undefined) {
  if (!children) return null;
  return children.map((span) => {
    const isStrong = span.marks?.includes("strong");
    const isEm = span.marks?.includes("em");
    let node: React.ReactNode = span.text;
    if (isStrong) node = <strong className="font-semibold text-foreground">{node}</strong>;
    if (isEm) node = <em>{node}</em>;
    return <span key={span._key}>{node}</span>;
  });
}

/**
 * Renders Portable Text blocks into styled HTML with proper visual hierarchy.
 * Groups consecutive list items into <ul>/<ol> elements.
 */
function renderBody(body: PortableBlock[]) {
  const elements: React.ReactNode[] = [];
  let listBuffer: PortableBlock[] = [];
  let listType: "bullet" | "number" | null = null;

  const flushList = () => {
    if (listBuffer.length === 0) return;
    const items = listBuffer.map((b) => (
      <li key={b._key} className="leading-relaxed">
        {renderSpans(b.children)}
      </li>
    ));
    if (listType === "number") {
      elements.push(
        <ol key={`ol-${listBuffer[0]._key}`} className="my-5 ml-5 list-decimal space-y-2 text-foreground/80 marker:text-primary-500">
          {items}
        </ol>
      );
    } else {
      elements.push(
        <ul key={`ul-${listBuffer[0]._key}`} className="my-5 ml-5 list-disc space-y-2 text-foreground/80 marker:text-primary-400">
          {items}
        </ul>
      );
    }
    listBuffer = [];
    listType = null;
  };

  for (const block of body) {
    if (block._type !== "block") continue;

    if (block.listItem) {
      if (listType && listType !== block.listItem) flushList();
      listType = block.listItem;
      listBuffer.push(block);
      continue;
    }

    flushList();
    const content = renderSpans(block.children);

    switch (block.style) {
      case "h2":
        elements.push(
          <h2 key={block._key} className="mt-12 mb-4 text-2xl font-semibold tracking-tight text-foreground scroll-mt-24">
            {content}
          </h2>
        );
        break;
      case "h3":
        elements.push(
          <h3 key={block._key} className="mt-8 mb-3 text-xl font-semibold tracking-tight text-foreground">
            {content}
          </h3>
        );
        break;
      case "h4":
        elements.push(
          <h4 key={block._key} className="mt-6 mb-2 text-lg font-semibold text-foreground">
            {content}
          </h4>
        );
        break;
      case "blockquote":
        elements.push(
          <blockquote key={block._key} className="my-6 border-l-4 border-primary-300 bg-primary-50/50 py-3 pl-5 pr-4 text-foreground/80 italic rounded-r-lg">
            {content}
          </blockquote>
        );
        break;
      default:
        elements.push(
          <p key={block._key} className="my-5 text-base leading-7 text-foreground/80">
            {content}
          </p>
        );
    }
  }

  flushList();
  return elements;
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

  const title = `${post.title} | SafeNest Toys Blog`;
  const description =
    post.excerpt ||
    post.body?.[0]?.children?.map((c) => c.text).join("").slice(0, 155) ||
    `Read "${post.title}" on the SafeNest Toys blog.`;
  const url = `${SITE_URL}/blog/${slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type: "article",
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

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
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
        <div className="text-foreground/80">{renderBody(post.body)}</div>
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
        <form className="mt-4 flex flex-col gap-3 sm:flex-row">
          <label htmlFor="post-newsletter-email" className="sr-only">
            Email address
          </label>
          <input
            id="post-newsletter-email"
            type="email"
            name="email"
            placeholder="you@example.com"
            required
            className="flex-1 rounded-lg border border-border bg-white px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors shadow-sm"
          >
            Subscribe
          </button>
        </form>
      </section>
    </main>
  );
}
