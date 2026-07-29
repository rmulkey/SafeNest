import { describe, it, expect } from "vitest";
import {
  formatAge,
  formatAgeRange,
  pluralize,
  manufacturerAgeGuidance,
} from "./format-age";

describe("pluralize", () => {
  it("is singular for exactly one", () => {
    expect(pluralize(1, "month")).toBe("1 month");
    expect(pluralize(1, "year")).toBe("1 year");
  });

  it("is plural for everything else", () => {
    expect(pluralize(0, "month")).toBe("0 months");
    expect(pluralize(2, "month")).toBe("2 months");
    expect(pluralize(11, "year")).toBe("11 years");
  });
});

describe("formatAge", () => {
  it("reads zero months as Birth", () => {
    expect(formatAge(0)).toBe("Birth");
  });

  it("uses singular for one month and one year", () => {
    expect(formatAge(1)).toBe("1 month");
    expect(formatAge(12)).toBe("1 year");
  });

  it("uses months below a year", () => {
    expect(formatAge(6)).toBe("6 months");
    expect(formatAge(11)).toBe("11 months");
  });

  it("uses months for non-whole years under two", () => {
    expect(formatAge(18)).toBe("18 months");
  });

  it("uses years at and above whole-year marks", () => {
    expect(formatAge(24)).toBe("2 years");
    expect(formatAge(36)).toBe("3 years");
    expect(formatAge(96)).toBe("8 years");
  });

  it("handles invalid input without producing nonsense", () => {
    expect(formatAge(NaN)).toBe("Age not specified");
    expect(formatAge(-5)).toBe("Age not specified");
  });
});

describe("formatAgeRange", () => {
  it("never produces the '1 years' bug seen on the guides page", () => {
    // Regression: the guides page rendered "1 years" and "0 months – 1 years".
    for (let lo = 0; lo <= 120; lo++) {
      for (const hi of [lo, lo + 1, lo + 6, lo + 12, lo + 24]) {
        const out = formatAgeRange(lo, hi);
        expect(out, `lo=${lo} hi=${hi} -> ${out}`).not.toMatch(/\b1 years\b/);
        expect(out).not.toMatch(/\b1 months\b/);
      }
    }
  });

  it("formats month-only ranges", () => {
    expect(formatAgeRange(6, 11)).toBe("6\u201311 months");
    expect(formatAgeRange(3, 9)).toBe("3\u20139 months");
  });

  it("states the unit once when both bounds are months, including up to 12", () => {
    // A 6-to-12-month toy is labelled "6–12 months" on its own packaging;
    // "6 months–12 months" is redundant and "6 months–1 year" reads as a
    // different range to a parent scanning cards.
    expect(formatAgeRange(6, 12)).toBe("6\u201312 months");
    expect(formatAgeRange(9, 12)).toBe("9\u201312 months");
  });

  it("reads a range starting at birth as Birth", () => {
    expect(formatAgeRange(0, 12)).toBe("Birth\u201312 months");
    expect(formatAgeRange(0, 6)).toBe("Birth\u20136 months");
    expect(formatAgeRange(0, 24)).toBe("Birth\u201324 months");
  });

  it("shares the unit for whole-year ranges", () => {
    expect(formatAgeRange(12, 24)).toBe("1\u20132 years");
    expect(formatAgeRange(24, 36)).toBe("2\u20133 years");
    expect(formatAgeRange(36, 96)).toBe("3\u20138 years");
    expect(formatAgeRange(12, 36)).toBe("1\u20133 years");
  });

  it("shares the unit for sub-two-year month ranges", () => {
    expect(formatAgeRange(15, 18)).toBe("15\u201318 months");
    expect(formatAgeRange(12, 18)).toBe("12\u201318 months");
  });

  it("spells out both sides for mixed units", () => {
    expect(formatAgeRange(6, 24)).toBe("6 months\u20132 years");
    expect(formatAgeRange(18, 48)).toBe("18 months\u20134 years");
    expect(formatAgeRange(18, 36)).toBe("18 months\u20133 years");
  });

  it("never repeats the unit on both sides of a shared-unit range", () => {
    // Regression: the guides page rendered "2 years–3 years".
    for (let lo = 0; lo <= 120; lo++) {
      for (const hi of [lo + 1, lo + 3, lo + 6, lo + 12, lo + 24, lo + 60]) {
        const out = formatAgeRange(lo, hi);
        expect(out, `lo=${lo} hi=${hi} -> ${out}`).not.toMatch(
          /\byears?\u2013\d+\s+years?\b/
        );
        expect(out, `lo=${lo} hi=${hi} -> ${out}`).not.toMatch(
          /\bmonths?\u2013\d+\s+months?\b/
        );
      }
    }
  });

  it("collapses equal bounds instead of '2–2 years'", () => {
    expect(formatAgeRange(24, 24)).toBe("2 years");
    expect(formatAgeRange(6, 6)).toBe("6 months");
  });

  it("collapses an inverted range rather than rendering it backwards", () => {
    expect(formatAgeRange(24, 12)).toBe("2 years");
  });

  it("handles open-ended and missing bounds", () => {
    expect(formatAgeRange(12, NaN)).toBe("1 year+");
    expect(formatAgeRange(NaN, 12)).toBe("Up to 1 year");
    expect(formatAgeRange(NaN, NaN)).toBe("Age not specified");
  });

  it("always uses an en dash, never a hyphen with spaces", () => {
    expect(formatAgeRange(6, 12)).not.toContain(" - ");
    expect(formatAgeRange(6, 12)).toContain("\u2013");
  });
});

describe("manufacturerAgeGuidance", () => {
  it("attributes the age range to the manufacturer", () => {
    expect(manufacturerAgeGuidance(12, 24)).toBe(
      "Manufacturer guidance: 1\u20132 years"
    );
  });

  it("never asserts safety", () => {
    expect(manufacturerAgeGuidance(0, 12).toLowerCase()).not.toContain("safe");
  });
});
