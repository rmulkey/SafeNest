import type { FactorAssessment } from "@/lib/scoring/assess-safety";

/**
 * SafetyScoreDisplay - Visual breakdown of the safety score.
 *
 * Shows each of the four safety factors with its published weight, its score,
 * and the evidence that score rests on.
 *
 * WHY IT TAKES THE ASSESSMENT RATHER THAN RAW NUMBERS
 * This component used to own a local copy of the factor labels and weights and
 * render `breakdown[key]` as a bare number. Two problems followed from that:
 *
 *  1. The local copy drifted from `SAFETY_FACTORS`, the canonical list. This
 *     breakdown called the fourth factor "Certification" while the evidence
 *     section below it called the same factor "Certification claims" — and the
 *     stored value is a count-of-claims proxy, not a verification result. A
 *     reader saw "Certification 90" near the top of the page and "no source on
 *     file" for that same factor further down, which is a contradiction the page
 *     had no way to resolve.
 *  2. A bare number carries no indication of how well supported it is, so the
 *     most and least evidenced factors looked identical.
 *
 * Labels and weights now come from the assessment, so there is one list to
 * change, and each factor states its evidence status in the same words the
 * evidence section uses.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 * It renders `rawScore` — the published editorial number — not the
 * evidence-capped `score`. The caps drive the page's Evidence Confidence
 * rating, not the published score, and showing a capped number here would both
 * contradict the headline score and disagree with every listing card. Naming
 * the evidence is the honest fix; silently restating the number is not.
 *
 * Uses safety score colors: safety-high (>=70), safety-medium (40-69), safety-low (<40)
 *
 * Requirements: 3.1, 3.7
 */

interface SafetyScoreDisplayProps {
  score: number;
  /** Per-factor assessment, from `assessSafety`. Supplies labels and weights. */
  factors: FactorAssessment[];
}

function getScoreColor(score: number): string {
  if (score >= 70) return "bg-safety-high";
  if (score >= 40) return "bg-safety-medium";
  return "bg-safety-low";
}

function getScoreTextColor(score: number): string {
  if (score >= 70) return "text-safety-high";
  if (score >= 40) return "text-safety-medium";
  return "text-safety-low";
}

export function SafetyScoreDisplay({ score, factors }: SafetyScoreDisplayProps) {
  return (
    <div className="rounded-lg border border-border p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        {/* h2, not h3: these are top-level sections of the review, siblings
            of "Materials" and "How we assessed this toy". As h3 they skipped
            a level straight from the page h1. */}
        <h2 className="text-lg font-semibold">Safety Score</h2>
        <span
          className={`text-2xl font-bold ${getScoreTextColor(score)}`}
          aria-label={`Overall safety score: ${score} out of 100`}
        >
          {score}/100
        </span>
      </div>

      <div className="space-y-3" role="list" aria-label="Safety score breakdown">
        {factors.map((factor) => {
          const value = factor.rawScore;
          const weight = `${Math.round(factor.weight * 100)}%`;
          return (
            <div key={factor.key} role="listitem">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">
                  {factor.label}{" "}
                  {/* A factor that does not apply is dropped from the weighted
                      average, so printing its weight would overstate it. */}
                  {factor.applicable && (
                    <span className="text-xs">({weight})</span>
                  )}
                </span>
                <span className="font-medium">{value}</span>
              </div>
              <div
                className="h-2 w-full rounded-full bg-muted overflow-hidden"
                role="progressbar"
                aria-valuenow={value}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${factor.label}: ${value} out of 100. Evidence: ${factor.evidenceLabel}.`}
              >
                <div
                  className={`h-full rounded-full transition-all ${getScoreColor(value)}`}
                  style={{ width: `${value}%` }}
                />
              </div>
              {/* Stated for every factor, not only weak ones: otherwise an
                  absent line is ambiguous between "well evidenced" and "we
                  never looked". The progressbar above already announces this,
                  so it is hidden from assistive tech to avoid reading twice. */}
              <p
                className="mt-1 text-xs text-muted-foreground"
                aria-hidden="true"
              >
                Evidence: {factor.evidenceLabel}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
