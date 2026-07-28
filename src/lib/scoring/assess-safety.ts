/**
 * Centralised, evidence-aware safety assessment.
 *
 * This is the single entry point for turning raw factor inputs into what a review
 * page displays. It wraps the existing `computeSafetyScore` weighting rather than
 * replacing it, so every previously published score remains reproducible when the
 * evidence status is the legacy default.
 *
 * WHAT IT ADDS OVER computeSafetyScore
 *  - Per-factor evidence status, capping how high an unverified factor may score.
 *  - An aggregate Evidence Confidence (High/Medium/Low/Insufficient).
 *  - An explicit "insufficient evidence" outcome, where no precise score is shown
 *    at all rather than inventing precision.
 *  - Per-factor breakdown with human-readable labels for display.
 *
 * BACKWARD COMPATIBILITY
 * With every factor at the legacy default (`manufacturer_reported`), the cap is 85.
 * Existing catalog factor values are all <= 95 and most sit in the 70s-90s, so some
 * legacy factors DO get capped. That is the intended correction — those scores were
 * asserting more confidence than the evidence supported. `computeSafetyScore`
 * itself is untouched, so nothing that depends on the raw weighting changes.
 */
import {
  computeSafetyScore,
  WEIGHT_MATERIAL_SAFETY,
  WEIGHT_CHOKING_RISK,
  WEIGHT_RECALL_HISTORY,
  WEIGHT_CERTIFICATION_PRESENCE,
  type SafetyScoreFactors,
} from "./safety-score";
import {
  capFactorScore,
  computeEvidenceConfidence,
  parseEvidenceStatus,
  EVIDENCE_STATUS_LABELS,
  EVIDENCE_STATUS_EXPLANATIONS,
  EVIDENCE_CONFIDENCE_LABELS,
  EVIDENCE_CONFIDENCE_EXPLANATIONS,
  type EvidenceStatus,
  type EvidenceConfidence,
} from "./evidence-status";

/** The four safety factors, in display order, with published weights. */
export const SAFETY_FACTORS = [
  {
    key: "materialSafety" as const,
    label: "Material safety",
    weight: WEIGHT_MATERIAL_SAFETY,
    description:
      "What the toy is made of, based on published materials information and warnings.",
  },
  {
    key: "chokingRisk" as const,
    label: "Choking risk",
    weight: WEIGHT_CHOKING_RISK,
    description:
      "Assessed from published dimensions, construction details, small-part warnings, and the manufacturer's age guidance. SafeNest does not perform physical small-parts testing.",
  },
  {
    key: "recallHistory" as const,
    label: "Recall history",
    weight: WEIGHT_RECALL_HISTORY,
    description:
      "Based on checks against publicly available CPSC recall information, as of the recorded check date.",
  },
  {
    key: "certificationPresence" as const,
    label: "Certification claims",
    weight: WEIGHT_CERTIFICATION_PRESENCE,
    description:
      "Which safety certifications are reported for the toy, and how well each claim is supported.",
  },
];

export type SafetyFactorKey = (typeof SAFETY_FACTORS)[number]["key"];

/** Evidence status per factor. Any omitted factor falls back to the legacy default. */
export type FactorEvidence = Partial<Record<SafetyFactorKey, EvidenceStatus | string>>;

export interface FactorAssessment {
  key: SafetyFactorKey;
  label: string;
  weight: number;
  description: string;
  /** The score as supplied, clamped to 0-100. */
  rawScore: number;
  /** The score after applying the evidence cap. */
  score: number;
  /** True when the evidence status reduced this factor's score. */
  wasCapped: boolean;
  evidenceStatus: EvidenceStatus;
  evidenceLabel: string;
  evidenceExplanation: string;
  applicable: boolean;
}

export interface SafetyAssessment {
  /**
   * The displayable safety score, or null when the evidence is insufficient to
   * present a precise number.
   */
  score: number | null;
  /** The uncapped weighted score, retained for comparison and auditing. */
  rawScore: number;
  /** True when evidence caps lowered the overall score. */
  adjustedForEvidence: boolean;
  confidence: EvidenceConfidence;
  confidenceRatio: number;
  confidenceLabel: string;
  confidenceExplanation: string;
  /** True when no precise score should be displayed. */
  insufficientEvidence: boolean;
  factors: FactorAssessment[];
}

function clamp(n: number): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

/**
 * Assess a product's safety from raw factors plus evidence statuses.
 *
 * Deterministic: identical inputs always produce identical output, which is what
 * makes the result testable and safe to recompute in a migration.
 */
export function assessSafety(
  factors: SafetyScoreFactors,
  evidence: FactorEvidence = {}
): SafetyAssessment {
  const assessments: FactorAssessment[] = SAFETY_FACTORS.map((f) => {
    const status = parseEvidenceStatus(evidence[f.key]);
    const rawScore = clamp(factors[f.key]);
    const score = capFactorScore(rawScore, status);
    return {
      key: f.key,
      label: f.label,
      weight: f.weight,
      description: f.description,
      rawScore,
      score,
      wasCapped: score < rawScore,
      evidenceStatus: status,
      evidenceLabel: EVIDENCE_STATUS_LABELS[status],
      evidenceExplanation: EVIDENCE_STATUS_EXPLANATIONS[status],
      applicable: status !== "not_applicable",
    };
  });

  const { confidence, ratio } = computeEvidenceConfidence(
    assessments.map((a) => a.evidenceStatus)
  );

  // Uncapped weighted score, for auditing what the evidence adjustment changed.
  const rawScore = computeSafetyScore({
    materialSafety: clamp(factors.materialSafety),
    chokingRisk: clamp(factors.chokingRisk),
    recallHistory: clamp(factors.recallHistory),
    certificationPresence: clamp(factors.certificationPresence),
  });

  // Capped weighted score. Non-applicable factors are excluded and the remaining
  // weights are renormalised, so an inapplicable factor neither helps nor hurts.
  const applicable = assessments.filter((a) => a.applicable);
  const weightSum = applicable.reduce((s, a) => s + a.weight, 0);
  const cappedScore =
    weightSum > 0
      ? Math.round(
          applicable.reduce((s, a) => s + a.score * a.weight, 0) / weightSum
        )
      : 0;

  const insufficientEvidence = confidence === "insufficient";

  return {
    score: insufficientEvidence ? null : cappedScore,
    rawScore,
    adjustedForEvidence: cappedScore < rawScore,
    confidence,
    confidenceRatio: ratio,
    confidenceLabel: EVIDENCE_CONFIDENCE_LABELS[confidence],
    confidenceExplanation: EVIDENCE_CONFIDENCE_EXPLANATIONS[confidence],
    insufficientEvidence,
    factors: assessments,
  };
}

/** Text to display where a score would normally go, when evidence is insufficient. */
export const INSUFFICIENT_EVIDENCE_DISPLAY = "Insufficient evidence";
