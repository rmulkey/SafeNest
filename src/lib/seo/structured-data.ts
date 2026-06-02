/**
 * JSON-LD structured data generators for SEO.
 *
 * Generates schema.org markup for:
 * - Product + Review (Toy Reviews with aggregate rating from Safety Score)
 * - FAQPage (Buying Guides with question-answer pairs)
 *
 * Requirements: 4.1, 4.2
 */

export interface ProductReviewInput {
  productName: string;
  safetyScore: number; // 0-100
  reviewBody: string;
  url?: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * Maps a Safety Score (0-100) to a schema.org rating (1-5 scale).
 * Uses linear mapping: score 0 → rating 1, score 100 → rating 5.
 */
export function mapSafetyScoreToRating(safetyScore: number): number {
  const clamped = Math.max(0, Math.min(100, safetyScore));
  const rating = 1 + (clamped / 100) * 4;
  // Round to 1 decimal place
  return Math.round(rating * 10) / 10;
}

/**
 * Generates schema.org Product + Review JSON-LD markup for a Toy Review.
 *
 * Includes product name, aggregate rating derived from Safety Score (mapped 0-100 to 1-5),
 * and review body.
 *
 * Requirements: 4.1
 */
export function generateProductReviewJsonLd(review: ProductReviewInput): object {
  const ratingValue = mapSafetyScoreToRating(review.safetyScore);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: review.productName,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue,
      bestRating: 5,
      worstRating: 1,
      ratingCount: 1,
    },
    review: {
      "@type": "Review",
      reviewBody: review.reviewBody,
      author: {
        "@type": "Organization",
        name: "SafeNest Toys",
      },
      reviewRating: {
        "@type": "Rating",
        ratingValue,
        bestRating: 5,
        worstRating: 1,
      },
    },
    ...(review.url ? { url: review.url } : {}),
  };
}

/**
 * Generates schema.org FAQPage JSON-LD markup from question-answer pairs.
 *
 * Requirements: 4.2
 */
export function generateFaqPageJsonLd(faqItems: FaqItem[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
