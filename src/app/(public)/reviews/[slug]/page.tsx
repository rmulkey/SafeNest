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
import { EvidenceSection } from "@/components/reviews/EvidenceSection";
import {
  PurchaseDecisionPanel,
  type MerchantOption,
} from "@/components/reviews/PurchaseDecisionPanel";
import { assessSafety } from "@/lib/scoring/assess-safety";
import {
  qualifyClaimText,
  qualifyClaimList,
  QUALIFIED_CLAIM_NOTE,
} from "@/lib/content/qualify-claims";
import { DevelopmentScoreDisplay } from "@/components/reviews/DevelopmentScoreDisplay";
import { InternalLinks } from "@/components/seo/InternalLinks";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { BuyButton } from "@/components/affiliate/BuyButton";
import { StickyBuyBar } from "@/components/affiliate/StickyBuyBar";
import { formatAgeRange } from "@/lib/content/format-age";

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
  factorEvidence?: Record<string, string> | null;
  certificationEvidence?: Array<{ certification?: string; status?: string; sourceUrl?: string }> | null;
  reviewedBy?: string | null;
  lastReviewedAt?: string | null;
  recallCheckedAt?: string | null;
  publishedAt?: string | null;
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

  // Only append the brand suffix when the result still fits in what Google
  // displays (~60 chars); otherwise the product name gets truncated away.
  const baseTitle = `${review.productName} Safety Review - Score ${review.safetyScore}/100`;
  const TITLE_SUFFIX = " | SafeNest Toys";
  const title =
    baseTitle.length + TITLE_SUFFIX.length <= 60
      ? `${baseTitle}${TITLE_SUFFIX}`
      : baseTitle;
  // Kept under ~160 chars so search results are not truncated. Uses only real
  // fields from the review (name, score, age range) - nothing inferred.
  const ageLabel = review.ageRange
    ? formatAgeRange(review.ageRange.minMonths, review.ageRange.maxMonths)
    : null;
  const description = ageLabel
    ? `Is ${review.productName} safe? We score it ${review.safetyScore}/100 on materials, choking risk, recalls, and certifications. Ages ${ageLabel}.`
    : `Is ${review.productName} safe? We score it ${review.safetyScore}/100 on materials, choking risk, recalls, and certifications.`;
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



/** First non-blank entry of a list, or null. Never invents a value. */
function firstNonEmpty(list: string[] | null | undefined): string | null {
  return list?.find((v) => typeof v === "string" && v.trim().length > 0) ?? null;
}

/**
 * Second distinct non-blank entry, used for "Main limitation" so it does not
 * simply repeat "Not ideal for". Falls back to null, and the caller then reuses
 * the first con rather than fabricating a different limitation.
 */
function secondNonEmpty(list: string[] | null | undefined): string | null {
  const found = (list ?? []).filter(
    (v) => typeof v === "string" && v.trim().length > 0
  );
  return found.length > 1 ? found[1] : null;
}

/**
 * Display name for an affiliate partner id. Unknown partners fall back to the
 * raw id rather than being labelled "Amazon", which would misattribute the link.
 */
function merchantNameFor(partnerId: string): string {
  const known: Record<string, string> = {
    amazon: "Amazon",
    target: "Target",
    walmart: "Walmart",
  };
  return known[partnerId?.toLowerCase()] ?? partnerId ?? "the merchant";
}

export default async function ToyReviewPage({ params }: PageProps) {
  const { slug } = await params;

  const review = await getReview(slug);

  if (!review) {
    notFound();
  }

  // Computed once and shared by the evidence section, the purchase panel and the
  // sticky bar, so all three report the same confidence and cannot disagree.
  const assessment = assessSafety(
    {
      materialSafety: review.materialSafety,
      chokingRisk: review.chokingRisk,
      recallHistory: review.recallHistory,
      certificationPresence: review.certificationPresence,
    },
    review.factorEvidence ?? {},
    { recallCheckedAt: review.recallCheckedAt ?? null }
  );

  const merchants: MerchantOption[] = (review.affiliateLinks ?? []).map(
    (link) => ({
      merchant: merchantNameFor(link.partnerId),
      url: link.url,
      affiliate: Boolean(link.tag),
      tag: link.tag,
      // No priceCheckedAt in the data model, so none is passed. The panel
      // renders no date rather than inventing one.
    })
  );

  // Conservative fallbacks. Each is an existing editorial field, used verbatim;
  // when the field is absent the row is dropped instead of being generated.
  const bestFor = firstNonEmpty(review.pros);
  const notIdealFor = firstNonEmpty(review.cons);
  const mainLimitation = secondNonEmpty(review.cons) ?? notIdealFor;

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
              {review.productName}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              SafeNest may earn a commission from qualifying purchases at no
              additional cost to you.
            </p>
          </div>
          {review.affiliateLinks.map((link, i) => (
            <BuyButton
              key={i}
              url={link.url}
              tag={link.tag}
              size="lg"
              label="Check current price at Amazon"
              productId={review.slug?.current ?? review.productName}
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
          {qualifyClaimList(review.materials).map((material, i) => (
            <li key={i}>{material}</li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">
          Material descriptions are as reported by the manufacturer or retailer.
          SafeNest has not independently verified them.
        </p>
      </section>

      {/* Choking Hazard Assessment */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">
          Choking Hazard Research
        </h2>
        {/* Seeded text contained absolute verdicts such as "No choking hazard.
            Safe for 6m+." which SafeNest cannot support. qualifyClaimText
            attributes and hedges them at render time; the stored content is not
            mutated, so an editor can still revise the original. */}
        <p className="text-sm text-muted-foreground">
          {qualifyClaimText(review.chokingHazardAssessment).text}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {QUALIFIED_CLAIM_NOTE} Follow the current packaging, warnings and
          supervision guidance.
        </p>
      </section>

      {/* Certifications */}
      {review.certifications && review.certifications.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Certifications</h2>
          {/* Attribution matters: these are claims made by the manufacturer or
              retailer, not findings verified by SafeNest. */}
          <p className="mb-2 text-sm text-muted-foreground">
            Manufacturer-reported. Not independently verified by SafeNest.
          </p>
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

      {/* Pros & Cons — labelled as editorial opinion.
          Entries such as "Premium materials" and "Beautiful design" are
          judgements, not verified safety facts, so the section states whose
          judgement it is rather than letting them read as findings. */}
      <section aria-labelledby="opinion-heading" className="mb-6">
        <h2 id="opinion-heading" className="text-xl font-semibold mb-1">
          What we liked, and what we didn&apos;t
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          SafeNest&apos;s editorial opinion, based on publicly available product
          information. These are preferences and observations, not verified
          safety findings.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-lg font-semibold mb-2 text-safety-high">Pros</h3>
            <ul className="space-y-1 text-sm">
              {review.pros.map((pro, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-safety-high mt-0.5" aria-hidden="true">
                    &#10003;
                  </span>
                  <span>{pro}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2 text-safety-low">Cons</h3>
            <ul className="space-y-1 text-sm">
              {review.cons.map((con, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-safety-low mt-0.5" aria-hidden="true">
                    &#10007;
                  </span>
                  <span>{con}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

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

      {/* Evidence area. One component, so the four factors and the
          "how we assessed" disclosure cannot be separated by a component
          boundary — which is how "Certification claims" previously ended up
          rendering after the disclosure in the streamed HTML. */}
      <EvidenceSection
        assessment={assessment}
        storedScore={review.safetyScore}
        certifications={review.certifications}
        recallCheckedAt={review.recallCheckedAt}
        hasActiveRecall={review.hasActiveRecall}
        reviewedBy={review.reviewedBy}
        publishedAt={review.publishedAt}
        lastReviewedAt={review.lastReviewedAt}
      />

      {/* Purchase decision panel. Every row is derived from data that already
          exists on the review; a row with no trustworthy source is omitted
          rather than filled in. */}
      {merchants.length > 0 && (
        <PurchaseDecisionPanel
          productName={review.productName}
          productId={review.slug?.current ?? review.productName}
          merchants={merchants}
          ageMinMonths={review.ageRange?.minMonths}
          ageMaxMonths={review.ageRange?.maxMonths}
          confidence={assessment.confidence}
          bestFor={bestFor}
          notIdealFor={notIdealFor}
          mainLimitation={mainLimitation}
          safetyScore={review.safetyScore}
        />
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
          confidence={assessment.confidence}
        />
      )}
    </div>
  );
}
