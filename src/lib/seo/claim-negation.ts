/**
 * Negation detection for the prohibited-claim scanners.
 *
 * This lives in src/ rather than scripts/ so `npm test` covers it. The logic
 * matters more than it looks: the first version of the stale-claim scanner
 * reported 373 violations against production and every single one was the site's
 * own disclaimer — sentences like "an editorial assessment based on publicly
 * available information — not laboratory testing or certification" and "We do not
 * physically or laboratory test toys".
 *
 * Those are the exact statements SafeNest is required to publish. A scanner that
 * flags them trains whoever runs it to delete the truth, which is a worse outcome
 * than having no scanner. So the pattern match is only half the check; whether the
 * match sits inside a negation is the other half.
 */

/** Words that invert a claim when they appear shortly before it. */
export const NEGATORS = [
  "not",
  "never",
  "without",
  "no",
  "cannot",
  "does not",
  "do not",
  "did not",
  "isn't",
  "aren't",
  "doesn't",
  "don't",
  "rather than",
  "instead of",
] as const;

/**
 * How far back to look for a negator, in characters.
 *
 * 90 is tuned to the real disclaimer sentences: "an editorial assessment based on
 * publicly available information — not laboratory testing" puts 30 characters
 * between the negator and the claim, and "SafeNest does not perform physical or
 * laboratory testing" about 40. Much shorter misses them; much longer starts
 * swallowing an unrelated preceding sentence and suppressing real findings.
 */
export const NEGATION_WINDOW = 90;

/**
 * Whether a match at `index` is negated by preceding text.
 *
 * Apostrophes are matched loosely because copy uses both ' and ’.
 */
export function isNegated(content: string, index: number): boolean {
  const before = content
    .slice(Math.max(0, index - NEGATION_WINDOW), index)
    .toLowerCase();
  return NEGATORS.some((n) =>
    new RegExp(`\\b${n.replace(/'/g, "['’]")}\\b`).test(before)
  );
}

/**
 * Claims that must never reach a crawler unnegated, with the reason each is
 * prohibited. Regexes rather than literals so inflections are covered — the
 * pre-existing scanner forbade "lab tested" and "laboratory tested" but not
 * "lab testing", so "independent lab testing" walked straight through it.
 */
export const PROHIBITED_CLAIMS: ReadonlyArray<readonly [RegExp, string]> = [
  [/expert[\s-]*reviewed/i, "SafeNest has no expert reviewers"],
  // Distinct from the above: \b stops this matching "reviewed", so it catches the
  // bare noun phrase "expert review" that the -ed pattern misses.
  [/expert[\s-]*review\b/i, "implies a credentialled reviewer"],
  [/\bsafety experts?\b/i, "no expert is on staff"],
  [/independent(ly)?\s+lab(oratory)?\s+test/i, "no laboratory testing is performed"],
  [/\blab(oratory)?\s+test(ed|ing|s)?\b/i, "no laboratory testing is performed"],
  [/independently\s+tested/i, "nothing is independently tested"],
  [/\bwe\s+tested\b/i, "nothing is physically tested"],
  [/parent[\s-]*tested/i, "reviews are researched, not tested"],
  [/safety[\s-]*tested/i, "nothing is safety tested"],
  [/certified\s+(safe|by\s+safenest)/i, "SafeNest certifies nothing"],
  [/(guaranteed|proven|completely)\s+safe/i, "safety is never guaranteed"],
  [/cpsc[\s-]*approved/i, "the CPSC approves nothing"],
  [/\bsafenest\s+approved\b/i, "SafeNest approves nothing"],
  [/aggregate\s*rating/i, "an editorial score is not a customer rating"],
];

/**
 * Find prohibited claims in a body of text, skipping negated occurrences.
 * Returns one finding per pattern at most, which is enough to act on.
 */
export function findProhibitedClaims(
  content: string
): Array<{ pattern: string; reason: string; excerpt: string }> {
  const findings: Array<{ pattern: string; reason: string; excerpt: string }> = [];
  for (const [pattern, reason] of PROHIBITED_CLAIMS) {
    const rx = new RegExp(pattern.source, "gi");
    let hit: RegExpExecArray | null;
    while ((hit = rx.exec(content)) !== null) {
      if (isNegated(content, hit.index)) continue;
      const from = Math.max(0, hit.index - 70);
      findings.push({
        pattern: pattern.source,
        reason,
        excerpt: content.slice(from, hit.index + hit[0].length + 60).trim(),
      });
      break;
    }
  }
  return findings;
}
