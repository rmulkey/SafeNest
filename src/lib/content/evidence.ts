/**
 * Canonical vocabulary for describing evidence quality.
 *
 * WHY THIS EXISTS
 * SafeNest is a child-safety publication. Overstating how a product was
 * evaluated is the most damaging mistake this site can make, so the wording used
 * to describe our work is centralised here rather than hand-written per page.
 * That makes unsupported claims hard to reintroduce by accident and easy to test.
 *
 * WHAT SAFENEST ACTUALLY DOES (as of this module's authorship)
 *  - Editorial assessment of publicly available information.
 *  - Recall lookups against the CPSC's public recall API.
 *  - Recording of manufacturer-reported materials and certifications.
 *
 * WHAT SAFENEST DOES NOT DO
 *  - Laboratory testing of any kind.
 *  - Physical destructive or compliance testing.
 *  - Certification of products.
 *  - Employ credentialed product-safety experts (the site is run by parents).
 *
 * Therefore the words "expert reviewed", "lab tested", "certified safe",
 * "proven safe", and "CPSC approved" MUST NOT appear in site copy. See
 * `src/lib/content/claims.test.ts`, which fails the build-time test suite if they
 * reappear.
 */

/**
 * How SafeNest describes its own review work. Accurate and restrained: the
 * research is real and genuinely useful, it simply is not expert or laboratory
 * work.
 */
export const REVIEW_METHOD_LABEL = "parent-researched";
export const REVIEW_METHOD_LABEL_TITLE = "Parent-researched";

/** Longer form for hero/marketing contexts. */
export const REVIEW_METHOD_SENTENCE =
  "Independently researched by parents using publicly available safety information.";

/** Phrases that are banned from user-facing copy, with the reason. */
export const PROHIBITED_CLAIMS: ReadonlyArray<{
  pattern: RegExp;
  reason: string;
}> = [
  {
    pattern: /\bexpert[\s-]*review(ed|s)?\b/i,
    reason:
      "No named, credentialed reviewer with a documented review record exists.",
  },
  {
    pattern: /\b(independent\s+)?lab(oratory)?[\s-]*test(ed|ing)?\b/i,
    reason: "SafeNest performs no laboratory testing and holds no lab reports.",
  },
  {
    pattern: /\bcertified\s+safe\b/i,
    reason: "SafeNest does not certify products.",
  },
  {
    pattern: /\b(proven|guaranteed)\s+safe\b/i,
    reason: "Safety cannot be guaranteed; no testing supports the claim.",
  },
  {
    pattern: /\bCPSC[\s-]*approved\b/i,
    reason:
      "The CPSC does not approve products; it publishes regulations and recalls.",
  },
  {
    pattern: /\bmeets\s+all\s+safety\s+standards\b/i,
    reason: "Unverifiable blanket compliance claim.",
  },
  {
    pattern: /\bclinically\s+proven\b/i,
    reason: "No clinical evidence is held.",
  },
  // ─── Added after these slipped past the first pass ─────────────────────────
  // The initial pattern set missed live homepage copy claiming SafeNest runs the
  // small-parts test, confirms standards compliance, and flags recalls within 24
  // hours. Physical-test and verification verbs are now covered explicitly.
  {
    pattern: /\b(run|runs|perform|performs|conduct|conducts|we do)\s+(the\s+)?small[\s-]*parts?\s+test\b/i,
    reason:
      "SafeNest performs no physical small-parts testing. It reviews published dimensions, construction details, and warnings.",
  },
  {
    pattern: /\bwe\s+(confirm|verify|validate)\s+(which\s+)?(recognized\s+)?(standards?|certifications?|compliance)\b/i,
    reason:
      "SafeNest does not verify certification compliance; it records and attributes manufacturer or retailer claims.",
  },
  {
    pattern: /\b(track|monitor|check)(s|ing)?\s+(CPSC\s+)?recall\s+feeds?\s+daily\b/i,
    reason:
      "Recall coverage is only as current as the last successful sync, which is published on the recalls page.",
  },
  {
    pattern: /\bwithin\s+24\s+hours\b/i,
    reason:
      "No mechanism guarantees a 24-hour response window, so the promise is unverifiable.",
  },
  {
    pattern: /\bstandards?\s+we\s+evaluate\s+against\b/i,
    reason:
      "SafeNest does not evaluate products against safety standards; it records claims made about them.",
  },
  {
    pattern: /\bwe\s+(physically\s+)?test(ed|s)?\s+(every|each|all|the)\b/i,
    reason: "SafeNest performs no physical product testing.",
  },
  // ─── Third pass: found live on /guides and /transparency ───────────────────
  {
    pattern: /\bexpert[\s-]*curat(ed|ion)\b/i,
    reason:
      "No credentialed expert curates the guides; they are parent-researched.",
  },
  {
    pattern: /\bsafety experts?\b/i,
    reason: "SafeNest employs no product-safety experts.",
  },
  {
    pattern: /\bindependently tested\b/i,
    reason: "SafeNest performs and commissions no independent testing.",
  },
  {
    pattern: /\bprofessionally assessed\b/i,
    reason: "Assessments are made by parents, not professionals.",
  },
  {
    pattern: /\bhigher scores? indicate safer\b/i,
    reason:
      "Scores are editorial assessments of available information, not measurements of absolute safety.",
  },
  // ─── Absolute safety verdicts in content ──────────────────────────────────
  // Legacy review text is qualified at render time by
  // src/lib/content/qualify-claims.ts; these patterns stop the raw phrasing from
  // being written into components or templates.
  {
    pattern: /\bno choking hazard\b/i,
    reason:
      "A no-choking-hazard verdict requires physical testing SafeNest does not perform.",
  },
  {
    pattern: /\bsafe from birth\b/i,
    reason:
      "Age suitability must be attributed to the manufacturer's labelling, not asserted.",
  },
  {
    pattern: /\bsafe for\s+\d+\s*(m\b|mo\b|months?\b|years?\b)/i,
    reason:
      "Age suitability must be attributed to the manufacturer's labelling, not asserted.",
  },
  {
    pattern: /\b(completely|totally|100%|entirely)\s+safe\b/i,
    reason: "No available evidence can support an absolute safety claim.",
  },
  {
    pattern: /\bcertified by SafeNest\b/i,
    reason: "SafeNest certifies nothing.",
  },
];

/**
 * Words that invert a claim. "Not independently laboratory tested" is exactly the
 * kind of honest disclosure this module exists to encourage, so a prohibited
 * phrase immediately preceded by a negation is permitted.
 */
const NEGATION = /\b(no|not|never|without|non|neither|nor|isn't|aren't|doesn't|don't|cannot|can't)\b[^.!?;]{0,40}$/i;

/**
 * Scan a string for prohibited safety claims.
 *
 * Negated occurrences are allowed, so "Not independently laboratory tested by
 * SafeNest" passes while "Backed by independent laboratory testing" fails.
 * Returns the offending phrases with reasons so tests and CI report clearly.
 */
export function findProhibitedClaims(
  text: string
): Array<{ match: string; reason: string }> {
  const found: Array<{ match: string; reason: string }> = [];
  for (const { pattern, reason } of PROHIBITED_CLAIMS) {
    // Scan every occurrence, not just the first, so a negated mention earlier in
    // the text cannot mask a genuine violation later.
    const global = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
    for (const m of text.matchAll(global)) {
      const preceding = text.slice(Math.max(0, m.index - 60), m.index);
      if (NEGATION.test(preceding)) continue;
      found.push({ match: m[0], reason });
      break;
    }
  }
  return found;
}

// ─── Evidence status vocabulary ─────────────────────────────────────────────────

/**
 * The provenance of a given piece of information on a review page. Rendering the
 * provenance alongside the fact is what keeps manufacturer claims, regulatory
 * data, and our own opinion from blurring together.
 */
export type EvidenceSource =
  | "manufacturer-reported"
  | "public-regulatory"
  | "editorial-assessment"
  | "first-hand-documented"
  | "unverified";

export const EVIDENCE_LABELS: Record<EvidenceSource, string> = {
  "manufacturer-reported": "Manufacturer-reported",
  "public-regulatory": "Public regulatory data",
  "editorial-assessment": "SafeNest editorial assessment",
  "first-hand-documented": "First-hand observation",
  unverified: "Not independently verified",
};

export const EVIDENCE_EXPLANATIONS: Record<EvidenceSource, string> = {
  "manufacturer-reported":
    "Stated by the manufacturer or seller. SafeNest has not independently confirmed it.",
  "public-regulatory":
    "Sourced from public regulatory data such as the CPSC recall database.",
  "editorial-assessment":
    "SafeNest's own judgement based on publicly available information. It is an editorial opinion, not a test result.",
  "first-hand-documented":
    "Observed directly by a SafeNest reviewer and documented on this page.",
  unverified:
    "SafeNest could not independently verify this. Treat it as unconfirmed.",
};

/** Standing disclaimer for the absence of laboratory testing. */
export const NO_LAB_TESTING_NOTICE =
  "Not independently laboratory tested by SafeNest.";

/** How to describe manufacturer certification claims. */
export function certificationClaimLabel(certification: string): string {
  return `Manufacturer reports compliance with ${certification}`;
}

/**
 * How to describe the result of a recall lookup. The date matters: a recall
 * search is only true as of when it ran.
 */
export function recallSearchStatement(
  checkedAt: Date | string | null | undefined,
  matchFound: boolean
): string {
  if (!checkedAt) {
    return "No recall search has been recorded for this product yet.";
  }
  const date = new Date(checkedAt);
  if (Number.isNaN(date.getTime())) {
    return "No recall search has been recorded for this product yet.";
  }
  const iso = date.toISOString().slice(0, 10);
  return matchFound
    ? `A matching CPSC recall was located as of ${iso}. See the official notice for instructions.`
    : `No matching CPSC recall was located as of ${iso}.`;
}

/** The score is an editorial tool, never a certification. */
export const SCORE_DISCLAIMER =
  "SafeNest scores are an editorial research tool, not a safety certification, endorsement, or guarantee. Always follow the manufacturer's age guidance and the official recall notice.";
