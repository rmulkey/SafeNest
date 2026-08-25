import { describe, it, expect } from "vitest";
import { pickGuides } from "./InternalLinks";

/**
 * These tests exist because the first version of this ranking was wrong in a way
 * that looked fine: it ordered guides by `targetAgeRange.minMonths` in GROQ and
 * took the first two. Measured across the built site, that handed almost every
 * slot to the three guides starting at 0 months and dropped
 * /guides/best-building-toys-preschoolers from 12 inbound internal links to 1 —
 * a page that actually ranks. Concentration had moved, not gone.
 */

const guide = (
  id: string,
  minMonths: number,
  maxMonths: number,
  categoryId?: string
) => ({
  _id: id,
  _type: "buyingGuide" as const,
  title: id,
  slug: { current: id },
  categoryId: categoryId ?? null,
  targetAgeRange: { minMonths, maxMonths },
});

// Shapes mirror the real catalog: three guides open at 0 months, and
// best-wooden-nontoxic-toys spans 0–96 so it overlaps every age on the site.
const SENSORY = guide("best-sensory-toys-babies", 0, 12, "cat-sensory");
const TRAVEL = guide("best-travel-on-the-go-toys", 0, 24);
const WOODEN = guide("best-wooden-nontoxic-toys", 0, 96);
const SIX_TO_TWELVE = guide("best-toys-6-12-months", 6, 12);
const BUILDING = guide("best-building-toys-preschoolers", 36, 96, "cat-building");

describe("pickGuides", () => {
  it("prefers a category match over any age fit", () => {
    // Without the category rule the 0–96 month guide overlaps a preschooler and
    // would compete; the building guide is the one a building review should link.
    const picked = pickGuides(
      [WOODEN, TRAVEL, BUILDING],
      { currentDocId: "review-1", categoryId: "cat-building" },
      1
    );
    expect(picked.map((g) => g._id)).toEqual(["best-building-toys-preschoolers"]);
  });

  it("prefers the narrowest age range when no category matches", () => {
    // 6–12 months (span 6) beats 0–24 (span 24) and 0–96 (span 96).
    const picked = pickGuides(
      [WOODEN, TRAVEL, SIX_TO_TWELVE],
      { currentDocId: "review-1", categoryId: null },
      1
    );
    expect(picked.map((g) => g._id)).toEqual(["best-toys-6-12-months"]);
  });

  it("does not let one broad guide take the best-fit slot on every page", () => {
    // The first regression this guards: WOODEN spans 0–96 and overlaps every age,
    // so ordering that favoured breadth gave it a slot site-wide.
    const pages = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const winners = pages.map(
      (p) =>
        pickGuides([WOODEN, TRAVEL, SENSORY, SIX_TO_TWELVE], { currentDocId: p, categoryId: null }, 1)[0]
          ._id
    );
    expect(winners).not.toContain("best-wooden-nontoxic-toys");
  });

  it("still gives every matching guide a share once there is a second slot", () => {
    // The second regression, and the more damaging one: ranking BOTH slots by fit
    // starved the three broadest guides to one inbound link each across the whole
    // site. best-wooden-nontoxic-toys was one of them, and it ranks. The rotating
    // slot has to reach every candidate.
    const candidates = [WOODEN, TRAVEL, SENSORY, SIX_TO_TWELVE, BUILDING];
    const pages = Array.from({ length: 60 }, (_, i) => `review-${i}`);
    const appearances = new Map<string, number>();
    for (const p of pages) {
      for (const g of pickGuides(candidates, { currentDocId: p, categoryId: null }, 2)) {
        appearances.set(g._id, (appearances.get(g._id) ?? 0) + 1);
      }
    }
    for (const c of candidates) {
      expect(
        appearances.get(c._id) ?? 0,
        `${c._id} never appeared across ${pages.length} pages`
      ).toBeGreaterThan(0);
    }
  });

  it("spreads equally-good guides across pages instead of ordering them identically", () => {
    // Three guides with an identical span and no category: nothing but the
    // tiebreak separates them, so different pages must not all pick the same one.
    const equal = [guide("g1", 0, 12), guide("g2", 0, 12), guide("g3", 0, 12)];
    const pages = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9", "p10"];
    const chosen = new Set(
      pages.map(
        (p) => pickGuides(equal, { currentDocId: p, categoryId: null }, 1)[0]._id
      )
    );
    expect(chosen.size).toBeGreaterThan(1);
  });

  it("is deterministic for a given page", () => {
    const candidates = [WOODEN, TRAVEL, SENSORY, SIX_TO_TWELVE];
    const opts = { currentDocId: "review-42", categoryId: null };
    const first = pickGuides(candidates, opts, 2).map((g) => g._id);
    const second = pickGuides(candidates, opts, 2).map((g) => g._id);
    expect(second).toEqual(first);
  });

  it("returns at most the requested number, and copes with fewer candidates", () => {
    expect(pickGuides([SENSORY, TRAVEL, WOODEN], { currentDocId: "x" }, 2)).toHaveLength(2);
    expect(pickGuides([SENSORY], { currentDocId: "x" }, 2)).toHaveLength(1);
    expect(pickGuides([], { currentDocId: "x" }, 2)).toEqual([]);
  });

  it("treats a missing targetAgeRange as the widest possible span", () => {
    // A guide with no age range should never outrank one that declares a fit.
    const noRange = {
      _id: "no-range",
      _type: "buyingGuide" as const,
      title: "no-range",
      slug: { current: "no-range" },
      categoryId: null,
      targetAgeRange: null,
    };
    const picked = pickGuides(
      [noRange, SIX_TO_TWELVE],
      { currentDocId: "review-1", categoryId: null },
      1
    );
    expect(picked.map((g) => g._id)).toEqual(["best-toys-6-12-months"]);
  });
});
