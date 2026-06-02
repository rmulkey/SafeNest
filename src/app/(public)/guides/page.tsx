'use cache'

import type { Metadata } from 'next'
import { cacheLife, cacheTag } from 'next/cache'
import Link from 'next/link'
import { sanityClient } from '@/lib/sanity/client'
import { allBuyingGuidesQuery } from '@/lib/sanity/queries'
import { generateOpenGraphMeta } from '@/components/seo/OpenGraphMeta'
import { SITE_URL } from '@/lib/seo/site-config'

export const metadata: Metadata = {
  title: 'Buying Guides | SafeNest Toys',
  description:
    'Expert toy buying guides organized by age and category. Find the safest toys for your child with our comprehensive guides.',
  ...generateOpenGraphMeta({
    title: 'Buying Guides | SafeNest Toys',
    description:
      'Expert toy buying guides organized by age and category. Find the safest toys for your child with our comprehensive guides.',
    url: `${SITE_URL}/guides`,
  }),
}

interface BuyingGuideSummary {
  _id: string
  title: string
  slug: { current: string }
  targetAgeRange: {
    minMonths: number
    maxMonths: number
  } | null
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

export default async function BuyingGuidesPage() {
  cacheLife('days')
  cacheTag('buying-guides')

  const guides = await sanityClient.fetch<BuyingGuideSummary[]>(
    allBuyingGuidesQuery
  )

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Buying Guides
        </h1>
        <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
          Expert-curated guides to help you find the safest toys for your child.
        </p>
      </header>

      {guides.length === 0 ? (
        <p className="text-zinc-500">No buying guides available yet. Check back soon!</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {guides.map((guide) => (
            <Link
              key={guide._id}
              href={`/guides/${guide.slug.current}`}
              className="rounded-lg border border-zinc-200 p-5 transition-shadow hover:shadow-md dark:border-zinc-700"
            >
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
                {guide.title}
              </h2>
              {guide.targetAgeRange && (
                <p className="mt-1 text-sm text-zinc-500">
                  Ages: {formatAgeRange(guide.targetAgeRange.minMonths, guide.targetAgeRange.maxMonths)}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
