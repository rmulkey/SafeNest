import { DEVELOPMENT_SCORE_WEIGHTS } from "@/lib/scoring/development-score";

/**
 * DevelopmentScoreDisplay - Visual breakdown of the development score.
 *
 * Shows each factor's score and weight with progress bars:
 * - Motor skills (40%)
 * - Cognitive skills (35%)
 * - Sensory engagement (25%)
 *
 * Unlike the safety breakdown, no per-factor evidence status is shown, because
 * there is none to show: these are editorial judgements about developmental
 * value, not claims about the product that anyone could source or verify. The
 * card says that once, under the heading, rather than repeating it per factor.
 *
 * It needs saying because of what sits next to it. The safety card beside this
 * one now names the evidence behind each of its four numbers, so a reader who
 * has learned to look for that line finds nothing here and is left to assume
 * these numbers rest on the same kind of evidence. They do not.
 *
 * Uses safety score colors for consistency: high (>=70), medium (40-69), low (<40)
 *
 * Requirements: 3.2, 3.7
 */

interface DevelopmentScoreBreakdown {
  motorSkills: number;
  cognitiveSkills: number;
  sensoryEngagement: number;
}

interface DevelopmentScoreDisplayProps {
  score: number;
  breakdown: DevelopmentScoreBreakdown;
}

/*
 * Labels are sentence case to match the safety breakdown beside this card and
 * the factor names used throughout the site. The two cards sit side by side in
 * the same grid row, so "Motor Skills" next to "Material safety" read as a
 * styling bug.
 *
 * Weights come from DEVELOPMENT_SCORE_WEIGHTS rather than being written out
 * again. The hardcoded copy had already drifted: this list labelled the second
 * factor "Cognitive" while the component's own documentation, the Sanity field
 * and the scoring module all call it cognitive skills.
 */
const FACTORS = [
  { key: "motorSkills" as const, label: "Motor skills" },
  { key: "cognitiveSkills" as const, label: "Cognitive skills" },
  { key: "sensoryEngagement" as const, label: "Sensory engagement" },
].map((f) => ({
  ...f,
  weight: `${Math.round(DEVELOPMENT_SCORE_WEIGHTS[f.key] * 100)}%`,
}));

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

export function DevelopmentScoreDisplay({
  score,
  breakdown,
}: DevelopmentScoreDisplayProps) {
  return (
    <div className="rounded-lg border border-border p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        {/* h2, not h3: these are top-level sections of the review, siblings
            of "Materials" and "How we assessed this toy". As h3 they skipped
            a level straight from the page h1. */}
        <h2 className="text-lg font-semibold">Development Score</h2>
        <span
          className={`text-2xl font-bold ${getScoreTextColor(score)}`}
          aria-label={`Overall development score: ${score} out of 100`}
        >
          {score}/100
        </span>
      </div>

      <p className="-mt-2 mb-4 text-xs text-muted-foreground">
        SafeNest&apos;s editorial assessment of developmental value, not a
        measured or certified result.
      </p>

      <div
        className="space-y-3"
        role="list"
        aria-label="Development score breakdown"
      >
        {FACTORS.map((factor) => {
          const value = breakdown[factor.key];
          return (
            <div key={factor.key} role="listitem">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">
                  {factor.label}{" "}
                  <span className="text-xs">({factor.weight})</span>
                </span>
                <span className="font-medium">{value}</span>
              </div>
              <div
                className="h-2 w-full rounded-full bg-muted overflow-hidden"
                role="progressbar"
                aria-valuenow={value}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${factor.label}: ${value} out of 100`}
              >
                <div
                  className={`h-full rounded-full transition-all ${getScoreColor(value)}`}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
