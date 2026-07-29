import {
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Shield,
  FlaskConical,
  Factory,
  Landmark,
  HelpCircle,
} from "lucide-react";
import type { SafetyAssessment } from "@/lib/scoring/assess-safety";
import {
  NO_LAB_TESTING_NOTICE,
  certificationClaimLabel,
  recallSearchStatement,
  REVIEW_METHOD_SENTENCE,
} from "@/lib/content/evidence";
import {
  editorialVerdict,
  SCORE_EVIDENCE_DISCLAIMER,
} from "@/lib/content/review-verdict";

/**
 * The complete evidence area of a review: the editorial verdict, the four-factor
 * evidence list, and how the assessment was made.
 *
 * WHY THIS IS ONE COMPONENT
 * This previously shipped as two components, `EvidenceConfidence` followed by
 * `EvidenceDisclosure`. In the streamed production HTML the fourth factor
 * ("Certification claims") did not arrive with its three siblings: React closed
 * the `<ul>` after "Recall history", left a `<template id="P:7">` placeholder,
 * and streamed the final `<li>` much later — after "How we assessed this toy",
 * the testing and certification disclosures, the recall check and a Buy link —
 * to be moved into place by a `$RS` script at runtime.
 *
 * The postponed holes always fell on the *last child* of a container, so any
 * component boundary or trailing element inside the evidence area was a place
 * the document could be cut. Collapsing the two components into one, rendering
 * the factors as a single `<ol>` of siblings, and keeping the list off the end of
 * its container removes those cut points. Order is expressed in the markup only;
 * there is no CSS reordering, so the reading order a screen reader announces is
 * the order the document is written in.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *  - It does not restate the score in more than one place.
 *  - It does not carry more than one score/evidence disclaimer.
 *  - It does not print a precise score when the evidence is insufficient.
 */

export interface EvidenceSectionProps {
  assessment: SafetyAssessment;
  /** The score currently published for this review. */
  storedScore?: number;
  certifications?: string[] | null;
  /** When the CPSC recall lookup for this product last ran. */
  recallCheckedAt?: string | null;
  /** Whether that lookup found a match. */
  hasActiveRecall?: boolean;
  /** Named person accountable for the editorial assessment. */
  reviewedBy?: string | null;
  publishedAt?: string | null;
  lastReviewedAt?: string | null;
}

const CONFIDENCE_STYLE = {
  high: {
    wrap: "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40",
    Icon: ShieldCheck,
    tone: "text-emerald-700 dark:text-emerald-300",
  },
  medium: {
    wrap: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40",
    Icon: Shield,
    tone: "text-amber-700 dark:text-amber-300",
  },
  low: {
    wrap: "border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/40",
    Icon: ShieldAlert,
    tone: "text-orange-700 dark:text-orange-300",
  },
  insufficient: {
    wrap: "border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900",
    Icon: ShieldQuestion,
    tone: "text-zinc-700 dark:text-zinc-300",
  },
} as const;

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/** One row of the "how we assessed this" list. */
function MethodRow({
  icon: Icon,
  term,
  children,
}: {
  icon: typeof FlaskConical;
  term: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Icon
        className="mt-0.5 size-4 shrink-0 text-zinc-500"
        aria-hidden="true"
      />
      <div>
        <dt className="font-medium text-zinc-900 dark:text-zinc-100">{term}</dt>
        <dd className="text-zinc-600 dark:text-zinc-400">{children}</dd>
      </div>
    </div>
  );
}

export function EvidenceSection({
  assessment,
  storedScore,
  certifications,
  recallCheckedAt,
  hasActiveRecall = false,
  reviewedBy,
  publishedAt,
  lastReviewedAt,
}: EvidenceSectionProps) {
  const style = CONFIDENCE_STYLE[assessment.confidence];
  const Icon = style.Icon;

  const displayScore =
    typeof storedScore === "number" ? storedScore : assessment.score;
  const verdict = editorialVerdict({
    score: displayScore,
    confidence: assessment.confidence,
  });

  const published = formatDate(publishedAt);
  const lastReviewed = formatDate(lastReviewedAt);
  const hasCerts = Boolean(certifications && certifications.length > 0);

  return (
    <>
      {/* ── Editorial assessment + the four evidence factors ──────────────── */}
      <section
        aria-labelledby="assessment-heading"
        className={`mt-8 rounded-lg border p-5 ${style.wrap}`}
      >
        <h2
          id="assessment-heading"
          className="flex items-start gap-2 text-lg font-semibold text-foreground"
        >
          <Icon
            className={`mt-0.5 size-5 shrink-0 ${style.tone}`}
            aria-hidden="true"
          />
          {/* Score and confidence are stated together, always. A number on its
              own invited readers to treat it as a safety verdict. */}
          <span>{verdict.text}</span>
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          {assessment.confidenceExplanation}
        </p>

        {/* The score and its confidence are already stated together in the
            heading above. A separate "Editorial assessment 92/100" card printed
            the same number a second line later, which is the duplicate score
            output this section used to carry — so it is not rendered. Only the
            insufficient-evidence case needs extra explanation. */}
        {!verdict.showsScore && (
          <p className="mt-3 rounded-md bg-background/60 p-3 text-sm text-foreground">
            SafeNest is not displaying a precise safety score for this toy,
            because the available information does not support that level of
            precision.
          </p>
        )}

        {/* The single score/evidence disclaimer for the page. */}
        <p className="mt-3 text-xs text-muted-foreground">
          {SCORE_EVIDENCE_DISCLAIMER}{" "}
          <a href="/transparency" className="text-primary-600 underline">
            Read the full methodology
          </a>
          .
        </p>

        {/* ── All four factors, as siblings of one list ───────────────────── */}
        <h3 className="mt-5 text-sm font-semibold text-foreground">
          Evidence for each safety factor
        </h3>
        <ol className="mt-2 divide-y divide-border/60">
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
                  status drives the confidence rating above, not the published
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
        </ol>
      </section>

      {/* ── How the assessment was made ───────────────────────────────────── */}
      <section
        aria-labelledby="evidence-heading"
        className="mt-10 rounded-lg border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-700 dark:bg-zinc-900"
      >
        <h2
          id="evidence-heading"
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
        >
          How we assessed this toy
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {REVIEW_METHOD_SENTENCE}
        </p>

        <dl className="mt-4 space-y-4 text-sm">
          <MethodRow icon={FlaskConical} term="Testing status">
            {NO_LAB_TESTING_NOTICE} We assess publicly available information; we
            do not perform physical or laboratory testing and we do not certify
            products.
          </MethodRow>

          <MethodRow icon={Factory} term="Certifications">
            {hasCerts ? (
              <>
                <ul className="list-disc space-y-0.5 pl-5">
                  {certifications!.map((c) => (
                    <li key={c}>{certificationClaimLabel(c)}</li>
                  ))}
                </ul>
                <p className="mt-1">
                  These are manufacturer or retailer claims. SafeNest has not
                  independently verified them.
                </p>
              </>
            ) : (
              "No certification claims recorded for this product. Absence of a claim is not evidence of non-compliance."
            )}
          </MethodRow>

          <MethodRow icon={Landmark} term="Recall check">
            {recallSearchStatement(recallCheckedAt, hasActiveRecall)} A recall is
            only linked to this review when the match is unambiguous. Confirm
            against the{" "}
            <a
              href="https://www.cpsc.gov/Recalls"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 underline"
            >
              official CPSC database
            </a>
            .
          </MethodRow>

          {/* Rendered even when unset, so gaps are visible rather than silent. */}
          <MethodRow icon={HelpCircle} term="Who assessed this, and when">
            {reviewedBy
              ? `Assessed by ${reviewedBy}.`
              : "Assessed by the SafeNest editorial team (Rodrigo & Vanessa Mulkey, parents — not credentialed product-safety professionals)."}{" "}
            {published
              ? `First published ${published}.`
              : "Publication date not recorded."}{" "}
            {lastReviewed
              ? `Last reviewed ${lastReviewed}.`
              : "This page has no recorded re-review date, so details may be out of date."}
          </MethodRow>
        </dl>

        <p className="mt-4 border-t border-zinc-200 pt-3 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-500">
          Spotted something wrong?{" "}
          <a href="/contact" className="text-primary-600 underline">
            Report a correction
          </a>
          . We publish affiliate links and earn a commission on some purchases;
          this never affects scores or rankings. See our{" "}
          <a
            href="/transparency#affiliate"
            className="text-primary-600 underline"
          >
            affiliate disclosure
          </a>
          .
        </p>
      </section>
    </>
  );
}
