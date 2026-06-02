import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import fc from "fast-check";
import type { ToyReviewSummary } from "@/lib/seo/programmatic-pages";
import { AwardBadge, computeAwards, type AwardVariant } from "./AwardBadge";

/**
 * Build a minimal-but-valid ToyReviewSummary for award computation. Only the
 * fields computeAwards reads (`_id`, `safetyScore`, `developmentScore`) carry
 * meaning; the rest are filled with reasonable placeholders.
 */
function makeReview(
  id: string,
  safetyScore: number,
  developmentScore: number
): ToyReviewSummary {
  return {
    _id: id,
    productName: `Toy ${id}`,
    slug: { current: id },
    ageRange: { minMonths: 0, maxMonths: 24 },
    category: null,
    safetyScore,
    developmentScore,
    materials: [],
    hasActiveRecall: false,
  };
}

/**
 * fast-check arbitrary for a non-empty list of reviews with guaranteed-unique
 * `_id`s (index-based) and scores in [0, 100].
 */
const reviewsArb = fc
  .array(
    fc.record({
      safetyScore: fc.integer({ min: 0, max: 100 }),
      developmentScore: fc.integer({ min: 0, max: 100 }),
    }),
    { minLength: 1, maxLength: 30 }
  )
  .map((rows) =>
    rows.map((r, i) => makeReview(`r${i}`, r.safetyScore, r.developmentScore))
  );

describe("computeAwards", () => {
  it("returns an empty map for an empty list", () => {
    expect(computeAwards([])).toEqual({});
  });

  it("gives a single review the top-pick award", () => {
    const awards = computeAwards([makeReview("solo", 90, 80)]);
    expect(awards).toEqual({ solo: "top-pick" });
  });

  it("assigns safest, top-pick and best-value on a representative set", () => {
    const reviews = [
      makeReview("a", 99, 10), // highest safety only -> safest
      makeReview("b", 90, 95), // highest safety+dev -> top-pick
      makeReview("c", 88, 70), // safety >= 85, highest dev among non-top -> best-value
      makeReview("d", 50, 60), // nothing
    ];
    const awards = computeAwards(reviews);
    expect(awards.b).toBe("top-pick");
    expect(awards.a).toBe("safest");
    expect(awards.c).toBe("best-value");
    expect(awards.d).toBeUndefined();
  });

  // Feature: safenest-toys, computeAwards never gives a single review two badges
  it("property: each review _id appears at most once in the awards map", () => {
    fc.assert(
      fc.property(reviewsArb, (reviews) => {
        const awards = computeAwards(reviews);
        const ids = Object.keys(awards);
        // Object keys are unique by construction; assert it explicitly and
        // assert each maps to exactly one (valid) variant value.
        expect(new Set(ids).size).toBe(ids.length);
        for (const id of ids) {
          expect(["top-pick", "best-value", "safest"]).toContain(awards[id]);
        }
        // At most one of each award kind is ever handed out.
        expect(ids.length).toBeLessThanOrEqual(3);
      }),
      { numRuns: 200 }
    );
  });

  // Feature: safenest-toys, the safest award tracks the max safetyScore review
  it("property: the safest badge goes to a max-safetyScore review (unless it is the top pick)", () => {
    fc.assert(
      fc.property(reviewsArb, (reviews) => {
        const awards = computeAwards(reviews);
        const maxSafety = Math.max(...reviews.map((r) => r.safetyScore));

        const safestId = Object.keys(awards).find(
          (id) => awards[id] === "safest"
        );

        if (safestId !== undefined) {
          const safestReview = reviews.find((r) => r._id === safestId)!;
          expect(safestReview.safetyScore).toBe(maxSafety);
        } else {
          // No "safest" badge => the max-safety review must have been promoted
          // to top-pick (priority override).
          const topPickId = Object.keys(awards).find(
            (id) => awards[id] === "top-pick"
          )!;
          const topPickReview = reviews.find((r) => r._id === topPickId)!;
          expect(topPickReview.safetyScore).toBe(maxSafety);
        }
      }),
      { numRuns: 200 }
    );
  });

  // Feature: safenest-toys, top-pick tracks the max combined score and wins priority
  it("property: top-pick goes to a max(safety+development) review and is unique", () => {
    fc.assert(
      fc.property(reviewsArb, (reviews) => {
        const awards = computeAwards(reviews);
        const topPickIds = Object.keys(awards).filter(
          (id) => awards[id] === "top-pick"
        );

        // Exactly one top-pick for any non-empty list.
        expect(topPickIds.length).toBe(1);

        const maxCombined = Math.max(
          ...reviews.map((r) => r.safetyScore + r.developmentScore)
        );
        const topPickReview = reviews.find((r) => r._id === topPickIds[0])!;
        expect(
          topPickReview.safetyScore + topPickReview.developmentScore
        ).toBe(maxCombined);
      }),
      { numRuns: 200 }
    );
  });

  // Feature: safenest-toys, top-pick overrides safest/best-value on the same review
  it("property: a review that is both top-pick and max-safety keeps top-pick", () => {
    fc.assert(
      fc.property(reviewsArb, (reviews) => {
        const awards = computeAwards(reviews);
        const maxCombined = Math.max(
          ...reviews.map((r) => r.safetyScore + r.developmentScore)
        );
        // First review achieving the max combined score (matches reduce semantics).
        const topPick = reviews.find(
          (r) => r.safetyScore + r.developmentScore === maxCombined
        )!;
        // Whatever else it might qualify for, it must be labelled top-pick.
        expect(awards[topPick._id]).toBe("top-pick");
      }),
      { numRuns: 200 }
    );
  });
});

describe("AwardBadge component", () => {
  const cases: Array<{ variant: AwardVariant; label: string }> = [
    { variant: "top-pick", label: "🏆 Top Pick" },
    { variant: "best-value", label: "💰 Best Value" },
    { variant: "safest", label: "🛡️ Safest Choice" },
  ];

  for (const { variant, label } of cases) {
    it(`renders the correct emoji/label for ${variant}`, () => {
      const html = renderToStaticMarkup(<AwardBadge variant={variant} />);
      expect(html).toContain(label);
    });
  }

  it("applies smaller styling for size='sm'", () => {
    const html = renderToStaticMarkup(
      <AwardBadge variant="top-pick" size="sm" />
    );
    expect(html).toContain("text-[11px]");
  });
});
