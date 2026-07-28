import { FlaskConical, Factory, Landmark, PenLine, HelpCircle } from "lucide-react";
import {
  NO_LAB_TESTING_NOTICE,
  SCORE_DISCLAIMER,
  certificationClaimLabel,
  recallSearchStatement,
  REVIEW_METHOD_SENTENCE,
} from "@/lib/content/evidence";

/**
 * Evidence-quality disclosure for a review page.
 *
 * The site previously described its reviews as "expert reviewed" and cited
 * "independent lab testing" that does not exist. This block replaces implied
 * authority with an explicit account of where each kind of information comes
 * from, so a parent can weigh it properly:
 *
 *   - Manufacturer-reported (certifications, materials) — not verified by us.
 *   - Public regulatory data (CPSC recall lookups) — with the date checked.
 *   - SafeNest editorial assessment (the scores) — an opinion, not a test.
 *   - Testing status — stated plainly as absent.
 *
 * Missing data renders as an honest "not recorded" state rather than being
 * omitted, because silence reads as reassurance.
 */
export interface EvidenceDisclosureProps {
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

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export function EvidenceDisclosure({
  certifications,
  recallCheckedAt,
  hasActiveRecall = false,
  reviewedBy,
  publishedAt,
  lastReviewedAt,
}: EvidenceDisclosureProps) {
  const published = formatDate(publishedAt);
  const lastReviewed = formatDate(lastReviewedAt);
  const hasCerts = Boolean(certifications && certifications.length > 0);

  return (
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
        {/* Testing status — stated plainly, never implied. */}
        <div className="flex gap-3">
          <FlaskConical
            className="mt-0.5 size-4 shrink-0 text-zinc-500"
            aria-hidden="true"
          />
          <div>
            <dt className="font-medium text-zinc-900 dark:text-zinc-100">
              Testing status
            </dt>
            <dd className="text-zinc-600 dark:text-zinc-400">
              {NO_LAB_TESTING_NOTICE} We assess publicly available information;
              we do not perform physical or laboratory testing and we do not
              certify products.
            </dd>
          </div>
        </div>

        {/* Certifications: manufacturer claims, clearly attributed. */}
        <div className="flex gap-3">
          <Factory
            className="mt-0.5 size-4 shrink-0 text-zinc-500"
            aria-hidden="true"
          />
          <div>
            <dt className="font-medium text-zinc-900 dark:text-zinc-100">
              Certifications
            </dt>
            <dd className="text-zinc-600 dark:text-zinc-400">
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
            </dd>
          </div>
        </div>

        {/* Recall lookup: regulatory data with the date it was true. */}
        <div className="flex gap-3">
          <Landmark
            className="mt-0.5 size-4 shrink-0 text-zinc-500"
            aria-hidden="true"
          />
          <div>
            <dt className="font-medium text-zinc-900 dark:text-zinc-100">
              Recall check
            </dt>
            <dd className="text-zinc-600 dark:text-zinc-400">
              {recallSearchStatement(recallCheckedAt, hasActiveRecall)}{" "}
              A recall is only linked to this review when the match is
              unambiguous. Confirm against the{" "}
              <a
                href="https://www.cpsc.gov/Recalls"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 underline"
              >
                official CPSC database
              </a>
              .
            </dd>
          </div>
        </div>

        {/* Scores: editorial, not certification. */}
        <div className="flex gap-3">
          <PenLine
            className="mt-0.5 size-4 shrink-0 text-zinc-500"
            aria-hidden="true"
          />
          <div>
            <dt className="font-medium text-zinc-900 dark:text-zinc-100">
              Scores
            </dt>
            <dd className="text-zinc-600 dark:text-zinc-400">
              {SCORE_DISCLAIMER}{" "}
              <a href="/transparency" className="text-primary-600 underline">
                See the factor weights
              </a>
              .
            </dd>
          </div>
        </div>

        {/* Accountability. Rendered even when unset, so gaps are visible. */}
        <div className="flex gap-3">
          <HelpCircle
            className="mt-0.5 size-4 shrink-0 text-zinc-500"
            aria-hidden="true"
          />
          <div>
            <dt className="font-medium text-zinc-900 dark:text-zinc-100">
              Who assessed this, and when
            </dt>
            <dd className="text-zinc-600 dark:text-zinc-400">
              {reviewedBy
                ? `Assessed by ${reviewedBy}.`
                : "Assessed by the SafeNest editorial team (Rodrigo & Vanessa Mulkey, parents — not credentialed product-safety professionals)."}{" "}
              {published ? `First published ${published}.` : "Publication date not recorded."}{" "}
              {lastReviewed
                ? `Last reviewed ${lastReviewed}.`
                : "This page has no recorded re-review date, so details may be out of date."}
            </dd>
          </div>
        </div>
      </dl>

      <p className="mt-4 border-t border-zinc-200 pt-3 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-500">
        Spotted something wrong?{" "}
        <a href="/contact" className="text-primary-600 underline">
          Report a correction
        </a>
        . We publish affiliate links and earn a commission on some purchases; this
        never affects scores or rankings. See our{" "}
        <a href="/transparency#affiliate" className="text-primary-600 underline">
          affiliate disclosure
        </a>
        .
      </p>
    </section>
  );
}
