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

interface ToyReviewRef {
  _id: string
  productName: string
  slug: { current: string }
  safetyScore: number
  developmentScore: number
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
  body: unknown[]
  _createdAt: string
}

function formatAgeRange(minMonths: number, maxMonths: number): string {
  if (minMonths < 12 && maxMonths < 12) {
    return `${minMonths}–${maxMonths} months`
  }
  const minYears = Math.floor(minMonths / 12)
  const maxYears = Math.floor(maxMonths / 12)
  if (minMonths < 12) {
    return `${minMonths} months – ${maxYears} years`
  }
  return `${minYears}–${maxYears} years`
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

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: SITE_URL },
          { name: 'Buying Guides', url: `${SITE_URL}/guides` },
          { name: guide.title, url: `${SITE_URL}/guides/${slug}` },
        ]}
      />
      <nav className="mb-6 text-sm text-zinc-500" aria-label="Breadcrumb">
        <Link href="/guides" className="hover:text-zinc-700">
          Buying Guides
        </Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-900 dark:text-zinc-100">{guide.title}</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {guide.title}
        </h1>
        {ageRangeLabel && (
          <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
            Age range: {ageRangeLabel}
          </p>
        )}
      </header>

      {guide.body && guide.body.length > 0 && (
        <section className="prose prose-zinc dark:prose-invert mb-12">
          {/* Render block content - a portable text renderer would be used here */}
          {(guide.body as Record<string, unknown>[]).map((block, index) => {
            if ((block as { _type: string })._type === 'block') {
              const children = (block as { children?: Array<{ text: string }> }).children
              const text = children?.map((child) => child.text).join('') ?? ''
              const style = (block as { style?: string }).style || 'normal'
              if (style === 'h2') return <h2 key={index}>{text}</h2>
              if (style === 'h3') return <h3 key={index}>{text}</h3>
              return <p key={index}>{text}</p>
            }
            return null
          })}
        </section>
      )}

      {guide.reviews && guide.reviews.length > 0 && (
        <section>
          <h2 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Referenced Toy Reviews
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {guide.reviews.map((review) => (
              <Link
                key={review._id}
                href={`/reviews/${review.slug.current}`}
                className="rounded-lg border border-zinc-200 p-4 transition-shadow hover:shadow-md dark:border-zinc-700"
              >
                <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
                  {review.productName}
                </h3>
                <div className="mt-3 flex gap-4 text-sm">
                  <div>
                    <span className="text-zinc-500">Safety</span>
                    <p className="font-semibold text-green-700 dark:text-green-400">
                      {review.safetyScore ?? '—'}/100
                    </p>
                  </div>
                  <div>
                    <span className="text-zinc-500">Development</span>
                    <p className="font-semibold text-blue-700 dark:text-blue-400">
                      {review.developmentScore ?? '—'}/100
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
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
