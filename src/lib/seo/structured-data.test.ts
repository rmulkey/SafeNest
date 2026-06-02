import { describe, it, expect } from "vitest";
import {
  generateProductReviewJsonLd,
  generateFaqPageJsonLd,
  mapSafetyScoreToRating,
} from "./structured-data";

describe("mapSafetyScoreToRating", () => {
  it("maps score 0 to rating 1", () => {
    expect(mapSafetyScoreToRating(0)).toBe(1);
  });

  it("maps score 100 to rating 5", () => {
    expect(mapSafetyScoreToRating(100)).toBe(5);
  });

  it("maps score 50 to rating 3", () => {
    expect(mapSafetyScoreToRating(50)).toBe(3);
  });

  it("clamps values below 0", () => {
    expect(mapSafetyScoreToRating(-10)).toBe(1);
  });

  it("clamps values above 100", () => {
    expect(mapSafetyScoreToRating(150)).toBe(5);
  });
});

describe("generateProductReviewJsonLd", () => {
  it("generates valid Product + Review schema.org markup", () => {
    const result = generateProductReviewJsonLd({
      productName: "Wooden Stacking Blocks",
      safetyScore: 85,
      reviewBody: "These blocks are excellent for toddlers.",
    });

    expect(result).toEqual({
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Wooden Stacking Blocks",
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: 4.4,
        bestRating: 5,
        worstRating: 1,
        ratingCount: 1,
      },
      review: {
        "@type": "Review",
        reviewBody: "These blocks are excellent for toddlers.",
        author: {
          "@type": "Organization",
          name: "SafeNest Toys",
        },
        reviewRating: {
          "@type": "Rating",
          ratingValue: 4.4,
          bestRating: 5,
          worstRating: 1,
        },
      },
    });
  });

  it("includes url when provided", () => {
    const result = generateProductReviewJsonLd({
      productName: "Test Toy",
      safetyScore: 50,
      reviewBody: "A review.",
      url: "https://safenest.com/reviews/test-toy",
    }) as Record<string, unknown>;

    expect(result.url).toBe("https://safenest.com/reviews/test-toy");
  });
});

describe("generateFaqPageJsonLd", () => {
  it("generates valid FAQPage schema.org markup", () => {
    const faqItems = [
      { question: "What age is this toy for?", answer: "Ages 3-5." },
      { question: "Is it safe?", answer: "Yes, it passes all safety tests." },
    ];

    const result = generateFaqPageJsonLd(faqItems);

    expect(result).toEqual({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What age is this toy for?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Ages 3-5.",
          },
        },
        {
          "@type": "Question",
          name: "Is it safe?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, it passes all safety tests.",
          },
        },
      ],
    });
  });

  it("handles empty FAQ items array", () => {
    const result = generateFaqPageJsonLd([]);

    expect(result).toEqual({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [],
    });
  });
});
