import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { findProhibitedClaims, PROHIBITED_CLAIMS } from "./evidence";

/**
 * Guardrail against unsupported safety claims re-entering user-facing copy.
 *
 * SafeNest performs no laboratory testing, certifies nothing, and employs no
 * credentialed product-safety experts. Copy such as "expert reviewed",
 * "independent lab testing", "certified safe", or "CPSC approved" is therefore
 * false. These claims were previously live on the homepage, footer, Open Graph
 * image, and several category pages; this test fails the suite if any returns.
 */

const ROOTS = ["src/app", "src/components"];
const SOURCE_EXT = new Set([".tsx", ".ts"]);

/** Files that legitimately contain the phrases (definitions and tests). */
const ALLOWLIST = [
  "src/lib/content/evidence.ts",
  "src/lib/content/claims.test.ts",
  "src/lib/content/validation.ts",
  "src/lib/content/validation.test.ts",
];

/**
 * Strip comments before scanning. Code comments legitimately discuss the banned
 * phrases (explaining why they were removed); only shipped copy matters here.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ");
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (SOURCE_EXT.has(extname(entry))) {
      out.push(full);
    }
  }
  return out;
}

function sourceFiles(): string[] {
  return ROOTS.flatMap((r) => walk(r)).filter(
    (f) =>
      !ALLOWLIST.some((a) => f.endsWith(a)) &&
      !f.endsWith(".test.ts") &&
      !f.endsWith(".test.tsx")
  );
}

describe("findProhibitedClaims", () => {
  it("flags each prohibited claim with a reason", () => {
    const cases = [
      "Every toy is expert reviewed by our team.",
      "Backed by independent lab testing.",
      "This toy is lab-tested for safety.",
      "A certified safe choice for infants.",
      "Guaranteed safe for newborns.",
      "Proven safe in every scenario.",
      "This product is CPSC approved.",
      "It meets all safety standards.",
      "Clinically proven to aid development.",
    ];
    for (const c of cases) {
      const found = findProhibitedClaims(c);
      expect(found.length, `expected a violation in: ${c}`).toBeGreaterThan(0);
      expect(found[0].reason).toBeTruthy();
    }
  });

  it("flags the physical-testing and verification claims that slipped past the first pass", () => {
    // All three were live homepage copy in TrustSection ("Built on evidence, not
    // marketing") while review pages simultaneously disclosed that no testing
    // occurs. The pattern set now covers them.
    const cases = [
      "We examine materials and run the small-parts test against the 1.75-inch choking-hazard standard.",
      "We confirm which recognized standards a toy meets — ASTM F963, CPSIA, and EN 71.",
      "We track CPSC recall feeds daily and flag any affected product on its review within 24 hours.",
      "Safety standards we evaluate against",
      "We test every toy before recommending it.",
      "We verify certifications for each product.",
    ];
    for (const c of cases) {
      const found = findProhibitedClaims(c);
      expect(found.length, `expected a violation in: ${c}`).toBeGreaterThan(0);
    }
  });

  it("permits the accurate replacements for those claims", () => {
    const cases = [
      "We review published materials, dimensions, construction details, warnings, and the manufacturer's own age guidance when it is available.",
      "We record which certifications a manufacturer or retailer reports, and label each one by how well it is supported.",
      "We check products against publicly available CPSC recall information and show the date of the latest recorded check.",
      "Safety standards manufacturers commonly cite",
      "We do not physically or laboratory test toys.",
    ];
    for (const c of cases) {
      expect(findProhibitedClaims(c), `false positive on: ${c}`).toEqual([]);
    }
  });

  it("permits accurate, restrained alternatives", () => {
    const cases = [
      "Parent-researched reviews scored for safety.",
      "Manufacturer reports compliance with ASTM F963.",
      "No matching CPSC recall was located as of 2026-07-28.",
      "Editorial assessment based on publicly available information.",
      "Not independently laboratory tested by SafeNest.",
      "Recall data from CPSC.",
      "Independent safety scoring.",
    ];
    for (const c of cases) {
      expect(findProhibitedClaims(c), `false positive on: ${c}`).toEqual([]);
    }
  });

  it("does not flag the word expert used about other parties", () => {
    // We may accurately reference outside expertise without claiming to be it.
    expect(findProhibitedClaims("Consult your pediatrician for advice.")).toEqual([]);
  });

  it("defines a reason for every prohibited pattern", () => {
    for (const rule of PROHIBITED_CLAIMS) {
      expect(rule.reason.length).toBeGreaterThan(10);
    }
  });
});

describe("no unsupported safety claims in app or component source", () => {
  const files = sourceFiles();

  it("scans a meaningful number of source files", () => {
    // Guards against the walker silently matching nothing and passing vacuously.
    expect(files.length).toBeGreaterThan(30);
  });

  it("contains no prohibited safety claims", () => {
    const violations: string[] = [];
    for (const file of files) {
      const text = stripComments(readFileSync(file, "utf-8"));
      for (const { match, reason } of findProhibitedClaims(text)) {
        violations.push(`${file}: "${match}" — ${reason}`);
      }
    }
    expect(violations, violations.join("\n")).toEqual([]);
  });
});

describe("no hard-coded review-count claims", () => {
  it("does not advertise a stale numeric review count", () => {
    // "50+ expert reviews" was live while the catalog held 132 reviews. Counts
    // must come from lib/content/site-stats.ts instead.
    const offenders: string[] = [];
    for (const file of sourceFiles()) {
      const text = stripComments(readFileSync(file, "utf-8"));
      if (/\b\d{2,4}\+\s*(expert|parent-researched|independent)?\s*reviews\b/i.test(text)) {
        offenders.push(file);
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});
