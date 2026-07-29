/**
 * The one-line editorial verdict shown on a review, and the single score
 * disclaimer that accompanies it.
 *
 * WHY THIS IS CENTRALISED
 * Reviews previously led with "Our verdict: a 95/100 safety pick". Two problems:
 * a "safety pick" reads as SafeNest endorsing the product as safe, which no
 * evidence here supports; and it printed the score with no indication of how
 * well-supported that score actually is, which is the distinction the whole
 * evidence model exists to make. The verdict now always carries its confidence.
 *
 * The score is suppressed entirely when the evidence is classified as
 * insufficient — publishing "42/100" off the back of nothing would assert a
 * precision the data cannot support.
 */

import type { EvidenceConfidence } from "@/lib/scoring/evidence-status";

/**
 * The single score/evidence disclaimer for a review page.
 *
 * One disclaimer, stated once. The page previously carried several overlapping
 * versions of this, which made each one easier to skip.
 */
export const SCORE_EVIDENCE_DISCLAIMER =
  "SafeNest scores are editorial research tools based on publicly available information. Evidence confidence describes how well that information is supported. Neither is a certification, guarantee, endorsement or substitute for manufacturer instructions and official recall notices.";

/** Human-readable confidence word used inside the verdict sentence. */
const CONFIDENCE_WORD: Record<EvidenceConfidence, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
  insufficient: "Insufficient",
};

export interface VerdictInput {
  /** The published editorial safety score, 0-100. */
  score: number | null | undefined;
  confidence: EvidenceConfidence;
}

export interface Verdict {
  /** The sentence to display. */
  text: string;
  /** False when the evidence does not support publishing a precise score. */
  showsScore: boolean;
}

/**
 * Build the editorial verdict line.
 *
 * Examples:
 *   { score: 95, confidence: "medium" }
 *     -> "SafeNest editorial safety assessment: 95/100 — Medium evidence confidence."
 *   { score: 85, confidence: "low" }
 *     -> "... 85/100 — Low evidence confidence. Interpret the score cautiously
 *         because important claims have limited supporting evidence."
 *   { score: 42, confidence: "insufficient" }
 *     -> "SafeNest could not produce a sufficiently supported editorial safety
 *         assessment for this product."
 */
export function editorialVerdict({ score, confidence }: VerdictInput): Verdict {
  // Insufficient evidence suppresses the number, regardless of what is stored.
  if (confidence === "insufficient" || typeof score !== "number" || !Number.isFinite(score)) {
    return {
      text: "SafeNest could not produce a sufficiently supported editorial safety assessment for this product.",
      showsScore: false,
    };
  }

  const rounded = Math.round(score);
  const base = `SafeNest editorial safety assessment: ${rounded}/100 \u2014 ${CONFIDENCE_WORD[confidence]} evidence confidence.`;

  if (confidence === "low") {
    return {
      text: `${base} Interpret the score cautiously because important claims have limited supporting evidence.`,
      showsScore: true,
    };
  }

  return { text: base, showsScore: true };
}
