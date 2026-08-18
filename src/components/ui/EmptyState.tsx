import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * The one empty state.
 *
 * WHY THIS EXISTS
 * Nine different versions of "there is nothing here yet" existed across the site,
 * in three visual treatments — a dashed panel, a dashed panel with an icon and a
 * button, and a bare unstyled paragraph — and with punctuation that could not
 * agree with itself: "Check back soon!" on /blog, /best-toys and /guides,
 * "check back shortly." on /reviews and /categories, "check back soon," on
 * /categories/[slug]. Three of the nine offered the reader no way onward at all,
 * which is the actual failure: an empty page with no exit is a dead end.
 *
 * So: one dashed panel, one register, and an action wherever there is a sensible
 * one to offer. No exclamation marks — an empty shelf is not exciting news, and
 * the surrounding copy does not use them anywhere else.
 */
export function EmptyState({
  title,
  body,
  action,
  className = "",
}: {
  title: string;
  body: string;
  /** Where to send the reader instead. Omit only when nothing sensible exists. */
  action?: { href: string; label: string };
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center rounded-xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center ${className}`}
    >
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
      {action && (
        <Link
          href={action.href}
          className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700"
        >
          {action.label}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
