import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { urlForImage } from "@/lib/sanity/client";
import {
  GIFT_GUIDES,
  getGiftGuideBySlug,
  getGiftGuideProducts,
} from "@/lib/seo/gift-guides";
import { generateOpenGraphMeta } from "@/components/seo/OpenGraphMeta";
import { SITE_URL } from "@/lib/seo/site-config";
import { BuyButton } from "@/components/affiliate/BuyButton";
import { AwardBadge, computeAwards } from "@/components/reviews/AwardBadge";
import { JsonLd } from "@/components/seo/JsonLd";

const AMAZON_TAG = "safeneststore-20";

interface GiftGuidePageProps {
  params: Promise<{ slug: string }>;
}

/** Pre-render every gift guide at build time. */
export function generateStaticParams() {
  return GIFT_GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: GiftGuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGiftGuideBySlug(slug);

  if (!guide) {
    return { title: "Gift Guide Not Found" };
  }

  return {
    title: `${guide.title} (2026) | SafeNest Toys`,
    description: guide.description,
    alternates: { canonical: `${SITE_URL}/gift-guides/${slug}` },
    ...generateOpenGraphMeta({
      title: `${guide.title} (2026) | SafeNest Toys`,
      description: guide.description,
      url: `${SITE_URL}/gift-guides/${slug}`,
      useRouteImage: true,
    }),
  };
}

export default async function GiftGuideDetailPage({
  params,
}: GiftGuidePageProps) {
  const { slug } = await params;
  const guide = getGiftGuideBySlug(slug);

  if (!guide) {
    notFound();
  }

  const products = await getGiftGuideProducts(guide);
  const awards = computeAwards(products);

  // ItemList structured data — helps this gift guide qualify for rich results.
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: guide.title,
    description: guide.description,
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/reviews/${p.slug.current}`,
      name: p.productName,
    })),
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <JsonLd data={itemListJsonLd} />

      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/gift-guides" className="hover:text-foreground">
          Gift Guides
        </Link>
        <span className="mx-2" aria-hidden="true">
          /
        </span>
        <span className="text-foreground">{guide.title}</span>
      </nav>

      <header className="mb-8">
        <span className="text-4xl" aria-hidden="true">
          {guide.emoji}
        </span>
        <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          {guide.title}
        </h1>
        <p className="mt-3 text-muted-foreground max-w-2xl">{guide.intro}</p>

        <div className="mt-4 flex items-center gap-2 text-sm text-primary-700">
          <ShieldCheck className="size-4" aria-hidden="true" />
          <span>
            Every pick has a SafeNest editorial safety assessment and has been checked against publicly available recall information.
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          As an Amazon Associate, SafeNest Toys earns from qualifying purchases.
        </p>
      </header>

      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
          <h2 className="text-xl font-semibold text-foreground">
            Picks coming soon
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We&apos;re finalizing our safety-tested picks for this guide. In the
            meantime, browse all our reviews.
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
        <ol className="space-y-5">
          {products.map((product, index) => {
            const award = awards[product._id];
            const link = product.affiliateLinks?.[0];
            return (
              <li
                key={product._id}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md sm:flex-row"
              >
                {/* Rank + image */}
                <div className="flex shrink-0 items-start gap-4">
                  <span
                    className="flex size-8 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <div className="relative size-28 overflow-hidden rounded-lg bg-muted">
                    {award && (
                      <span className="absolute left-1.5 top-1.5 z-10">
                        <AwardBadge variant={award} size="sm" />
                      </span>
                    )}
                    {product.mainImage ? (
                      <Image
                        src={urlForImage(product.mainImage)
                          .width(224)
                          .height(224)
                          .url()}
                        alt={product.mainImage.alt || product.productName}
                        fill
                        className="object-cover"
                        sizes="112px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl">
                        🧸
                      </div>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link
                    href={`/reviews/${product.slug.current}`}
                    className="group"
                  >
                    <h2 className="text-lg font-semibold text-foreground group-hover:text-primary-600 transition-colors">
                      {product.productName}
                    </h2>
                  </Link>
                  <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <dt>Safety</dt>
                      <dd className="font-semibold text-foreground">
                        {product.safetyScore}/100
                      </dd>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <dt>Development</dt>
                      <dd className="font-semibold text-foreground">
                        {product.developmentScore}/100
                      </dd>
                    </div>
                  </dl>
                  {product.hasActiveRecall && (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      ⚠ Active recall — see review before buying
                    </p>
                  )}

                  <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
                    {link && (
                      <BuyButton
                        url={link.url}
                        tag={link.tag || AMAZON_TAG}
                        size="sm"
                        label="Check Price"
                        productId={product.slug.current}
                      />
                    )}
                    <Link
                      href={`/reviews/${product.slug.current}`}
                      className="text-sm font-medium text-primary-600 hover:text-primary-700"
                    >
                      Read full review →
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* Related guides */}
      <section className="mt-12 border-t border-border pt-8">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          More gift guides
        </h2>
        <div className="flex flex-wrap gap-3">
          {GIFT_GUIDES.filter((g) => g.slug !== guide.slug).map((g) => (
            <Link
              key={g.slug}
              href={`/gift-guides/${g.slug}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <span aria-hidden="true">{g.emoji}</span>
              {g.title}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
