import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EvidenceSection } from "./EvidenceSection";
import { assessSafety } from "@/lib/scoring/assess-safety";
import type { EvidenceStatus } from "@/lib/scoring/evidence-status";

/**
 * Regression tests for the evidence-factor ordering defect.
 *
 * Production HTML rendered the fourth factor ("Certification claims") *after*
 * "How we assessed this toy", the testing and certification disclosures, the
 * recall check and a Buy link, because the factor list and the disclosure lived
 * in two separate components and React streamed the trailing `<li>` into a
 * `<template>` placeholder later in the document.
 *
 * These assertions are made against real rendered markup, not the JSX source, so
 * they fail if the order regresses for any reason — nesting, a stray fragment, a
 * new component boundary, or a reintroduced conditional branch.
 */

const FACTOR_LABELS = [
  "Material safety",
  "Choking risk",
  "Recall history",
  "Certification claims",
];

/** The blocks that must all follow the four factors, in this order. */
const TRAILING_BLOCKS = [
  "How we assessed this toy",
  "Testing status",
  "Certifications",
  "Recall check",
  "Who assessed this, and when",
  "Report a correction",
  "affiliate disclosure",
];

function render(
  overrides: {
    evidence?: Record<string, EvidenceStatus>;
    recallCheckedAt?: string | null;
    storedScore?: number;
    certifications?: string[] | null;
  } = {}
) {
  const assessment = assessSafety(
    {
      materialSafety: 90,
      chokingRisk: 88,
      recallHistory: 95,
      certificationPresence: 80,
    },
    overrides.evidence ?? {},
    { recallCheckedAt: overrides.recallCheckedAt ?? "2026-07-28T12:00:00.000Z" }
  );
  return renderToStaticMarkup(
    <EvidenceSection
      assessment={assessment}
      storedScore={overrides.storedScore ?? 92}
      certifications={
        overrides.certifications === undefined
          ? ["ASTM F963"]
          : overrides.certifications
      }
      recallCheckedAt={overrides.recallCheckedAt ?? "2026-07-28T12:00:00.000Z"}
      hasActiveRecall={false}
      reviewedBy="Vanessa Mulkey"
      publishedAt="2026-01-05T00:00:00.000Z"
      lastReviewedAt="2026-07-01T00:00:00.000Z"
    />
  );
}

/** Index of a string in the markup, asserting it is present exactly once. */
function positionOf(html: string, needle: string): number {
  const i = html.indexOf(needle);
  expect(i, `"${needle}" is missing from the rendered markup`).toBeGreaterThan(-1);
  return i;
}

describe("EvidenceSection factor ordering", () => {
  it("renders all four factors in the published order", () => {
    const html = render();
    const positions = FACTOR_LABELS.map((l) => positionOf(html, l));
    for (let i = 1; i < positions.length; i++) {
      expect(
        positions[i],
        `${FACTOR_LABELS[i]} must follow ${FACTOR_LABELS[i - 1]}`
      ).toBeGreaterThan(positions[i - 1]);
    }
  });

  it("places 'Certification claims' after 'Recall history' and before 'How we assessed this toy'", () => {
    // This is the acceptance criterion for the reported defect.
    const html = render();
    const recall = positionOf(html, "Recall history");
    const cert = positionOf(html, "Certification claims");
    const how = positionOf(html, "How we assessed this toy");
    expect(cert).toBeGreaterThan(recall);
    expect(cert).toBeLessThan(how);
  });

  it("renders the four factors as sibling <li> elements of a single list", () => {
    const html = render();
    const listMatch = html.match(/<ol[^>]*>([\s\S]*?)<\/ol>/);
    expect(listMatch, "expected a single <ol> holding the factors").not.toBeNull();
    const list = listMatch![1];
    for (const label of FACTOR_LABELS) {
      expect(list, `${label} must be inside the factor list`).toContain(label);
    }
    // Exactly four siblings, and no nested list smuggling one in.
    expect(list.match(/<li[\s>]/g)?.length).toBe(4);
    expect(list).not.toContain("<ol");
  });

  it("keeps every trailing block after all four factors", () => {
    const html = render();
    const lastFactor = Math.max(...FACTOR_LABELS.map((l) => positionOf(html, l)));
    for (const block of TRAILING_BLOCKS) {
      expect(
        positionOf(html, block),
        `"${block}" must render after the four evidence factors`
      ).toBeGreaterThan(lastFactor);
    }
  });

  it("orders the trailing blocks as specified", () => {
    const html = render();
    const positions = TRAILING_BLOCKS.map((b) => positionOf(html, b));
    for (let i = 1; i < positions.length; i++) {
      expect(
        positions[i],
        `"${TRAILING_BLOCKS[i]}" must follow "${TRAILING_BLOCKS[i - 1]}"`
      ).toBeGreaterThan(positions[i - 1]);
    }
  });

  it("holds the order for every evidence-status combination", () => {
    // The defect only showed on some factor/status combinations, so the order is
    // checked across the statuses that change which branches render.
    const statuses: EvidenceStatus[] = [
      "official_documentation",
      "verified_documentation",
      "manufacturer_reported",
      "retailer_reported",
      "secondary_source",
      "no_evidence_found",
      "conflicting_information",
    ];
    for (const status of statuses) {
      const html = render({
        evidence: {
          materialSafety: status,
          chokingRisk: status,
          recallHistory: status,
          certificationPresence: status,
        },
      });
      const cert = html.indexOf("Certification claims");
      const recall = html.indexOf("Recall history");
      const how = html.indexOf("How we assessed this toy");
      expect(cert, `status=${status}`).toBeGreaterThan(recall);
      expect(cert, `status=${status}`).toBeLessThan(how);
    }
  });

  it("does not use CSS to reorder what the markup says", () => {
    // Visual order and screen-reader order must agree, so no order utilities,
    // and no flex/grid direction reversal around the factor list.
    const html = render();
    expect(html).not.toMatch(/class="[^"]*\border-(first|last|\d+)\b/);
    expect(html).not.toMatch(/flex-(col|row)-reverse/);
    expect(html).not.toMatch(/style="[^"]*order\s*:/);
  });
});

describe("EvidenceSection score and disclaimer de-duplication", () => {
  it("states the editorial score exactly once", () => {
    // Matched as "<score>/100" so SVG path coordinates that happen to contain
    // the digits are not counted.
    const html = render({ storedScore: 92 });
    expect(html.match(/\b92\/100\b/g)?.length).toBe(1);
    // And the score must not appear as a standalone figure elsewhere.
    expect(html).not.toMatch(/>92</);
  });

  it("carries exactly one score/evidence disclaimer", () => {
    const html = render();
    expect(
      html.match(/SafeNest scores are editorial research tools/g)?.length
    ).toBe(1);
    // The superseded wording must not come back alongside it.
    expect(html).not.toContain("SafeNest scores are an editorial research tool");
  });

  it("renders no duplicate 'Scores' heading", () => {
    const html = render();
    expect(html).not.toMatch(/<dt[^>]*>\s*Scores\s*<\/dt>/);
  });

  it("states the score together with its confidence in the heading", () => {
    const html = render({ storedScore: 95 });
    expect(html).toContain(
      "SafeNest editorial safety assessment: 95/100 \u2014 Medium evidence confidence."
    );
    expect(html).not.toContain("safety pick");
    expect(html).not.toContain("Our verdict");
  });

  it("publishes no exact score when the evidence is insufficient", () => {
    const html = render({
      evidence: {
        materialSafety: "no_evidence_found",
        chokingRisk: "no_evidence_found",
        recallHistory: "no_evidence_found",
        certificationPresence: "no_evidence_found",
      },
      recallCheckedAt: null,
      storedScore: 85,
    });
    expect(html).toContain(
      "SafeNest could not produce a sufficiently supported editorial safety assessment"
    );
    expect(html).not.toContain("85");
    expect(html).not.toContain("/100");
  });

  it("preserves the official-government classification for recall evidence", () => {
    const html = render({ recallCheckedAt: "2026-07-28T12:00:00.000Z" });
    expect(html).toContain("Official government source");
  });

  it("keeps the testing-limitation, correction and affiliate disclosures", () => {
    const html = render();
    expect(html).toContain("Not independently laboratory tested by SafeNest");
    expect(html).toContain("we do not certify products");
    expect(html).toContain("/contact");
    expect(html).toContain("/transparency#affiliate");
  });

  it("carries no unsupported price or endorsement language", () => {
    const html = render();
    for (const banned of [
      "See the latest price",
      "latest price",
      "Best price",
      "Buy now",
      "safety pick",
      "SafeNest approved",
      "recommended as safe",
    ]) {
      expect(html, `"${banned}" must not appear`).not.toContain(banned);
    }
  });
});
