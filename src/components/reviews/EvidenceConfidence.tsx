import { ShieldCheck, ShieldAlert, ShieldQuestion, Shield } from "lucide-react";
import type { SafetyAssessment } from "@/lib/scoring/assess-safety";
import { INSUFFICIENT_EVIDENCE_DISPLAY } from "@/lib/scoring/assess-safety";

/**
 * Displays how well-supported a review's safety assessment actually is.
 *
 * The safety score alone cannot express this: a 92 built on unverified marketing
 * copy and a 92 backed by published documentation looked identical. This component
 * separates the editorial judgement (the score) from the strength of the evidence
 * behind it, and shows the per-factor provenance in human-readable terms.
 */
export function EvidenceConfidence({
  assessment,
  storedScore,
}: {
  assessment: SafetyAssessment;
  /** The score currently published for this review, for comparison. */
  storedScore?: number;
}) {
  const style = {
    high: { wrap: "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40", Icon: ShieldCheck, tone: "text-emerald-700 dark:text-emerald-300" },
    medium: { wrap: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40", Icon: Shield, tone: "text-amber-700 dark:text-amber-300" },
    low: { wrap: "border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/40", Icon: ShieldAlert, tone: "text-orange-700 dark:text-orange-300" },
    insufficient: { wrap: "border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900", Icon: ShieldQuestion, tone: "text-zinc-700 dark:text-zinc-300" },
  }[assessment.confidence];

  const Icon = style.Icon;

  return (
    <section
      aria-labelledby="evidence-confidence-heading"
      className={`mt-8 rounded-lg border p-5 ${style.wrap}`}
    >
      <h2
        id="evidence-confidence-heading"
        className="flex items-center gap-2 text-lg font-semibold text-foreground"
      >
        <Icon className={`size-5 ${style.tone}`} aria-hidden="true" />
        {assessment.insufficientEvidence
          ? INSUFFICIENT_EVIDENCE_DISPLAY
          : assessment.confidenceLabel}
      </h2>

      <p className="mt-2 text-sm text-muted-foreground">
        {assessment.confidenceExplanation}
      </p>

      {/* Two separate outputs. The editorial assessment is SafeNest's judgement
          on a 0-100 scale. Evidence confidence describes how well that judgement
          is supported. They are reported side by side so a confident-looking
          number cannot stand in for well-supported information. Evidence status
          affects the confidence rating, not the editorial number. */}
      {assessment.insufficientEvidence ? (
        <p className="mt-3 rounded-md bg-background/60 p-3 text-sm text-foreground">
          SafeNest is not displaying a precise safety score for this toy, because
          the available information does not support that level of precision.
        </p>
      ) : (
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-background/60 p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Editorial assessment
            </dt>
            <dd className="text-xl font-semibold text-foreground">
              {storedScore ?? assessment.score}
              <span className="text-sm font-normal text-muted-foreground">/100</span>
            </dd>
          </div>
          <div className="rounded-md bg-background/60 p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Evidence confidence
            </dt>
            <dd className="text-xl font-semibold text-foreground">
              {assessment.confidenceLabel.replace(/ evidence confidence$/i, "")}
            </dd>
          </div>
        </dl>
      )}

      {/* Per-factor provenance with published weights. */}
      <h3 className="mt-5 text-sm font-semibold text-foreground">
        Evidence for each safety factor
      </h3>
      <ul className="mt-2 divide-y divide-border/60">
        {assessment.factors.map((f) => (
          <li key={f.key} className="py-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="text-sm font-medium text-foreground">
                {f.label}
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  ({Math.round(f.weight * 100)}% of score)
                </span>
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                {f.evidenceLabel}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {f.description}
            </p>
            {/* Deliberately NOT claiming the factor score is capped. Evidence
                status drives the confidence rating shown above, not the legacy
                editorial number, so saying otherwise would be false. */}
            {f.evidenceStatus !== "official_documentation" &&
              f.evidenceStatus !== "verified_documentation" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Not supported by documentation SafeNest could access, so this
                  factor lowers the evidence confidence above.
                </p>
              )}
          </li>
        ))}
      </ul>

      <p className="mt-4 border-t border-border/60 pt-3 text-xs text-muted-foreground">
        The editorial assessment is SafeNest&apos;s own judgement of publicly
        available information; evidence confidence describes how well that
        judgement is supported. Evidence quality affects the confidence rating
        above, not the editorial number. Neither is a certification, a guarantee,
        or a substitute for the manufacturer&apos;s instructions or an official
        recall notice.{" "}
        <a href="/transparency" className="text-primary-600 underline">
          Read the full methodology
        </a>
        .
      </p>
    </section>
  );
}
