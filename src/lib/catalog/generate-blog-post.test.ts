import { describe, it, expect } from "vitest";
import {
  isoWeek,
  pickTopic,
  buildRoundupPost,
  MIN_PRODUCTS_FOR_POST,
  MAX_PICKS,
  type PostBlock,
  type TextBlock,
  type ImageBlock,
} from "./generate-blog-post";

const TOPIC = {
  categoryRef: "cat-building",
  categoryLabel: "Building Toys",
  categoryNoun: "building toy",
  slugBase: "top-child-safe-building-toys",
};

function makeProducts(n: number, withImages = true) {
  return Array.from({ length: n }, (_, i) => ({
    _id: `review-${i}`,
    productName: `Product ${i}`,
    brand: "Brand",
    slug: { current: `product-${i}` },
    safetyScore: 80 + i,
    developmentScore: 70 + i,
    ageRange: { minMonths: 12, maxMonths: 36 },
    imageRef: withImages ? `image-asset-${i}` : null,
    imageAlt: withImages ? `Product ${i} photo` : null,
  }));
}

const isText = (b: PostBlock): b is TextBlock => b._type === "block";
const isImage = (b: PostBlock): b is ImageBlock => b._type === "image";

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

  it("uses a hooked 'Top N Child-Safe' title with the year", () => {
    const post = buildRoundupPost(TOPIC, makeProducts(12), new Date("2026-06-03"));
    expect(post!.title).toBe("Top 7 Child-Safe Building Toys in 2026");
  });

  it("caps picks at MAX_PICKS and ranks by safety score", () => {
    const post = buildRoundupPost(TOPIC, makeProducts(12), new Date("2026-06-03"));
    expect(post!.relatedReviews.length).toBe(MAX_PICKS);
    // highest safety score (Product 11) ranked #1 in an h3 heading
    const headings = post!.body.filter(isText).filter((b) => b.style === "h3");
    expect(headings[0].children[0].text).toBe("1. Product 11");
  });

  it("includes a real product image block per pick when an image exists", () => {
    const post = buildRoundupPost(TOPIC, makeProducts(7), new Date("2026-06-03"));
    const images = post!.body.filter(isImage);
    expect(images.length).toBe(7);
    // image asset refs come only from the products passed in
    for (const img of images) {
      expect(img.asset._ref).toMatch(/^image-asset-\d+$/);
    }
  });

  it("omits image blocks for products without an image (never fabricates one)", () => {
    const post = buildRoundupPost(TOPIC, makeProducts(5, false), new Date("2026-06-03"));
    expect(post!.body.filter(isImage).length).toBe(0);
  });

  it("links each pick to its real review page via a link markDef", () => {
    const post = buildRoundupPost(TOPIC, makeProducts(5), new Date("2026-06-03"));
    const linkBlocks = post!.body
      .filter(isText)
      .filter((b) => b.markDefs.length > 0);
    expect(linkBlocks.length).toBe(5);
    for (const b of linkBlocks) {
      expect(b.markDefs[0]._type).toBe("link");
      expect(b.markDefs[0].href).toMatch(/^\/reviews\/product-\d+$/);
      // the linking span references the markDef key
      const linkedSpan = b.children.find((c) => c.marks.includes(b.markDefs[0]._key));
      expect(linkedSpan).toBeDefined();
    }
  });

  it("week-stamps the slug and id for idempotency", () => {
    const post = buildRoundupPost(TOPIC, makeProducts(5), new Date("2026-06-03"));
    expect(post!.slug.current).toMatch(/top-child-safe-building-toys-\d{4}-w\d+/);
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
