import { describe, it, expect } from "vitest";
import {
  generateReviewMetadata,
  generateGuideMetadata,
  generateArticleMetadata,
  generatePageMetadata,
} from "./metadata";

describe("generateReviewMetadata", () => {
  it("generates correct OG and Twitter tags for a review", () => {
    const result = generateReviewMetadata({
      productName: "Wooden Stacking Rings",
      slug: "wooden-stacking-rings",
      description: "A safe stacking toy for infants.",
      imageUrl: "https://example.com/image.png",
    });

    expect(result.title).toBe("Wooden Stacking Rings Safety Review | SafeNest Toys");
    expect(result.description).toBe("A safe stacking toy for infants.");
    expect(result.openGraph).toMatchObject({
      title: "Wooden Stacking Rings Safety Review | SafeNest Toys",
      description: "A safe stacking toy for infants.",
      type: "article",
      images: [{ url: "https://example.com/image.png" }],
    });
    expect(result.twitter).toMatchObject({
      card: "summary_large_image",
      title: "Wooden Stacking Rings Safety Review | SafeNest Toys",
      description: "A safe stacking toy for infants.",
      images: ["https://example.com/image.png"],
    });
  });

  it("uses default description when none provided", () => {
    const result = generateReviewMetadata({
      productName: "Soft Block Set",
      slug: "soft-block-set",
    });

    expect(result.description).toContain("Soft Block Set");
  });
});

describe("generateGuideMetadata", () => {
  it("generates correct OG and Twitter tags for a guide", () => {
    const result = generateGuideMetadata({
      title: "Best Toys for 6 Month Olds",
      slug: "best-toys-6-month-olds",
      description: "Our expert picks for 6 month olds.",
      imageUrl: "https://example.com/guide.png",
    });

    expect(result.title).toBe("Best Toys for 6 Month Olds | SafeNest Toys");
    expect(result.openGraph).toMatchObject({
      title: "Best Toys for 6 Month Olds | SafeNest Toys",
      description: "Our expert picks for 6 month olds.",
      url: expect.stringContaining("/guides/best-toys-6-month-olds"),
      type: "article",
    });
    expect(result.twitter).toMatchObject({
      card: "summary_large_image",
      title: "Best Toys for 6 Month Olds | SafeNest Toys",
    });
  });
});

describe("generateArticleMetadata", () => {
  it("generates correct OG and Twitter tags for an article", () => {
    const result = generateArticleMetadata({
      title: "Understanding Toy Safety Labels",
      slug: "understanding-toy-safety-labels",
      description: "A guide to reading safety labels.",
      publishedAt: "2024-01-15T10:00:00Z",
      authorName: "SafeNest Team",
    });

    expect(result.title).toBe("Understanding Toy Safety Labels | SafeNest Toys");
    expect(result.openGraph).toMatchObject({
      title: "Understanding Toy Safety Labels | SafeNest Toys",
      type: "article",
      publishedTime: "2024-01-15T10:00:00Z",
      authors: ["SafeNest Team"],
    });
    expect(result.twitter).toMatchObject({
      card: "summary_large_image",
    });
  });

  it("omits optional article fields when not provided", () => {
    const result = generateArticleMetadata({
      title: "Simple Post",
      slug: "simple-post",
    });

    const og = result.openGraph as Record<string, unknown>;
    expect(og.publishedTime).toBeUndefined();
    expect(og.authors).toBeUndefined();
  });
});

describe("generatePageMetadata", () => {
  it("generates correct OG and Twitter tags for a generic page", () => {
    const result = generatePageMetadata("About Us", "Learn about SafeNest Toys.", {
      url: "https://safenesttoys.com/about",
    });

    expect(result.title).toBe("About Us | SafeNest Toys");
    expect(result.description).toBe("Learn about SafeNest Toys.");
    expect(result.openGraph).toMatchObject({
      title: "About Us | SafeNest Toys",
      description: "Learn about SafeNest Toys.",
      url: "https://safenesttoys.com/about",
      type: "website",
    });
    expect(result.twitter).toMatchObject({
      card: "summary_large_image",
      title: "About Us | SafeNest Toys",
      description: "Learn about SafeNest Toys.",
    });
  });

  it("uses default URL and image when options not provided", () => {
    const result = generatePageMetadata("Contact", "Get in touch.");

    const og = result.openGraph as Record<string, unknown>;
    expect(og.url).toBeDefined();
    expect((og.images as Array<{ url: string }>)[0].url).toContain("/opengraph-image");
  });
});
