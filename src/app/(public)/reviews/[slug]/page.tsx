/**
 * Toy Review Page - Full review with ISR (on-demand revalidation via webhooks).
 *
 * Displays all review content: product name, age range, materials, choking hazard,
 * certifications, pros, cons, alternatives, safety/development score breakdowns,
 * and an active recall banner if applicable.
 *
 * Requirements: 1.1, 3.4, 11.2
 */

import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

import { sanityClient, urlForImage } from "@/lib/sanity/client";
import { generateOpenGraphMeta } from "@/components/seo/OpenGraphMeta";
import { SITE_URL } from "@/lib/seo/site-config";
import { toyReviewBySlugQuery } from "@/lib/sanity/queries";
import { SafetyScoreDisplay } from "@/components/reviews/SafetyScoreDisplay";
import { DevelopmentScoreDisplay } from "@/components/reviews/DevelopmentScoreDisplay";
import { InternalLinks } from "@/components/seo/InternalLinks";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { BuyButton } from "@/components/affiliate/BuyButton";
import { StickyBuyBar } from "@/components/affiliate/StickyBuyBar";

interface ToyReview {
  _id: string;
  productName: string;
  slug: { current: string };
  ageRange: { minMonths: number; maxMonths: number };
  category: { _id: string; title: string; slug: { current: string } } | null;
  materialSafety: number;
  chokingRisk: number;
  recallHistory: number;
  certificationPresence: number;
  motorSkills: number;
  cognitiveSkills: number;
  sensoryEngagement: number;
  safetyScore: number;
  developmentScore: number;
  materials: string[];
  chokingHazardAssessment: string;
  certifications: string[] | null;
  pros: string[];
  cons: string[];
  alternatives:
    | {
        _id: string;
        productName: string;
        slug: { current: string };
        safetyScore: number;
        developmentScore: number;
      }[]
    | null;
  affiliateLinks: { partnerId: string; url: string; tag: string }[] | null;
  body: unknown;
  hasActiveRecall: boolean;
  needsReview: boolean;
  mainImage?: { asset: { _ref: string }; alt?: string };
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getReview(slug: string): Promise<ToyReview | null> {
  return sanityClient.fetch<ToyReview | null>(toyReviewBySlugQuery, { slug });
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const review = await getReview(slug);

  if (!review) {
    return { title: "Review Not Found" };
  }

  const title = `${review.productName} Safety Review - Score ${review.safetyScore}/100 | SafeNest Toys`;
  const description = `Is ${review.productName} safe? Our expert review scores it ${review.safetyScore}/100 for safety. Read our detailed analysis of materials, choking hazards, and age-appropriateness.`;
  const url = `${SITE_URL}/reviews/${slug}`;

  return {
    title,
    description,
    keywords: [
      `${review.productName} safety`,
      `${review.productName} review`,
      "toy safety review",
      "is it safe for babies",
      "choking hazard assessment",
    ],
    alternates: {
      canonical: url,
    },
    ...generateOpenGraphMeta({
      title,
      description,
      url,
      type: "article",
    }),
  };
}

function formatAgeRange(minMonths: number, maxMonths: number): string {
  if (maxMonths < 12) {
    return `${minMonths}–${maxMonths} months`;
  }
  const minYears = Math.floor(minMonths / 12);
  const maxYears = Math.floor(maxMonths / 12);
  if (minMonths < 12) {
    return `${minMonths}mo–${maxYears}yr`;
  }
  return `${minYears}–${maxYears} years`;
}

export default async function ToyReviewPage({ params }: PageProps) {
  const { slug } = await params;
  const review = await getReview(slug);

  if (!review) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 pb-24 lg:pb-12">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: SITE_URL },
          { name: "Reviews", url: `${SITE_URL}/reviews` },
          { name: review.productName, url: `${SITE_URL}/reviews/${slug}` },
        ]}
      />
      {/* Recall Banner */}
      {review.hasActiveRecall && (
        <div
          className="mb-6 rounded-lg border border-safety-low bg-red-50 p-4 text-safety-low"
          role="alert"
        >
          <span className="font-semibold">⚠️ Active Recall Alert</span>
          <p className="text-sm mt-1">
            This product has an active recall. Please check the latest safety
            notices before purchasing.
          </p>
        </div>
      )}

      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          {review.productName}
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>
            Ages: {formatAgeRange(review.ageRange.minMonths, review.ageRange.maxMonths)}
          </span>
          {review.category && (
            <>
              <span>·</span>
              <Link
                href={`/categories/${review.category.slug.current}`}
                className="hover:text-primary-500 underline"
              >
                {review.category.title}
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Product Image */}
      {review.mainImage && (
        <div className="mb-8 relative w-full aspect-[16/9] max-h-[400px] rounded-xl overflow-hidden bg-muted border border-border">
          <Image
            src={urlForImage(review.mainImage).width(900).height(500).url()}
            alt={review.mainImage.alt || review.productName}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 900px"
            priority
          />
        </div>
      )}

      {/* Buy on Amazon CTA */}
      {review.affiliateLinks && review.affiliateLinks.length > 0 && (
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border border-border bg-accent-50/50">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              Buy {review.productName}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              SafeNest Toys earns a commission from qualifying purchases.
            </p>
          </div>
          {review.affiliateLinks.map((link, i) => (
            <BuyButton
              key={i}
              url={link.url}
              tag={link.tag}
              size="lg"
              label="Check Price on Amazon"
            />
          ))}
        </div>
      )}

      {/* Score Displays */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <SafetyScoreDisplay
          score={review.safetyScore}
          breakdown={{
            materialSafety: review.materialSafety,
            chokingRisk: review.chokingRisk,
            recallHistory: review.recallHistory,
            certificationPresence: review.certificationPresence,
          }}
        />
        <DevelopmentScoreDisplay
          score={review.developmentScore}
          breakdown={{
            motorSkills: review.motorSkills,
            cognitiveSkills: review.cognitiveSkills,
            sensoryEngagement: review.sensoryEngagement,
          }}
        />
      </section>

      {/* Materials */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Materials</h2>
        <ul className="list-disc list-inside text-sm space-y-1">
          {review.materials.map((material, i) => (
            <li key={i}>{material}</li>
          ))}
        </ul>
      </section>

      {/* Choking Hazard Assessment */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">
          Choking Hazard Assessment
        </h2>
        <p className="text-sm text-muted-foreground">
          {review.chokingHazardAssessment}
        </p>
      </section>

      {/* Certifications */}
      {review.certifications && review.certifications.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Certifications</h2>
          <div className="flex flex-wrap gap-2">
            {review.certifications.map((cert, i) => (
              <span
                key={i}
                className="inline-block rounded-full bg-muted px-3 py-1 text-xs font-medium"
              >
                {cert}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Pros & Cons */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold mb-2 text-safety-high">Pros</h2>
          <ul className="space-y-1 text-sm">
            {review.pros.map((pro, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-safety-high mt-0.5">✓</span>
                <span>{pro}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2 text-safety-low">Cons</h2>
          <ul className="space-y-1 text-sm">
            {review.cons.map((con, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-safety-low mt-0.5">✗</span>
                <span>{con}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Mid-content Buy CTA — captures readers who decided after pros/cons */}
      {review.affiliateLinks && review.affiliateLinks.length > 0 && (
        <section className="mb-8 rounded-xl border border-secondary-200 bg-secondary-50/60 p-5 text-center">
          <p className="text-base font-semibold text-foreground">
            Our verdict: a {review.safetyScore}/100 safety pick
          </p>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">
            {review.pros[0] ? `${review.pros[0]}.` : "A solid, well-tested choice for your child."} See the latest price and availability.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {review.affiliateLinks.map((link, i) => (
              <BuyButton
                key={i}
                url={link.url}
                tag={link.tag}
                size="lg"
                label={`Check Price on Amazon`}
              />
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            As an Amazon Associate, SafeNest Toys earns from qualifying purchases.
          </p>
        </section>
      )}

      {/* Alternatives */}
      {review.alternatives && review.alternatives.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Alternatives</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {review.alternatives.map((alt) => (
              <Link
                key={alt._id}
                href={`/reviews/${alt.slug.current}`}
                className="block rounded-lg border border-border p-3 hover:border-primary-400 transition-colors"
              >
                <p className="font-medium text-sm">{alt.productName}</p>
                <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                  <span>Safety: {alt.safetyScore}</span>
                  <span>Dev: {alt.developmentScore}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Internal Links - Related Content (Requirement 4.3) */}
      <InternalLinks
        currentDocId={review._id}
        categoryId={review.category?._id}
        ageRange={review.ageRange}
      />

      {/* Sticky mobile buy bar */}
      {review.affiliateLinks && review.affiliateLinks.length > 0 && (
        <StickyBuyBar
          productName={review.productName}
          url={review.affiliateLinks[0].url}
          tag={review.affiliateLinks[0].tag}
          safetyScore={review.safetyScore}
        />
      )}
    </div>
  );
}
