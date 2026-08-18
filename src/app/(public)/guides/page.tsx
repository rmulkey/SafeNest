'use cache'

import type { Metadata } from 'next'
import { cacheLife, cacheTag } from 'next/cache'
import Link from 'next/link'
import { sanityClient } from '@/lib/sanity/client'
import { allBuyingGuidesQuery } from '@/lib/sanity/queries'
import { generateOpenGraphMeta } from '@/components/seo/OpenGraphMeta'
import { SITE_URL } from '@/lib/seo/site-config'
// Shared formatter. The local implementation removed here produced
// ungrammatical output such as "1 years" and "0 months – 1 years".
import { formatAgeRange } from '@/lib/content/format-age'
import { EmptyState } from '@/components/ui/EmptyState'

export const metadata: Metadata = {
  title: 'Buying Guides | SafeNest Toys',
  description:
    'Parent-researched toy buying guides organized by age and category. Compare toys using publicly available product and recall information.',
  ...generateOpenGraphMeta({
    title: 'Buying Guides | SafeNest Toys',
    description:
      'Parent-researched toy buying guides organized by age and category. Compare toys using publicly available product and recall information.',
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
          Parent-researched buying guides to help families compare toys using
          publicly available product and recall information.
        </p>
      </header>

      {guides.length === 0 ? (
        <EmptyState
          title="No guides published yet"
          body="Each one takes a while — we would rather publish four we stand behind than forty we do not."
          action={{ href: "/reviews", label: "Browse the reviews" }}
        />
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
