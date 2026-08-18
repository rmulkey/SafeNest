/**
 * The one short-form affiliate disclosure, for use beside buy buttons.
 *
 * WHY THIS EXISTS
 * Twelve different wordings of this were in the codebase, and this component —
 * the obvious place for it — was written and then never imported, so its version
 * was the only one nobody saw. The others ranged from "SafeNest may earn a
 * commission from qualifying purchases at no additional cost to you." to "As an
 * Amazon Associate, SafeNest Toys earns from qualifying purchases." to "Buy links
 * are affiliate links. SafeNest may earn a commission … and commissions never
 * influence our scores or rankings."
 *
 * The FTC asks for a disclosure that is clear, conspicuous and near the link.
 * Twelve variants are not more compliant than one; they are just harder to keep
 * correct, and a reader who sees three different phrasings on one visit has
 * reason to wonder which is the real arrangement.
 *
 * This says the three things that matter and nothing else: the links are
 * affiliate links, buying through one costs the reader nothing extra, and the
 * money does not move the scores. The long-form explanations on /about, /terms
 * and /privacy stay as they are — those are prose in context, not microcopy.
 */

/** Canonical wording, exported so tests and audits can assert against it. */
export const AFFILIATE_DISCLOSURE_TEXT =
  "Some links here are affiliate links. If you buy through one we may earn a commission, at no extra cost to you — it never changes our scores or which toys we include.";

export function AffiliateDisclosure({
  className = "",
  /** `center` for the narrow, centred contexts (ToyFinder results, gift guides). */
  align = "start",
}: {
  className?: string;
  align?: "start" | "center";
}) {
  return (
    <p
      className={`text-xs leading-relaxed text-muted-foreground ${
        align === "center" ? "text-center" : ""
      } ${className}`}
    >
      {AFFILIATE_DISCLOSURE_TEXT}
    </p>
  );
}
