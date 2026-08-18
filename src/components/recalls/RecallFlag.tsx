import { AlertTriangle } from "lucide-react";

/**
 * The one way SafeNest marks a product as recalled in a listing or card.
 *
 * WHY THIS EXISTS
 * This was rendered eleven different ways across eleven files: three different
 * glyphs (⚠️, ⚠, none), five visual treatments (red pill, red panel, bare red
 * text, muted `safety-low` text, plain text), and five wordings — "Active
 * Recall", "Active recall", "⚠️ Active recall alert", "⚠ Active recall — see the
 * review", "⚠ Active recall — see review before buying". Inconsistency is a
 * polish problem almost everywhere; on a recall notice it is a comprehension
 * problem, because a reader who learns to spot one treatment will not recognise
 * the other four.
 *
 * Design decisions:
 *  - An inline SVG icon, not an emoji. ⚠️ renders differently on every platform
 *    and screen readers announce it as "warning sign" before the label, so the
 *    text arrived narrated as punctuation. The icon is aria-hidden and the label
 *    carries the meaning.
 *  - text-red-800 on bg-red-100 measures 6.80:1. The variants it replaces ranged
 *    from 4.83 to 7.60, and text-red-600 on bg-red-100 — a pairing this was one
 *    refactor away from — fails at 3.95.
 *  - Colour is never the only signal: the icon and the word "recall" both carry
 *    it, so the flag survives greyscale and colour-blindness (WCAG 1.4.1).
 */
export function RecallFlag({
  /** Optional trailing context, e.g. "see the review before buying". */
  detail,
  className = "",
}: {
  detail?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800 ${className}`}
    >
      <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
      <span>Active recall{detail ? ` — ${detail}` : ""}</span>
    </span>
  );
}
