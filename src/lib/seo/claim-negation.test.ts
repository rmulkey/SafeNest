import { describe, it, expect } from "vitest";
import {
  isNegated,
  findProhibitedClaims,
  PROHIBITED_CLAIMS,
  NEGATION_WINDOW,
} from "./claim-negation";

/**
 * Every "disclaimer" case below is a real sentence taken from production copy on
 * /about, / and /transparency. The first version of the stale-claim scanner
 * reported 373 findings against the live site and all of them were sentences like
 * these. Acting on that output would have deleted the language SafeNest is
 * required to publish, so both directions are asserted: disclaimers must pass,
 * genuine claims must still fail.
 */

const LAB = /\blab(oratory)?\s+test(ed|ing|s)?\b/i;
const EXPERT = /expert[\s-]*reviewed/i;

describe("isNegated", () => {
  const disclaimers: Array<[string, RegExp, string]> = [
    [
      "an editorial assessment based on publicly available information — not laboratory testing or certification.",
      LAB,
      "from /about",
    ],
    [
      "age guidance when it is available. We do not physically or laboratory test toys.",
      LAB,
      "from the homepage",
    ],
    [
      "SafeNest does not perform physical or laboratory testing, does not certify, guarantee, approve, or endorse products.",
      LAB,
      "from /transparency",
    ],
    [
      "We rely on published documentation rather than laboratory testing.",
      LAB,
      "'rather than'",
    ],
    [
      "Scores are editorial and involve no laboratory testing of any kind.",
      LAB,
      "'no'",
    ],
    [
      "This content is never expert reviewed, because we employ no experts.",
      EXPERT,
      "'never'",
    ],
  ];

  it.each(disclaimers)(
    "treats a real disclaimer as negated: %s",
    (text, pattern) => {
      const m = text.match(pattern);
      expect(m, "pattern should match the text at all").not.toBeNull();
      expect(isNegated(text, m!.index!)).toBe(true);
    }
  );

  const claims: Array<[string, RegExp, string]> = [
    [
      "Every toy receives independent laboratory testing before we score it.",
      LAB,
      "prohibited claim",
    ],
    ["Our laboratory testing confirms the materials are safe.", LAB, "no negator"],
    ["All 138 toys are expert reviewed by our safety team.", EXPERT, "expert reviewed"],
  ];

  it.each(claims)("still flags a genuine claim: %s", (text, pattern) => {
    const m = text.match(pattern);
    expect(m).not.toBeNull();
    expect(isNegated(text, m!.index!)).toBe(false);
  });

  it("does not reach past the window for a negator", () => {
    // A negator far enough back belongs to a different sentence and must not
    // suppress a real claim.
    const filler = "x".repeat(NEGATION_WINDOW + 40);
    const text = `We do not sell toys. ${filler} Our laboratory testing is thorough.`;
    const m = text.match(LAB)!;
    expect(isNegated(text, m.index!)).toBe(false);
  });

  it("handles a curly apostrophe in a negator", () => {
    const text = "SafeNest doesn’t do laboratory testing of any kind.";
    const m = text.match(LAB)!;
    expect(isNegated(text, m.index!)).toBe(true);
  });
});

describe("findProhibitedClaims", () => {
  it("returns nothing for a page of pure disclaimers", () => {
    const page = [
      "SafeNest does not physically or laboratory test toys.",
      "It does not certify, guarantee, approve or endorse products.",
      "This is an editorial assessment, not laboratory testing or certification.",
      "Reviews are researched from published information, never expert reviewed.",
    ].join(" ");
    expect(findProhibitedClaims(page)).toEqual([]);
  });

  it("catches the inflection the older scanner missed", () => {
    // The pre-existing FORBIDDEN list had "lab tested" and "laboratory tested"
    // but not "lab testing", so this exact phrasing passed through it.
    const found = findProhibitedClaims(
      "Each product undergoes independent lab testing at our facility."
    );
    expect(found.length).toBeGreaterThan(0);
    expect(found.map((f) => f.reason)).toContain(
      "no laboratory testing is performed"
    );
  });

  it("catches an editorial score presented as an aggregate rating", () => {
    const found = findProhibitedClaims(
      "The SafeNest score is shown as an AggregateRating of 4.8 from our readers."
    );
    expect(found.map((f) => f.reason)).toContain(
      "an editorial score is not a customer rating"
    );
  });

  it("reports at most one finding per pattern", () => {
    const repeated = "We tested it. We tested it again. We tested it a third time.";
    const found = findProhibitedClaims(repeated);
    const forWeTested = found.filter((f) => /we\\s\+tested/.test(f.pattern));
    expect(forWeTested.length).toBeLessThanOrEqual(1);
  });

  it("keeps a reason for every prohibited pattern", () => {
    for (const [pattern, reason] of PROHIBITED_CLAIMS) {
      expect(reason, `${pattern.source} needs a reason`).toBeTruthy();
      expect(reason.length).toBeGreaterThan(10);
    }
  });
});

describe("scripts/audit-stale-claims.mjs stays in sync", () => {
  /**
   * The crawler is a .mjs script so it cannot import this .ts module without a
   * build step, which means the pattern list exists twice. Duplicated
   * compliance logic drifting apart is a real failure mode — someone adds a
   * prohibited phrase to one list, the other keeps passing, and the gap is
   * invisible. This asserts the two lists match rather than hoping they do.
   */
  it("uses the same prohibited patterns as this module", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("scripts/audit-stale-claims.mjs", "utf8");

    const block = src.match(/const FORBIDDEN = \[([\s\S]*?)\n\];/);
    expect(block, "FORBIDDEN array not found in the script").not.toBeNull();

    const scriptPatterns = [...block![1].matchAll(/\[\s*(\/(?:[^/\\]|\\.)+\/[a-z]*)\s*,/g)]
      .map((m) => m[1])
      .sort();
    const modulePatterns = PROHIBITED_CLAIMS.map(
      ([re]) => `/${re.source}/${re.flags}`
    ).sort();

    // The script carries one extra pattern the module does not need, so compare
    // as sets and report precisely what diverged.
    const onlyInScript = scriptPatterns.filter((p) => !modulePatterns.includes(p));
    const onlyInModule = modulePatterns.filter((p) => !scriptPatterns.includes(p));

    expect(
      { onlyInScript, onlyInModule },
      "prohibited-claim patterns have drifted between the script and this module"
    ).toEqual({ onlyInScript: [], onlyInModule: [] });
  });
});
