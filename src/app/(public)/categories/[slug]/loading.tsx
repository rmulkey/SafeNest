import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Route-level loading skeleton for a category page. Mirrors the heading and a
 * responsive grid of review cards.
 */
export default function CategoryLoading() {
  return (
    <main
      role="status"
      aria-label="Loading"
      className="mx-auto max-w-5xl px-4 py-8"
    >
      <span className="sr-only">Loading</span>

      {/* Header */}
      <div className="mb-8">
        <Skeleton className="h-9 w-1/2" />
        <Skeleton className="mt-3 h-4 w-3/4 rounded-md" />
      </div>

      {/* Card grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <Skeleton className="mb-3 size-24 rounded-lg" />
            <Skeleton className="h-5 w-3/4 rounded-md" />
            <div className="mt-4 space-y-2">
              <Skeleton className="h-3 w-full rounded-md" />
              <Skeleton className="h-3 w-full rounded-md" />
              <Skeleton className="h-3 w-2/3 rounded-md" />
            </div>
            <Skeleton className="mt-4 h-9 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </main>
  );
}
