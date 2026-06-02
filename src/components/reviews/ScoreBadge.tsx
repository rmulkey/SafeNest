interface ScoreBadgeProps {
  score: number;
  label: string;
  size?: "sm" | "lg";
}

function getScoreColor(score: number) {
  if (score >= 75) return { stroke: "stroke-secondary-500", text: "text-secondary-600" };
  if (score >= 50) return { stroke: "stroke-amber-500", text: "text-amber-600" };
  return { stroke: "stroke-red-500", text: "text-red-600" };
}

export function ScoreBadge({ score, label, size = "sm" }: ScoreBadgeProps) {
  const dimensions = size === "sm" ? 56 : 80;
  const strokeWidth = size === "sm" ? 4 : 5;
  const radius = size === "sm" ? 22 : 32;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const colors = getScoreColor(score);
  const center = dimensions / 2;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: dimensions, height: dimensions }}>
        <svg
          width={dimensions}
          height={dimensions}
          viewBox={`0 0 ${dimensions} ${dimensions}`}
          className="-rotate-90"
          aria-hidden="true"
        >
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className="stroke-muted"
          />
          {/* Progress circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            className={colors.stroke}
          />
        </svg>
        {/* Score number in center */}
        <span
          className={`absolute inset-0 flex items-center justify-center font-semibold ${colors.text} ${size === "sm" ? "text-sm" : "text-xl"}`}
          aria-label={`${label}: ${score} out of 100`}
        >
          {score}
        </span>
      </div>
      <span className={`text-muted-foreground font-medium ${size === "sm" ? "text-[10px]" : "text-xs"}`}>
        {label}
      </span>
    </div>
  );
}
