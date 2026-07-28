/**
 * Evidence status and evidence confidence for safety scoring.
 *
 * THE PROBLEM THIS SOLVES
 * The existing scorer accepts a bare 0-100 number per safety factor. That means a
 * factor could score 95 on nothing more than a manufacturer's unverified marketing
 * claim, and the resulting number was displayed with the same authority as a
 * well-documented one. Missing evidence was silently treated as evidence of
 * safety.
 *
 * THE MODEL
 * Each factor now carries an explicit evidence status. Two things follow from it:
 *
 *  1. A CAP on how high that factor may score. An unverified claim cannot earn a
 *     near-perfect factor score, and "no evidence found" cannot earn a passing
 *     one. Caps only ever lower a score, never raise it.
 *  2. A CONFIDENCE weight, aggregated across factors into an overall Evidence
 *     Confidence of High / Medium / Low / Insufficient, published alongside the
 *     score so readers can tell a well-supported assessment from a thin one.
 *
 * Scores remain editorial assessments. Confidence describes how much is actually
 * known — it is deliberately separate from the score itself.
 */

export type EvidenceStatus =
  | "official_documentation"
  | "verified_documentation"
  | "manufacturer_reported"
  | "retailer_reported"
  | "secondary_source"
  | "no_evidence_found"
  | "conflicting_information"
  | "not_applicable";

/** Human-readable labels. Internal identifiers are never shown to readers. */
export const EVIDENCE_STATUS_LABELS: Record<EvidenceStatus, string> = {
  official_documentation: "Official government source",
  verified_documentation: "Supported by accessible documentation",
  manufacturer_reported: "Manufacturer-reported",
  retailer_reported: "Retailer-reported",
  secondary_source: "Secondary source",
  no_evidence_found: "Not found",
  conflicting_information: "Unclear — sources conflict",
  not_applicable: "Not applicable",
};

export const EVIDENCE_STATUS_EXPLANATIONS: Record<EvidenceStatus, string> = {
  official_documentation:
    "Sourced from an official government record, such as the CPSC public recall database. This is the strongest evidence SafeNest works with.",
  verified_documentation:
    "SafeNest located published documentation supporting this, such as a manufacturer specification sheet or a public regulatory record.",
  manufacturer_reported:
    "The manufacturer states this. SafeNest has not independently verified it.",
  retailer_reported:
    "A retailer listing states this. Retailer copy is often less reliable than the manufacturer's own documentation.",
  secondary_source:
    "Reported by a third party rather than the manufacturer or a regulator.",
  no_evidence_found:
    "SafeNest could not find information about this. Absence of information is not evidence of safety.",
  conflicting_information:
    "Sources disagree about this. Treat it as unresolved and check the current packaging.",
  not_applicable: "This factor does not apply to this product.",
};

/**
 * Maximum factor score permitted for each evidence status.
 *
 * Rationale: a claim nobody has verified should not be able to produce a
 * near-perfect factor score. `not_applicable` is uncapped because excluding the
 * factor is handled separately (it is dropped from the weighted average) rather
 * than by penalising it.
 */
export const EVIDENCE_SCORE_CAP: Record<EvidenceStatus, number> = {
  official_documentation: 100,
  verified_documentation: 100,
  manufacturer_reported: 85,
  retailer_reported: 75,
  secondary_source: 70,
  conflicting_information: 60,
  no_evidence_found: 50,
  not_applicable: 100,
};

/**
 * Confidence weight per status, 0-1. Aggregated into Evidence Confidence.
 * `not_applicable` contributes nothing and is excluded from the average.
 */
export const EVIDENCE_CONFIDENCE_WEIGHT: Record<EvidenceStatus, number> = {
  official_documentation: 1,
  verified_documentation: 1,
  manufacturer_reported: 0.6,
  retailer_reported: 0.45,
  secondary_source: 0.35,
  conflicting_information: 0.2,
  no_evidence_found: 0,
  not_applicable: 0,
};

export type EvidenceConfidence = "high" | "medium" | "low" | "insufficient";

export const EVIDENCE_CONFIDENCE_LABELS: Record<EvidenceConfidence, string> = {
  high: "High evidence confidence",
  medium: "Medium evidence confidence",
  low: "Low evidence confidence",
  insufficient: "Insufficient evidence",
};

export const EVIDENCE_CONFIDENCE_EXPLANATIONS: Record<EvidenceConfidence, string> = {
  high: "Most of the important claims about this toy are supported by accessible documentation.",
  medium:
    "The important claims are mostly manufacturer-reported and have not been independently verified.",
  low: "Supporting information is thin, second-hand, or partly contradictory. Treat this assessment cautiously.",
  insufficient:
    "There is not enough information to score this toy meaningfully. SafeNest does not display a precise score in this case.",
};

/**
 * Below this confidence ratio we refuse to present a precise score at all, and
 * show "Insufficient evidence" instead of inventing precision.
 */
export const INSUFFICIENT_CONFIDENCE_THRESHOLD = 0.2;

/** Apply the evidence cap to a raw factor score. Only ever lowers it. */
export function capFactorScore(
  rawScore: number,
  status: EvidenceStatus
): number {
  const clamped = Math.max(0, Math.min(100, rawScore));
  return Math.min(clamped, EVIDENCE_SCORE_CAP[status]);
}

/**
 * Aggregate per-factor evidence statuses into an overall confidence rating.
 *
 * Returns "insufficient" when every factor is not-applicable (nothing to judge)
 * or when the mean confidence weight is at or below the insufficiency threshold.
 */
export function computeEvidenceConfidence(
  statuses: EvidenceStatus[]
): { confidence: EvidenceConfidence; ratio: number } {
  const applicable = statuses.filter((s) => s !== "not_applicable");
  if (applicable.length === 0) return { confidence: "insufficient", ratio: 0 };

  const total = applicable.reduce(
    (sum, s) => sum + EVIDENCE_CONFIDENCE_WEIGHT[s],
    0
  );
  const ratio = total / applicable.length;

  let confidence: EvidenceConfidence;
  if (ratio <= INSUFFICIENT_CONFIDENCE_THRESHOLD) confidence = "insufficient";
  else if (ratio < 0.5) confidence = "low";
  else if (ratio < 0.8) confidence = "medium";
  else confidence = "high";

  return { confidence, ratio: Math.round(ratio * 100) / 100 };
}

/**
 * Parse an unknown value into an EvidenceStatus.
 *
 * Legacy reviews predate this model and have no recorded status. They fall back
 * to `manufacturer_reported`, which is the honest description of where the
 * existing catalog data came from — it was transcribed from manufacturer and
 * retailer listings, never verified. The fallback is deliberately not
 * `verified_documentation`, so a migration cannot silently upgrade old data.
 */
export const LEGACY_DEFAULT_STATUS: EvidenceStatus = "manufacturer_reported";

/**
 * Per-factor defaults when a review has no recorded evidence status.
 *
 * Recall history is the exception: it is produced by our own CPSC sync against
 * the official public recall database, so labelling it "manufacturer-reported"
 * was simply wrong — it understated the strongest evidence on the page. It
 * defaults to `official_documentation` when a recall check has actually been
 * recorded, and to `no_evidence_found` when none has (see resolveFactorStatus).
 */
export const FACTOR_DEFAULT_STATUS: Record<string, EvidenceStatus> = {
  materialSafety: "manufacturer_reported",
  chokingRisk: "manufacturer_reported",
  certificationPresence: "manufacturer_reported",
  recallHistory: "official_documentation",
};

export function parseEvidenceStatus(value: unknown): EvidenceStatus {
  if (
    typeof value === "string" &&
    value in EVIDENCE_STATUS_LABELS
  ) {
    return value as EvidenceStatus;
  }
  return LEGACY_DEFAULT_STATUS;
}

/**
 * Resolve the evidence status for a specific factor.
 *
 * Priority: an explicitly recorded status wins; otherwise the factor default
 * applies. Recall history additionally depends on whether a check was actually
 * run — without a recorded check date there is no evidence at all, and claiming
 * an official source would be false.
 */
export function resolveFactorStatus(
  factorKey: string,
  recorded: unknown,
  context: { recallCheckedAt?: string | null } = {}
): EvidenceStatus {
  if (typeof recorded === "string" && recorded in EVIDENCE_STATUS_LABELS) {
    return recorded as EvidenceStatus;
  }
  if (factorKey === "recallHistory") {
    return context.recallCheckedAt
      ? "official_documentation"
      : "no_evidence_found";
  }
  return FACTOR_DEFAULT_STATUS[factorKey] ?? LEGACY_DEFAULT_STATUS;
}

export function evidenceStatusLabel(value: unknown): string {
  return EVIDENCE_STATUS_LABELS[parseEvidenceStatus(value)];
}
