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
  opener: "Test opener sentence for the building category.",
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
    materials: ["Solid wood", "Water-based paint"],
    hasActiveRecall: false,
    // A deliberately uneven factor profile, so weakestFactor() has something to
    // report in the tests that exercise it.
    materialSafety: 90,
    chokingRisk: 70,
    recallHistory: 95,
    certificationPresence: 88,
    imageRef: withImages ? `image-asset-${i}` : null,
    imageAlt: withImages ? `Product ${i} photo` : null,
  }));
}

/** All body text of a post, joined. */
function bodyText(post: { body: PostBlock[] }): string {
  return post.body
    .filter((b): b is TextBlock => b._type === "block")
    .map((b) => b.children.map((c) => c.text).join(""))
    .join("\n");
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

  it("uses a hooked 'Top N Child-Safe' title stamped with month and year", () => {
    // The month is included deliberately: the same category recurs every few
    // weeks, and a bare year produced byte-identical titles that competed with
    // each other in search.
    const post = buildRoundupPost(TOPIC, makeProducts(12), new Date(2026, 5, 3));
    expect(post!.title).toBe("Top 7 Child-Safe Building Toys (June 2026)");
  });

  it("gives two runs of the same category in different months distinct titles", () => {
    const june = buildRoundupPost(TOPIC, makeProducts(8), new Date(2026, 5, 8));
    const july = buildRoundupPost(TOPIC, makeProducts(8), new Date(2026, 6, 6));
    expect(june!.title).not.toBe(july!.title);
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

/**
 * Voice and honesty guards.
 *
 * Six posts shipped claiming experience nobody had — "a toy we'd happily hand
 * our own kids", "a toy we'd trust without a second thought", "in our own kids'
 * hands" — about products SafeNest has never physically handled, on a site whose
 * methodology page states it performs no testing. The same six shared 19
 * paragraphs verbatim because the template was five fixed paragraphs plus one
 * sentence per product with the brand swapped.
 *
 * These tests exist so neither can come back quietly.
 */
describe("generated copy does not claim first-hand experience", () => {
  const FORBIDDEN = [
    /we'?d (happily |gladly )?(hand|give|put|buy)/i,
    /we'?d trust/i,
    /in our own kids'? hands/i,
    /we'?d feel good about/i,
    /our (kids|children) (love|loved)/i,
    /\bwe (tested|test|lab-tested)\b/i,
    /safety[- ]tested\b/i,
    /\bno guesswork\b/i,
    /\bworry[- ]free\b/i,
    /\bpeace of mind\b/i,
  ];

  it("emits none of the phrases that shipped in the first six posts", () => {
    const post = buildRoundupPost(TOPIC, makeProducts(MAX_PICKS), new Date());
    const text = bodyText(post!);
    for (const re of FORBIDDEN) {
      expect(text, `matched ${re}`).not.toMatch(re);
    }
    expect(post!.excerpt).not.toMatch(/researched by parents/i);
  });

  it("does not repeat a paragraph verbatim within one post", () => {
    const post = buildRoundupPost(TOPIC, makeProducts(MAX_PICKS), new Date());
    const paragraphs = post!.body
      .filter((b): b is TextBlock => b._type === "block" && b.style === "normal")
      .map((b) => b.children.map((c) => c.text).join("").trim())
      // Link lead-ins are a deliberate two-form rotation, not prose.
      .filter((t) => t.length > 80 && !t.startsWith("Full breakdown"));

    const seen = new Set<string>();
    for (const p of paragraphs) {
      expect(seen.has(p), `duplicate paragraph: ${p.slice(0, 60)}`).toBe(false);
      seen.add(p);
    }
  });

  it("varies the sentence shape between consecutive product entries", () => {
    const post = buildRoundupPost(TOPIC, makeProducts(4), new Date());
    // The products are identical apart from their scores, so any variety here
    // comes from the shape rotation rather than from differing data. Compare the
    // first six words of each entry.
    const opens = post!.body
      .filter((b): b is TextBlock => b._type === "block" && b.style === "normal")
      .map((b) => b.children.map((c) => c.text).join(""))
      .filter((t) => !t.startsWith("Full breakdown") && !t.startsWith("What we"))
      .map((t) => t.split(/\s+/).slice(0, 6).join(" "));

    // Drop the two intro paragraphs; what remains is one per product.
    const entryOpens = opens.slice(2);
    expect(new Set(entryOpens).size).toBeGreaterThan(1);
  });

  it("states plainly that the score is not a test result", () => {
    const post = buildRoundupPost(TOPIC, makeProducts(5), new Date());
    expect(bodyText(post!)).toMatch(/not a test result/i);
  });

  it("names a product's weakest safety factor when one stands out", () => {
    // makeProducts gives chokingRisk 70 against a 95 high — a 25-point spread.
    const post = buildRoundupPost(TOPIC, makeProducts(5), new Date());
    expect(bodyText(post!)).toMatch(/choking-risk research/i);
  });

  it("stays silent about the weakest factor when the profile is flat", () => {
    const flat = makeProducts(5).map((p) => ({
      ...p,
      materialSafety: 88,
      chokingRisk: 90,
      recallHistory: 89,
      certificationPresence: 91,
    }));
    const post = buildRoundupPost(TOPIC, flat, new Date());
    expect(bodyText(post!)).not.toMatch(/weakest|pulling it down/i);
  });

  it("keeps stored material casing rather than lower-casing it", () => {
    const products = makeProducts(4).map((p) => ({
      ...p,
      materials: ["ABS plastic", "BPA-free"],
    }));
    const post = buildRoundupPost(TOPIC, products, new Date());
    const text = bodyText(post!);
    expect(text).toMatch(/ABS plastic/);
    expect(text).not.toMatch(/abs plastic/);
  });
});

/**
 * Regression tests for the topic-rotation bug.
 *
 * The cron driving this generator only runs on EVEN ISO weeks (bi-weekly
 * cadence). The original implementation selected the topic with
 * `TOPICS[week % TOPICS.length]`, which on even weeks could only ever yield
 * even indices — so only Building and Educational roundups were ever published
 * (repeating forever under identical titles) while Sensory and Outdoor never
 * ran at all. Rotation is now keyed to the fortnight index instead.
 */
describe("pickTopic rotation across the bi-weekly cadence", () => {
  /**
   * Build a date in a given ISO week of 2026.
   *
   * Uses LOCAL date construction on purpose: isoWeek() reads local date parts,
   * which is how it is called in production via `new Date()`. Constructing with
   * Date.UTC would shift to the previous day in negative-offset timezones and
   * land on the wrong week.
   */
  function dateInWeek(week: number): Date {
    const d = new Date(2026, 0, 5); // Mon Jan 5 2026 is in ISO week 2
    d.setDate(d.getDate() + (week - 2) * 7);
    return d;
  }

  it("builds test dates that land on the expected ISO week", () => {
    for (let w = 2; w <= 40; w += 2) {
      expect(isoWeek(dateInWeek(w)).week).toBe(w);
    }
  });

  it("reaches every configured topic across consecutive even weeks", () => {
    const seen = new Set<string>();
    for (let w = 2; w <= 40; w += 2) seen.add(pickTopic(dateInWeek(w)).slugBase);
    expect(seen).toEqual(
      new Set([
        "top-child-safe-building-toys",
        "top-child-safe-sensory-toys",
        "top-child-safe-educational-toys",
        "top-child-safe-outdoor-toys",
      ])
    );
  });

  it("never repeats the same topic on back-to-back runs", () => {
    let prev: string | null = null;
    for (let w = 2; w <= 40; w += 2) {
      const current = pickTopic(dateInWeek(w)).slugBase;
      expect(current).not.toBe(prev);
      prev = current;
    }
  });

  it("cycles all four topics before repeating one", () => {
    const order: string[] = [];
    for (let w = 2; w <= 8; w += 2) order.push(pickTopic(dateInWeek(w)).slugBase);
    expect(new Set(order).size).toBe(4);
  });
});
