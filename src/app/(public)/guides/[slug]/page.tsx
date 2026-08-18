'use cache'

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { cacheLife, cacheTag } from 'next/cache'
import Link from 'next/link'
import { sanityClient } from '@/lib/sanity/client'
import { buyingGuideBySlugQuery } from '@/lib/sanity/queries'
import { InternalLinks } from '@/components/seo/InternalLinks'
import { generateOpenGraphMeta } from '@/components/seo/OpenGraphMeta'
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema'
import { SITE_URL } from '@/lib/seo/site-config'
import { formatAgeRange } from '@/lib/content/format-age'
import { BuyButton } from '@/components/affiliate/BuyButton'
import { ProductThumb } from '@/components/reviews/ProductThumb'
import { ArticleBody, type PortableBlock } from '@/components/content/ArticleBody'

/** Fallback tag for legacy links stored without one. */
const AMAZON_TAG = 'safeneststore-20'

/** Product photos shown in the header strip. */
const HEADER_THUMB_COUNT = 6

interface ToyReviewRef {
  _id: string
  productName: string
  slug: { current: string }
  safetyScore: number
  developmentScore: number
  brand?: string
  hasActiveRecall?: boolean
  mainImage?: { asset: { _ref: string }; alt?: string } | null
  affiliateLinks?: { partnerId?: string; url: string; tag?: string }[] | null
}

interface BuyingGuide {
  _id: string
  title: string
  slug: { current: string }
  targetAgeRange: {
    minMonths: number
    maxMonths: number
  }
  reviews: ToyReviewRef[] | null
  body: PortableBlock[]
  _createdAt: string
}



export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const guide = await sanityClient.fetch<BuyingGuide | null>(
    buyingGuideBySlugQuery,
    { slug }
  )

  if (!guide) {
    return { title: 'Guide Not Found' }
  }

  const title = `${guide.title} | SafeNest Toys`
  const description = `Buying guide for ages ${formatAgeRange(guide.targetAgeRange.minMonths, guide.targetAgeRange.maxMonths)}. Parent-researched toy comparisons from SafeNest Toys, based on publicly available product and recall information.`

  return {
    title,
    description,
    ...generateOpenGraphMeta({
      title,
      description,
      url: `${SITE_URL}/guides/${slug}`,
      type: 'article',
    }),
  }
}

export default async function BuyingGuidePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  cacheLife('days')
  cacheTag(`buying-guide-${slug}`)

  const guide = await sanityClient.fetch<BuyingGuide | null>(
    buyingGuideBySlugQuery,
    { slug }
  )

  if (!guide) {
    notFound()
  }

  const ageRangeLabel = guide.targetAgeRange
    ? formatAgeRange(guide.targetAgeRange.minMonths, guide.targetAgeRange.maxMonths)
    : null

  const products = guide.reviews ?? []
  // Header imagery comes from the guide's own products. The buyingGuide schema
  // has a mainImage field but no guide has one populated, and inventing or
  // substituting a stock photo is not an option — these are the real product
  // photos already stored for the items the guide compares.
  const headerThumbs = products
    .filter((r) => r.mainImage)
    .slice(0, HEADER_THUMB_COUNT)

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: SITE_URL },
          { name: 'Buying Guides', url: `${SITE_URL}/guides` },
          { name: guide.title, url: `${SITE_URL}/guides/${slug}` },
        ]}
      />
      <nav className="mb-6 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/guides" className="hover:text-foreground">
          Buying Guides
        </Link>
        <span className="mx-2" aria-hidden="true">
          /
        </span>
        <span className="text-foreground">{guide.title}</span>
      </nav>

      <header className="mb-10 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary-50 via-background to-secondary-50">
        <div className="px-6 py-8 md:px-8 md:py-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">
            Buying guide
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary-900 md:text-4xl">
            {guide.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-primary-700/80">
            {ageRangeLabel && <span>Ages {ageRangeLabel}</span>}
            {products.length > 0 && (
              <>
                {ageRangeLabel && <span aria-hidden="true">·</span>}
                <span>
                  {products.length} {products.length === 1 ? 'toy' : 'toys'} compared
                </span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <Link
              href="/transparency"
              className="font-medium underline underline-offset-4 hover:text-primary-900"
            >
              How we score
            </Link>
          </div>
        </div>

        {/* Product strip. aria-hidden because every one of these products is
            listed below with its name, scores and a link — announcing the same
            set twice adds nothing for a screen reader. */}
        {headerThumbs.length > 0 && (
          <div
            className="flex items-center gap-3 border-t border-border/60 bg-background/50 px-6 py-4 md:px-8"
            aria-hidden="true"
          >
            {headerThumbs.map((review, i) => (
              <ProductThumb
                key={review._id}
                mainImage={review.mainImage}
                productName={review.productName}
                size={56}
                className={
                  // Keep the strip on one line at every width rather than
                  // wrapping into a ragged second row.
                  i >= 3 ? 'hidden sm:block' : ''
                }
              />
            ))}
          </div>
        )}
      </header>

      {guide.body && guide.body.length > 0 && (
        <ArticleBody body={guide.body} className="mb-12" />
      )}

      {guide.reviews && guide.reviews.length > 0 && (
        <section>
          <h2 className="mb-6 text-2xl font-semibold tracking-tight text-foreground">
            Referenced Toy Reviews
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {guide.reviews.map((review) => {
              const link = review.affiliateLinks?.[0]
              return (
                <div
                  key={review._id}
                  className="flex flex-col rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
                >
                  {/* The card body links to the review. The buy button is a
                      sibling, not a child: an interactive control cannot nest
                      inside an anchor. */}
                  {/* aria-label, not just the inner heading: this page is
                      partially prerendered, and the heading text sits behind a
                      streaming boundary while the thumbnail lands in the shell.
                      The name resolves for real users, but an explicit label
                      means the link's accessible name never depends on stream
                      timing — and a link wrapping an image plus a heading reads
                      better with one anyway. */}
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
                      <h3 className="min-w-0 font-medium text-foreground transition-colors group-hover:text-primary-600">
                        {review.productName}
                      </h3>
                    </div>
                    {/* Score colours match ComparisonTable rather than
                        introducing a third pairing for the same two numbers. */}
                    <div className="mt-3 flex gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Safety</span>
                        <p className="font-semibold text-secondary-700">
                          {review.safetyScore ?? '—'}/100
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Development</span>
                        <p className="font-semibold text-primary-700">
                          {review.developmentScore ?? '—'}/100
                        </p>
                      </div>
                    </div>
                    {review.hasActiveRecall && (
                      <p className="mt-2 text-xs font-medium text-safety-low">
                        ⚠ Active recall — see the review
                      </p>
                    )}
                  </Link>
                  {link && (
                    <div className="border-t border-border px-4 py-4">
                      <BuyButton
                        url={link.url}
                        tag={link.tag || AMAZON_TAG}
                        size="sm"
                        label="Check current price at Amazon"
                        className="w-full"
                        productId={review.slug.current}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {/* One disclosure for the page, adjacent to the buy buttons above. */}
          <p className="mt-4 text-xs text-muted-foreground">
            Buy links are affiliate links. SafeNest may earn a commission from
            qualifying purchases at no additional cost to you, and commissions
            never influence our scores or which toys we include.
          </p>
        </section>
      )}

      {/* Internal Links - Related Content (Requirement 4.3) */}
      <InternalLinks
        currentDocId={guide._id}
        ageRange={guide.targetAgeRange}
      />
    </main>
  )
}
