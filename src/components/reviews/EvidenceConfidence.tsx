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

      {/* The score and its evidence backing are deliberately shown as two
          different things, so a confident-looking number cannot stand in for
          well-supported information. */}
      {assessment.insufficientEvidence ? (
        <p className="mt-3 rounded-md bg-background/60 p-3 text-sm text-foreground">
          SafeNest is not displaying a precise safety score for this toy, because
          the available information does not support that level of precision.
        </p>
      ) : (
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-background/60 p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Editorial safety score
            </dt>
            <dd className="text-xl font-semibold text-foreground">
              {storedScore ?? assessment.score}
              <span className="text-sm font-normal text-muted-foreground">/100</span>
            </dd>
          </div>
          <div className="rounded-md bg-background/60 p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Evidence behind it
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
            {f.wasCapped && (
              <p className="mt-1 text-xs text-muted-foreground">
                Because this claim is not supported by accessible documentation,
                the highest score available for this factor is limited.
              </p>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-4 border-t border-border/60 pt-3 text-xs text-muted-foreground">
        Scores are SafeNest&apos;s editorial assessment of publicly available
        information. They are not certifications, guarantees, or a substitute for
        the manufacturer&apos;s instructions or an official recall notice.{" "}
        <a href="/transparency" className="text-primary-600 underline">
          Read the full methodology
        </a>
        .
      </p>
    </section>
  );
}
