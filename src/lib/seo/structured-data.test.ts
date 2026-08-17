import { describe, it, expect } from "vitest";
import {
  generateProductReviewJsonLd,
  generateReviewJsonLd,
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

describe("generateReviewJsonLd", () => {
  const base = {
    productName: "Green Toys Stacking Cups",
    safetyScore: 95,
    reviewBody: "No small-parts concern identified for the labeled age range.",
    url: "https://safenesttoys.com/reviews/green-toys-stacking-cups",
  };

  it("emits a Review whose itemReviewed is the Product", () => {
    const r = generateReviewJsonLd(base) as Record<string, unknown>;
    expect(r["@type"]).toBe("Review");
    expect((r.itemReviewed as Record<string, unknown>)["@type"]).toBe("Product");
    expect((r.itemReviewed as Record<string, unknown>).name).toBe(
      "Green Toys Stacking Cups"
    );
  });

  it("never emits aggregateRating", () => {
    // An aggregate of one, authored by the publisher, is self-serving rating
    // markup and against Google's structured-data policy. That is the whole
    // reason this function exists alongside the deprecated one.
    const r = generateReviewJsonLd(base) as Record<string, unknown>;
    expect(r.aggregateRating).toBeUndefined();
    expect(JSON.stringify(r)).not.toContain("aggregateRating");
    expect(JSON.stringify(r)).not.toContain("ratingCount");
  });

  it("carries a single reviewRating mapped from the safety score", () => {
    const r = generateReviewJsonLd({ ...base, safetyScore: 95 }) as Record<
      string,
      unknown
    >;
    const rating = r.reviewRating as Record<string, unknown>;
    expect(rating["@type"]).toBe("Rating");
    expect(rating.ratingValue).toBe(mapSafetyScoreToRating(95));
    expect(rating.bestRating).toBe(5);
    expect(rating.worstRating).toBe(1);
  });

  it("attributes to the organisation unless a named reviewer exists", () => {
    const anon = generateReviewJsonLd(base) as Record<string, unknown>;
    expect(anon.author).toEqual({
      "@type": "Organization",
      name: "SafeNest Toys",
    });

    const named = generateReviewJsonLd({
      ...base,
      authorName: "Vanessa Mulkey",
    }) as Record<string, unknown>;
    expect(named.author).toEqual({ "@type": "Person", name: "Vanessa Mulkey" });
  });

  it("omits optional fields rather than emitting empty ones", () => {
    const r = generateReviewJsonLd({
      productName: "Toy",
      safetyScore: 80,
      reviewBody: "",
    }) as Record<string, unknown>;
    expect(r.url).toBeUndefined();
    expect(r.datePublished).toBeUndefined();
    expect(r.reviewBody).toBeUndefined();
    const item = r.itemReviewed as Record<string, unknown>;
    expect(item.brand).toBeUndefined();
    expect(item.image).toBeUndefined();
  });

  it("includes brand and image when supplied", () => {
    const r = generateReviewJsonLd({
      ...base,
      brand: "Green Toys",
      image: "https://cdn.example/img.jpg",
    }) as Record<string, unknown>;
    const item = r.itemReviewed as Record<string, unknown>;
    expect(item.brand).toEqual({ "@type": "Brand", name: "Green Toys" });
    expect(item.image).toBe("https://cdn.example/img.jpg");
  });
});
