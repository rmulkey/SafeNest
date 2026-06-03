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
  AGE_SLUG_TO_MONTHS,
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
