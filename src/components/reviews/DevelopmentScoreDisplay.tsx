/**
 * DevelopmentScoreDisplay - Visual breakdown of the development score.
 *
 * Shows each factor's score and weight with progress bars:
 * - Motor Skills (40%)
 * - Cognitive Skills (35%)
 * - Sensory Engagement (25%)
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

const FACTORS = [
  { key: "motorSkills" as const, label: "Motor Skills", weight: "40%" },
  { key: "cognitiveSkills" as const, label: "Cognitive", weight: "35%" },
  {
    key: "sensoryEngagement" as const,
    label: "Sensory Engagement",
    weight: "25%",
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

export function DevelopmentScoreDisplay({
  score,
  breakdown,
}: DevelopmentScoreDisplayProps) {
  return (
    <div className="rounded-lg border border-border p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Development Score</h3>
        <span
          className={`text-2xl font-bold ${getScoreTextColor(score)}`}
          aria-label={`Overall development score: ${score} out of 100`}
        >
          {score}/100
        </span>
      </div>

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
