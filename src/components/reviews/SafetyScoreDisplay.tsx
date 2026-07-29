/**
 * SafetyScoreDisplay - Visual breakdown of the safety score.
 *
 * Shows each factor's score and weight with progress bars:
 * - Material Safety (30%)
 * - Choking Risk (30%)
 * - Recall History (20%)
 * - Certification Presence (20%)
 *
 * Uses safety score colors: safety-high (>=70), safety-medium (40-69), safety-low (<40)
 *
 * Requirements: 3.1, 3.7
 */

interface SafetyScoreBreakdown {
  materialSafety: number;
  chokingRisk: number;
  recallHistory: number;
  certificationPresence: number;
}

interface SafetyScoreDisplayProps {
  score: number;
  breakdown: SafetyScoreBreakdown;
}

const FACTORS = [
  { key: "materialSafety" as const, label: "Material Safety", weight: "30%" },
  { key: "chokingRisk" as const, label: "Choking Risk", weight: "30%" },
  { key: "recallHistory" as const, label: "Recall History", weight: "20%" },
  {
    key: "certificationPresence" as const,
    label: "Certification",
    weight: "20%",
  },
];

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

export function SafetyScoreDisplay({
  score,
  breakdown,
}: SafetyScoreDisplayProps) {
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
