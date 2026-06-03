import type { Metadata } from "next";
import Link from "next/link";
import { GIFT_GUIDES } from "@/lib/seo/gift-guides";
import { generateOpenGraphMeta } from "@/components/seo/OpenGraphMeta";
import { SITE_URL } from "@/lib/seo/site-config";

export const metadata: Metadata = {
  title: "Toy Gift Guides — Safe Gift Ideas by Occasion | SafeNest Toys",
  description:
    "Safe, developmental toy gift ideas for first birthdays, baby showers, holidays, and more — every pick independently safety-scored and recall-checked.",
  alternates: { canonical: `${SITE_URL}/gift-guides` },
  ...generateOpenGraphMeta({
    title: "Toy Gift Guides — Safe Gift Ideas by Occasion | SafeNest Toys",
    description:
      "Safe, developmental toy gift ideas for first birthdays, baby showers, holidays, and more — every pick independently safety-scored and recall-checked.",
    url: `${SITE_URL}/gift-guides`,
  }),
};

export default function GiftGuidesHubPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          Safe Toy Gift Guides
        </h1>
        <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
          Shopping for a little one? Every gift in these guides has been
          independently safety-scored, recall-checked, and reviewed for
          developmental value — so you can give something both delightful and
          genuinely safe.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2">
        {GIFT_GUIDES.map((guide) => (
          <Link
            key={guide.slug}
            href={`/gift-guides/${guide.slug}`}
            className="group flex flex-col rounded-2xl border border-border bg-card p-6 transition-all hover:shadow-md hover:border-primary-200"
          >
            <span className="text-3xl" aria-hidden="true">
              {guide.emoji}
            </span>
            <h2 className="mt-3 text-lg font-semibold text-foreground group-hover:text-primary-600 transition-colors">
              {guide.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-3">
              {guide.description}
            </p>
            <span className="mt-4 text-sm font-medium text-primary-600">
              View picks →
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
