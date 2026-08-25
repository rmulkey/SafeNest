import { Skeleton } from "@/components/ui/Skeleton";

/**
 * NOTE: this skeleton must not render <main>.
 *
 * Partial Prerendering ships this fallback in the static shell and streams the
 * real page into the same response, so a <main> here means the served HTML holds
 * two of them — invalid (one <main> per document), and the first one in document
 * order is a skeleton whose accessible name is "Loading". Anything reading the
 * first main landmark, or extracting rendered text, sees a loading state instead
 * of the page. The route's page.tsx owns the <main> landmark; this is a <div>.
 */
/**
 * Route-level loading skeleton for the "best toys for age" comparison page.
 * Mirrors the heading + a comparison table with several rows.
 */
export default function BestToysLoading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="mx-auto max-w-4xl px-4 py-8"
    >
      <span className="sr-only">Loading</span>

      <Skeleton className="h-9 w-3/4" />
      <Skeleton className="mt-3 mb-8 h-4 w-1/2 rounded-md" />

      {/* Comparison table skeleton */}
      <div className="overflow-hidden rounded-xl border border-border">
        {/* Header row */}
        <Skeleton className="h-12 w-full rounded-none" />
        {/* Body rows */}
        <div className="divide-y divide-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="size-14 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3 rounded-md" />
                <Skeleton className="h-3 w-1/3 rounded-md" />
              </div>
              <Skeleton className="hidden h-8 w-16 rounded-md sm:block" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
