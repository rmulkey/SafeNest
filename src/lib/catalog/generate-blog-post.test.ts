import { describe, it, expect } from "vitest";
import {
  isoWeek,
  pickTopic,
  buildRoundupPost,
  MIN_PRODUCTS_FOR_POST,
} from "./generate-blog-post";

const TOPIC = { categoryRef: "cat-building", categoryLabel: "Building Toys", slugBase: "best-building-toys" };

function makeProducts(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    _id: `review-${i}`,
    productName: `Product ${i}`,
    brand: "Brand",
    slug: { current: `product-${i}` },
    safetyScore: 80 + i,
    developmentScore: 70 + i,
    ageRange: { minMonths: 12, maxMonths: 36 },
  }));
}

describe("isoWeek", () => {
  it("returns a week between 1 and 53", () => {
    const { week } = isoWeek(new Date("2026-06-03"));
    expect(week).toBeGreaterThanOrEqual(1);
    expect(week).toBeLessThanOrEqual(53);
  });
});

describe("pickTopic", () => {
  it("returns a valid configured topic", () => {
    const topic = pickTopic(new Date("2026-06-03"));
    expect(topic).toHaveProperty("categoryRef");
    expect(topic).toHaveProperty("slugBase");
  });
});

describe("buildRoundupPost", () => {
  it("returns null when there aren't enough real products", () => {
    const post = buildRoundupPost(TOPIC, makeProducts(MIN_PRODUCTS_FOR_POST - 1), new Date());
    expect(post).toBeNull();
  });

  it("builds a post from real products, ranked by safety score, top 8", () => {
    const post = buildRoundupPost(TOPIC, makeProducts(12), new Date("2026-06-03"));
    expect(post).not.toBeNull();
    // relatedReviews capped at 8 and references real product ids
    expect(post!.relatedReviews.length).toBe(8);
    expect(post!.relatedReviews[0]._ref).toMatch(/^review-/);
    // highest safety score should be first in the body ranking
    expect(post!.body.some((b) => b.children[0].text.includes("Product 11"))).toBe(true);
    // slug is week-stamped for idempotency
    expect(post!.slug.current).toMatch(/best-building-toys-\d{4}-w\d+/);
    expect(post!._id).toBe(`blog-${post!.slug.current}`);
  });

  it("only references products passed in (never invents items)", () => {
    const products = makeProducts(5);
    const post = buildRoundupPost(TOPIC, products, new Date());
    const validIds = new Set(products.map((p) => p._id));
    for (const ref of post!.relatedReviews) {
      expect(validIds.has(ref._ref)).toBe(true);
    }
  });
});
