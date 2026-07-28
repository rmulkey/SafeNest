/**
 * Render-time qualification of absolute safety claims in legacy content.
 *
 * THE PROBLEM
 * 91 of 132 published reviews contain unqualified absolute statements that were
 * seeded from manufacturer and retailer marketing copy, for example:
 *   "All cups are large diameter (2.5 inches+). No choking hazard. Safe for 6m+."
 * SafeNest performs no physical testing and cannot support "no choking hazard" or
 * "safe for 6m+" as statements of fact. Editing 91 documents by hand would be slow,
 * error-prone, and would silently rewrite the operator's content.
 *
 * THE APPROACH
 * Qualify at render time instead. The stored text is never mutated, so nothing is
 * silently deleted and an editor can still see and revise the original. What the
 * reader sees is attributed and hedged:
 *
 *   - Absolute safety verdicts ("no choking hazard", "safe from birth") are
 *     rewritten to attribute them to the manufacturer's labelling.
 *   - Unverifiable absolutes ("completely safe", "100% safe") are removed, since
 *     no attribution makes them acceptable.
 *   - Property claims ("non-toxic", "BPA-free") are marked manufacturer-reported.
 *   - Measurements are marked as published/manufacturer-reported rather than
 *     measured by SafeNest.
 *
 * Rules are ordered and applied once each. `qualifyClaimText` is pure,
 * deterministic, and IDEMPOTENT: rules that add an attribution prefix use a
 * negative lookbehind so re-running never stacks 'manufacturer-reported
 * manufacturer-reported'. This matters because qualified text can be re-fed
 * through the helper by callers that cache rendered output.
 */

export interface QualificationRule {
  /** Matches the absolute phrasing. */
  pattern: RegExp;
  /** Replacement, or null to drop the sentence entirely. */
  replacement: string | null;
  /** Why this is qualified, for documentation and tests. */
  reason: string;
}

/**
 * Ordered rules. More specific patterns must precede more general ones so a
 * general rule does not consume text a specific rule would have handled better.
 */
export const QUALIFICATION_RULES: QualificationRule[] = [
  // ─── Absolute safety verdicts: attribute to the manufacturer ──────────────
  {
    pattern: /\bno choking hazard(?:\s+for\s+[\w+\s]+?)?\b\.?/gi,
    replacement:
      "SafeNest did not identify a small-parts concern in the published product information. SafeNest has not physically measured the product or performed small-parts testing.",
    reason:
      "'No choking hazard' is a test conclusion SafeNest cannot make. Reworded as the limit of what public information supports.",
  },
  {
    pattern: /\bsafe from birth\b\.?/gi,
    replacement:
      "The manufacturer labels this product for use from birth.",
    reason: "Age suitability is the manufacturer's labelling, not a SafeNest finding.",
  },
  {
    pattern: /\bsafe for\s+(\d+)\s*m(?:o|os|onths?)?\s*\+?\.?/gi,
    replacement:
      "The manufacturer labels this product for ages $1 months and older.",
    reason: "Attributes age guidance to the manufacturer rather than asserting safety.",
  },
  {
    pattern: /\bsafe for\s+(\d+)\s*(?:years?|yrs?)\s*\+?\.?/gi,
    replacement:
      "The manufacturer labels this product for ages $1 years and older.",
    reason: "Attributes age guidance to the manufacturer rather than asserting safety.",
  },
  // ─── Unsupportable absolutes: remove, since no attribution rescues them ────
  {
    pattern: /\b(?:completely|totally|100%|entirely)\s+safe\b\.?/gi,
    replacement: null,
    reason: "No evidence can support an absolute safety guarantee.",
  },
  {
    pattern: /\b(?:guaranteed|proven|confirmed|certified)\s+safe\b\.?/gi,
    replacement: null,
    reason: "SafeNest does not certify, guarantee, or prove safety.",
  },
  {
    pattern: /\bpasses the small[\s-]*parts test\b\.?/gi,
    replacement:
      "Published dimensions suggest the parts are larger than the small-parts cylinder. SafeNest has not verified this by testing.",
    reason: "SafeNest runs no small-parts test, so it cannot report a pass.",
  },
  // ─── Dimensions: attribute, never present as independently measured ───────
  {
    pattern: /\ball\s+(\w+)\s+are\s+large diameter\s*\(([\d.]+)\s*inches\+?\)/gi,
    replacement:
      "The manufacturer or retailer reports dimensions of approximately $2 inches or larger.",
    reason:
      "Dimensions come from published product information, not from SafeNest measuring the product.",
  },
  {
    pattern: /\ball\s+(\w+)\s+are\s+([\d.]+)\+?\s*inches(?:\s+(?:in\s+)?diameter)?/gi,
    replacement:
      "The manufacturer or retailer reports dimensions of approximately $2 inches or larger.",
    reason:
      "Dimensions come from published product information, not from SafeNest measuring the product.",
  },
  // ─── Property claims: mark as manufacturer-reported ───────────────────────
  {
    pattern: /(?<!manufacturer-reported\s)\b(non-?toxic)\b/gi,
    replacement: "manufacturer-reported $1",
    reason:
      "Toxicity is a laboratory determination. SafeNest holds no test reports, so the claim is attributed.",
  },
  {
    pattern: /(?<!manufacturer-reported\s)\b(BPA-free|phthalate-free|lead-free|PVC-free|formaldehyde-free)\b/gi,
    replacement: "manufacturer-reported $1",
    reason: "Material composition claims are attributed, not verified.",
  },
  {
    pattern: /\bno small parts\b(?!\s+are described)/gi,
    replacement:
      "No small parts are described in the published product information.",
    reason:
      "Restated as the limit of what the public information shows rather than an inspection finding.",
  },
];

/** Collapse whitespace and repair punctuation left behind by removals. */
function tidy(text: string): string {
  return text
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;])/g, "$1")
    .replace(/([.;])\s*\1+/g, "$1")
    .replace(/\.\s*\./g, ".")
    .replace(/^[\s.;,]+/, "")
    .trim();
}

/** Capitalise the first letter of each sentence after rewriting. */
function recapitalize(text: string): string {
  return text.replace(
    /(^|[.!?]\s+)([a-z])/g,
    (_m, pre, ch) => `${pre}${ch.toUpperCase()}`
  );
}

export interface QualifyResult {
  text: string;
  /** True when any rule fired. */
  changed: boolean;
  /** Reasons for every rule that fired, for auditing. */
  appliedReasons: string[];
}

/**
 * Qualify absolute claims in a single piece of legacy text.
 *
 * Deterministic and non-destructive: the input is never mutated, and unmatched
 * text passes through unchanged.
 */
/**
 * Split text into sentences, keeping their terminal punctuation.
 *
 * Rules are applied per sentence rather than across the whole string. Operating
 * on the whole string produced run-on output in production: replacing
 * "No choking hazard." consumed its full stop, so the following sentence was
 * glued on ("...has not performed physical small-parts testing the manufacturer
 * labels this product for ages 6 months and older"). Sentence boundaries are
 * therefore preserved explicitly.
 */
function splitSentences(text: string): string[] {
  // Split only where terminal punctuation is followed by whitespace and the
  // start of a new sentence. A naive /[^.!?]+/ split broke decimals: "2.5
  // inches" became "2." + "5 inches", silently destroying the measurement.
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Ensure a fragment reads as a sentence: capitalised, single terminal stop. */
function asSentence(fragment: string): string {
  let out = tidy(fragment);
  if (!out) return "";
  out = out.charAt(0).toUpperCase() + out.slice(1);
  if (!/[.!?]$/.test(out)) out += ".";
  return out;
}

export function qualifyClaimText(input: string | null | undefined): QualifyResult {
  if (typeof input !== "string" || !input.trim()) {
    return { text: input ?? "", changed: false, appliedReasons: [] };
  }

  const reasons: string[] = [];
  const outSentences: string[] = [];

  for (const sentence of splitSentences(input)) {
    let current = sentence;
    let dropped = false;

    for (const rule of QUALIFICATION_RULES) {
      // Reset lastIndex: module-level global regexes are reused across calls.
      rule.pattern.lastIndex = 0;
      if (!rule.pattern.test(current)) continue;
      rule.pattern.lastIndex = 0;

      if (rule.replacement === null) {
        // Removing the claim empties the sentence unless other content remains.
        const remainder = tidy(current.replace(rule.pattern, " "));
        reasons.push(rule.reason);
        if (!/[a-z0-9]/i.test(remainder)) {
          dropped = true;
          break;
        }
        current = remainder;
        continue;
      }

      current = current.replace(rule.pattern, rule.replacement);
      reasons.push(rule.reason);
    }

    if (dropped) continue;
    // Replacements may themselves contain multiple sentences; normalise each.
    for (const piece of splitSentences(current)) {
      const s = asSentence(piece);
      if (s) outSentences.push(s);
    }
  }

  if (reasons.length === 0) {
    return { text: input, changed: false, appliedReasons: [] };
  }

  // De-duplicate identical consecutive sentences produced by overlapping rules.
  const deduped = outSentences.filter((s, i) => i === 0 || s !== outSentences[i - 1]);

  return {
    text: deduped.join(" ").trim(),
    changed: true,
    appliedReasons: [...new Set(reasons)],
  };
}

/** Convenience for arrays such as `materials`, `pros`, and `cons`. */
export function qualifyClaimList(
  items: readonly string[] | null | undefined
): string[] {
  if (!Array.isArray(items)) return [];
  return items.map((i) => qualifyClaimText(i).text).filter(Boolean);
}

/**
 * Standing note shown wherever legacy assessment text is displayed, so the reader
 * knows the wording is constrained by what public information supports.
 */
export const QUALIFIED_CLAIM_NOTE =
  "Wording reflects publicly available product information. SafeNest has not physically measured or tested this product.";
