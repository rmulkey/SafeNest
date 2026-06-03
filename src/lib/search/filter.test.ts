import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  filterReviews,
  SEARCH_RESULT_LIMIT,
  type SearchableReview,
} from "./filter";

function makeReview(
  overrides: Partial<SearchableReview> & { _id: string }
): SearchableReview {
  return {
    productName: "Toy",
    slug: { current: overrides._id },
    category: null,
    safetyScore: 90,
    ageRange: { minMonths: 0, maxMonths: 12 },
    mainImage: null,
    ...overrides,
  };
}

const catalog: SearchableReview[] = [
  makeReview({ _id: "1", productName: "Wooden Stacking Blocks", category: "Building" }),
  makeReview({ _id: "2", productName: "Soft Sensory Ball", category: "Sensory" }),
  makeReview({ _id: "3", productName: "Outdoor Climbing Frame", category: "Outdoor" }),
  makeReview({ _id: "4", productName: "Counting Bears", category: "Educational" }),
];

describe("filterReviews", () => {
  it("returns no results for an empty or whitespace query", () => {
    expect(filterReviews(catalog, "")).toEqual([]);
    expect(filterReviews(catalog, "   ")).toEqual([]);
  });

  it("matches on product name, case-insensitively", () => {
    const results = filterReviews(catalog, "BLOCKS");
    expect(results.map((r) => r._id)).toEqual(["1"]);
  });

  it("matches on category, case-insensitively", () => {
    const results = filterReviews(catalog, "sensory");
    expect(results.map((r) => r._id)).toEqual(["2"]);
  });

  it("matches substrings across name and category", () => {
    // "o" appears in several names/categories — all such reviews match.
    const results = filterReviews(catalog, "out");
    expect(results.map((r) => r._id)).toEqual(["3"]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterReviews(catalog, "zzzz")).toEqual([]);
  });

  it("tolerates null name/category without throwing", () => {
    const weird = [
      makeReview({ _id: "x", productName: "", category: null }),
      makeReview({ _id: "y", productName: "Real Toy", category: "Building" }),
    ];
    expect(filterReviews(weird, "toy").map((r) => r._id)).toEqual(["y"]);
  });

  it("caps results at the limit and preserves input order", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      makeReview({ _id: String(i), productName: `Block ${i}` })
    );
    const results = filterReviews(many, "block");
    expect(results).toHaveLength(SEARCH_RESULT_LIMIT);
    expect(results.map((r) => r._id)).toEqual(
      many.slice(0, SEARCH_RESULT_LIMIT).map((r) => r._id)
    );
  });

  // Property: every returned review actually contains the query (case-insensitive)
  // in its name or category, and the result count never exceeds the limit.
  it("property: results are sound and bounded by the limit", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            _id: fc.string({ minLength: 1 }),
            productName: fc.string(),
            category: fc.option(fc.string(), { nil: null }),
          }),
          { maxLength: 40 }
        ),
        fc.string({ minLength: 1 }),
        (rows, q) => {
          const reviews = rows.map((r, i) =>
            makeReview({
              _id: `${r._id}-${i}`,
              productName: r.productName,
              category: r.category,
            })
          );
          const results = filterReviews(reviews, q);
          const needle = q.trim().toLowerCase();

          expect(results.length).toBeLessThanOrEqual(SEARCH_RESULT_LIMIT);

          for (const r of results) {
            const haystack = `${r.productName ?? ""} ${r.category ?? ""}`.toLowerCase();
            if (needle !== "") {
              expect(haystack.includes(needle)).toBe(true);
            }
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});
