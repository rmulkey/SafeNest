/**
 * Tests for best-toys age route param resolution.
 *
 * Regression guard: the nav dropdown, homepage "Browse by Age" cards, and the
 * sitemap link to named age slugs (e.g. /best-toys/1-2-years). These MUST
 * resolve to a numeric age so the page renders real content instead of 404ing.
 */
import { describe, it, expect } from "vitest";

// Mock the Sanity client so importing the module doesn't require env vars.
import { vi } from "vitest";
vi.mock("@/lib/sanity/client", () => ({
  sanityClient: { fetch: vi.fn() },
  sanityWriteClient: { fetch: vi.fn() },
  urlForImage: vi.fn(),
}));

import {
  resolveAgeParam,
  formatAgeParamLabel,
  canonicalAgeSlug,
  AGE_MONTHS,
  AGE_SLUG_TO_MONTHS,
  CANONICAL_AGE_SLUG_BY_MONTHS,
  CANONICAL_AGE_SLUGS,
} from "./programmatic-pages";

// Every age slug that appears as a public link somewhere in the app.
const PUBLIC_AGE_SLUGS = [
  "0-6-months",
  "6-12-months",
  "0-12-months",
  "1-2-years",
  "2-3-years",
  "3-plus-years",
];

describe("resolveAgeParam", () => {
  it("resolves every public age slug to a positive integer age", () => {
    for (const slug of PUBLIC_AGE_SLUGS) {
      const months = resolveAgeParam(slug);
      expect(months, `slug "${slug}" should resolve`).not.toBeNull();
      expect(Number.isInteger(months)).toBe(true);
      expect(months as number).toBeGreaterThan(0);
    }
  });

  it("resolves every slug declared in AGE_SLUG_TO_MONTHS", () => {
    for (const [slug, months] of Object.entries(AGE_SLUG_TO_MONTHS)) {
      expect(resolveAgeParam(slug)).toBe(months);
    }
  });

  it("resolves raw numeric age values", () => {
    expect(resolveAgeParam("3")).toBe(3);
    expect(resolveAgeParam("18")).toBe(18);
    expect(resolveAgeParam("36")).toBe(36);
  });

  it("returns null for non-numeric, unknown params", () => {
    expect(resolveAgeParam("banana")).toBeNull();
    expect(resolveAgeParam("")).toBeNull();
    expect(resolveAgeParam("-5")).toBeNull();
    expect(resolveAgeParam("0")).toBeNull();
    expect(resolveAgeParam("3.5")).toBeNull();
  });
});

describe("canonicalAgeSlug", () => {
  it("maps every param that resolves to the same age onto one canonical slug", () => {
    // /best-toys/18, /best-toys/12-24-months and /best-toys/1-2-years all render
    // the identical list of toys, so exactly one of them may be canonical.
    expect(canonicalAgeSlug("18")).toBe("1-2-years");
    expect(canonicalAgeSlug("12-24-months")).toBe("1-2-years");
    expect(canonicalAgeSlug("1-2-years")).toBe("1-2-years");

    expect(canonicalAgeSlug("9")).toBe("6-12-months");
    expect(canonicalAgeSlug("0-12-months")).toBe("6-12-months");
    expect(canonicalAgeSlug("6-12-months")).toBe("6-12-months");

    expect(canonicalAgeSlug("3")).toBe("0-6-months");
    expect(canonicalAgeSlug("24-36-months")).toBe("2-3-years");
    expect(canonicalAgeSlug("3-4-years")).toBe("3-plus-years");
  });

  it("is idempotent — a canonical slug maps to itself", () => {
    for (const slug of Object.values(CANONICAL_AGE_SLUG_BY_MONTHS)) {
      expect(canonicalAgeSlug(slug)).toBe(slug);
    }
  });

  it("groups every known param so that one age never has two canonical URLs", () => {
    const canonicalByAge = new Map<number, Set<string>>();
    const allParams = [
      ...AGE_MONTHS.map(String),
      ...Object.keys(AGE_SLUG_TO_MONTHS),
    ];

    for (const param of allParams) {
      const months = resolveAgeParam(param);
      expect(months).not.toBeNull();
      const set = canonicalByAge.get(months as number) ?? new Set<string>();
      set.add(canonicalAgeSlug(param));
      canonicalByAge.set(months as number, set);
    }

    for (const [months, canonicals] of canonicalByAge) {
      expect(
        canonicals.size,
        `age ${months} resolved to multiple canonical slugs: ${[...canonicals].join(", ")}`
      ).toBe(1);
    }
  });

  it("folds boundary ages into the band they open", () => {
    // These four opened a band rather than sitting inside one, so they used to
    // be self-canonical — leaving `/best-toys/6` competing with
    // `/best-toys/6-12-months` over a near-identical list of toys, on a URL the
    // sitemap deliberately omits.
    expect(canonicalAgeSlug("6")).toBe("6-12-months");
    expect(canonicalAgeSlug("12")).toBe("1-2-years");
    expect(canonicalAgeSlug("24")).toBe("2-3-years");
    expect(canonicalAgeSlug("36")).toBe("3-plus-years");
  });

  it("canonicalises every age onto a slug the sitemap lists", () => {
    for (const param of [
      ...AGE_MONTHS.map(String),
      ...Object.keys(AGE_SLUG_TO_MONTHS),
    ]) {
      expect(CANONICAL_AGE_SLUGS, `param ${param}`).toContain(
        canonicalAgeSlug(param)
      );
    }
  });

  it("orders the canonical age slugs youngest first", () => {
    expect(CANONICAL_AGE_SLUGS).toEqual([
      "0-6-months",
      "6-12-months",
      "1-2-years",
      "2-3-years",
      "3-plus-years",
    ]);
  });

  it("returns the param untouched when it does not resolve to an age", () => {
    expect(canonicalAgeSlug("banana")).toBe("banana");
    expect(canonicalAgeSlug("")).toBe("");
  });
});

describe("formatAgeParamLabel", () => {
  it("produces a human-readable label for named slugs", () => {
    expect(formatAgeParamLabel("1-2-years")).toBe("1–2 years");
    expect(formatAgeParamLabel("3-plus-years")).toBe("3+ years");
    expect(formatAgeParamLabel("0-6-months")).toBe("0–6 months");
  });

  it("falls back to month-based labels for numeric params", () => {
    expect(formatAgeParamLabel("3")).toBe("3 months");
    expect(formatAgeParamLabel("12")).toBe("1 year");
    expect(formatAgeParamLabel("24")).toBe("2 years");
  });
});
