import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { Shield, Baby, Blocks, TreePine, BookOpen } from "lucide-react";
import { sanityClient } from "@/lib/sanity/client";
import { urlForImage } from "@/lib/sanity/client";
import {
  featuredToyReviewsQuery,
  latestSafetyArticlesQuery,
  approvedTestimonialsQuery,
  approvedEndorsementsQuery,
} from "@/lib/sanity/queries";
import { ScoreBadge } from "@/components/reviews/ScoreBadge";
import { ToyFinder } from "@/components/finder/ToyFinder";
import { TrustSection } from "@/components/trust/TrustSection";
import { FounderStrip } from "@/components/trust/FounderStrip";
import { generateOpenGraphMeta } from "@/components/seo/OpenGraphMeta";
import { SITE_URL } from "@/lib/seo/site-config";
import { FAQSchema } from "@/components/seo/FAQSchema";
import { OrganizationSchema } from "@/components/seo/OrganizationSchema";
import { WebSiteSchema } from "@/components/seo/WebSiteSchema";

export const metadata: Metadata = {
  title: "SafeNest Toys — Safer Toys, Smarter Play, Built by Parents",
  description:
    "Independent toy safety reviews scored out of 100 for babies & toddlers — built by Rodrigo and Vanessa, homeschooling parents of three, to help families choose safer, smarter toys with confidence.",
  keywords: [
    "toy safety reviews",
    "safe toys for babies",
    "toddler toy safety",
    "toy safety scores",
    "developmental toys",
    "baby toy reviews",
    "CPSC toy recalls",
    "non-toxic toys",
  ],
  alternates: {
    canonical: SITE_URL,
  },
  ...generateOpenGraphMeta({
    title: "SafeNest Toys — Safer Toys, Smarter Play, Built by Parents",
    description:
      "Independent toy safety reviews scored out of 100 for babies & toddlers — built by parents to help families choose safer, smarter toys with confidence.",
    url: SITE_URL,
  }),
};

interface ToyReview {
  _id: string;
  productName: string;
  slug: { current: string };
  ageRange: { minMonths: number; maxMonths: number };
  safetyScore: number;
  developmentScore: number;
  materials: string[];
  hasActiveRecall: boolean;
  mainImage?: { asset: { _ref: string }; alt?: string };
}

interface SafetyArticle {
  _id: string;
  title: string;
  slug: { current: string };
  publishedAt: string;
  excerpt: string;
}

interface Testimonial {
  _id: string;
  quote: string;
  authorName: string;
  authorContext?: string;
  avatar?: { asset: { _ref: string }; alt?: string };
}

interface Endorsement {
  _id: string;
  name: string;
  credentials: string;
  affiliation?: string;
  quote: string;
  headshot?: { asset: { _ref: string }; alt?: string };
  profileUrl?: string;
}

function formatAgeRange(ageRange: { minMonths: number; maxMonths: number }) {
  const minYears = Math.floor(ageRange.minMonths / 12);
  const maxYears = Math.floor(ageRange.maxMonths / 12);
  if (ageRange.minMonths < 12) {
    return `${ageRange.minMonths}mo – ${maxYears}yr`;
  }
  return `${minYears} – ${maxYears} years`;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const ageCards = [
  { href: "/best-toys/0-6-months", label: "Newborn", age: "0–6 mo", icon: Baby },
  { href: "/best-toys/6-12-months", label: "Explorer", age: "6–12 mo", icon: Baby },
  { href: "/best-toys/1-2-years", label: "Toddler", age: "1–2 yr", icon: Blocks },
  { href: "/best-toys/2-3-years", label: "Builder", age: "2–3 yr", icon: TreePine },
  { href: "/best-toys/3-plus-years", label: "Preschool", age: "3+ yr", icon: BookOpen },
];

const homepageFaqs = [
  {
    question: "How do you score toy safety?",
    answer:
      "We evaluate toys on four criteria: material safety, choking risk, recall history, and certification presence. Each is scored and combined into a weighted safety score out of 100.",
  },
  {
    question: "What certifications should I look for in baby toys?",
    answer:
      "Look for ASTM F963, CPSIA compliance, EN 71 (European standard), and voluntary marks like the JPMA seal. Our reviews flag which certifications each toy carries.",
  },
  {
    question: "How often is toy recall information updated?",
    answer:
      "We monitor CPSC recall feeds daily and update affected reviews within 24 hours. Active recalls are prominently flagged on review pages.",
  },
  {
    question: "Are your reviews independent?",
    answer:
      "Yes. SafeNest Toys accepts no sponsorships or paid placements. Our revenue comes from affiliate links, but they never influence scores. See our transparency page for details.",
  },
  {
    question: "What age ranges do you cover?",
    answer:
      "We cover toys for children from newborn (0 months) through preschool (5+ years), with particular focus on the 0–3 age range where safety risks are highest.",
  },
];

export default async function HomePage() {
  'use cache'
  cacheLife('minutes')
  const [featuredReviews, latestArticles, testimonials, endorsements] = await Promise.all([
    sanityClient.fetch<ToyReview[]>(featuredToyReviewsQuery),
    sanityClient.fetch<SafetyArticle[]>(latestSafetyArticlesQuery),
    sanityClient.fetch<Testimonial[]>(approvedTestimonialsQuery),
    sanityClient.fetch<Endorsement[]>(approvedEndorsementsQuery),
  ]);

  return (
    <div className="flex flex-col pb-16">
      <OrganizationSchema />
      <WebSiteSchema />
      <FAQSchema items={homepageFaqs} />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-50 via-background to-secondary-50 py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-5xl font-semibold text-primary-900 tracking-tight leading-tight">
            Safe play starts with
            <br className="hidden sm:block" />
            <span className="text-primary-600"> informed choices</span>
          </h1>
          <p className="mt-4 text-lg md:text-xl text-primary-700/80 max-w-2xl mx-auto">
            Tell us about your child and we&apos;ll match them with expert-reviewed
            toys scored for safety and development.
          </p>

          {/* Interactive Toy Finder — fills the hero, captures intent */}
          <div className="mt-8">
            <ToyFinder />
          </div>

          {/* Secondary links */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
            <Link
              href="/reviews"
              className="font-medium text-primary-700 hover:text-primary-900 underline-offset-4 hover:underline"
            >
              Browse all reviews
            </Link>
            <Link
              href="/transparency"
              className="font-medium text-primary-700 hover:text-primary-900 underline-offset-4 hover:underline"
            >
              How we score
            </Link>
          </div>

          {/* Trust badges */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-secondary-400" aria-hidden="true" />
              50+ expert reviews
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-secondary-400" aria-hidden="true" />
              Independent safety scoring
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-secondary-400" aria-hidden="true" />
              Daily recall monitoring
            </span>
          </div>
        </div>
      </section>

      {/* Founder identity strip — quiet trust signal, below the fold-defining hero */}
      <div className="-mt-4 mb-4">
        <FounderStrip />
      </div>

      {/* Featured Toy Reviews */}
      <section className="py-16 mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="text-2xl font-semibold text-foreground">
            Top-Rated Safe Toys
          </h2>
          <Link
            href="/reviews"
            className="text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredReviews.map((review) => (
            <Link
              key={review._id}
              href={`/reviews/${review.slug.current}`}
              className="group rounded-xl border border-border bg-card p-5 hover:shadow-lg hover:border-primary-200 transition-all duration-200"
            >
              {review.mainImage && (
                <div className="relative w-full h-40 mb-4 rounded-lg overflow-hidden bg-muted">
                  <Image
                    src={urlForImage(review.mainImage).width(400).height(260).url()}
                    alt={review.mainImage.alt || review.productName}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
              )}
              <h3 className="text-lg font-medium text-card-foreground group-hover:text-primary-600 transition-colors">
                {review.productName}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Ages: {formatAgeRange(review.ageRange)}
              </p>
              <div className="mt-4 flex items-center gap-5">
                <ScoreBadge score={review.safetyScore} label="Safety" size="sm" />
                <ScoreBadge score={review.developmentScore} label="Development" size="sm" />
              </div>
              {review.hasActiveRecall && (
                <span className="mt-3 inline-block rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                  Active Recall
                </span>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* Browse by Age */}
      <section className="py-16 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold text-foreground text-center mb-8">
            Browse by Age
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {ageCards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.href}
                  href={card.href}
                  className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-6 hover:shadow-md hover:border-primary-200 transition-all text-center group"
                >
                  <div className="size-12 rounded-full bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                    <Icon className="size-6 text-primary-600" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{card.label}</span>
                  <span className="text-xs text-muted-foreground">{card.age}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Trust Section — methodology, standards, verified endorsements & testimonials */}
      <TrustSection
        testimonials={testimonials}
        endorsements={endorsements}
        reviewCount={50}
      />

      {/* Latest Safety Articles */}
      <section className="py-16 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="text-2xl font-semibold text-foreground">
              Latest Safety Articles
            </h2>
            <Link
              href="/blog"
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              Read more →
            </Link>
          </div>
          <ul className="divide-y divide-border bg-card rounded-xl border border-border overflow-hidden">
            {latestArticles.map((article) => (
              <li key={article._id}>
                <Link
                  href={`/blog/${article.slug.current}`}
                  className="group block px-6 py-5 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                    <h3 className="text-base font-medium text-foreground group-hover:text-primary-600 transition-colors">
                      {article.title}
                    </h3>
                    <time
                      dateTime={article.publishedAt}
                      className="text-sm text-muted-foreground shrink-0"
                    >
                      {formatDate(article.publishedAt)}
                    </time>
                  </div>
                  {article.excerpt && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {article.excerpt}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="py-16 mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
        <div className="rounded-2xl bg-gradient-to-br from-secondary-50 to-primary-50 border border-secondary-200/60 p-8 md:p-12 text-center">
          <div className="mx-auto size-14 rounded-full bg-white/80 flex items-center justify-center mb-4 shadow-sm">
            <Shield className="size-7 text-primary-600" />
          </div>
          <h2 className="text-2xl font-semibold text-foreground">
            Stay informed on toy safety
          </h2>
          <p className="mt-2 text-muted-foreground max-w-xl mx-auto">
            Get recall alerts, new reviews, and age-appropriate recommendations
            delivered to your inbox.
          </p>
          <form className="mt-6 flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
            <input
              type="email"
              name="email"
              placeholder="Your email address"
              required
              aria-label="Email address"
              className="flex-1 rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <select
              name="ageRange"
              required
              aria-label="Child age range"
              className="rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              defaultValue=""
            >
              <option value="" disabled>
                Child age range
              </option>
              <option value="0-2">0–2 years</option>
              <option value="3-5">3–5 years</option>
              <option value="6-8">6–8 years</option>
              <option value="9-12">9–12 years</option>
            </select>
            <button
              type="submit"
              className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors shadow-sm"
            >
              Subscribe
            </button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            No spam. Unsubscribe anytime.
          </p>
        </div>
      </section>
    </div>
  );
}
