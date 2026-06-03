import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Route-level loading skeleton for a blog article. Mirrors the article header
 * (title, byline) and paragraphs of body text.
 */
export default function BlogPostLoading() {
  return (
    <main
      role="status"
      aria-label="Loading"
      className="mx-auto max-w-3xl px-4 py-12"
    >
      <span className="sr-only">Loading</span>

      <article>
        {/* Header */}
        <div className="mb-10 border-b border-border pb-8">
          <Skeleton className="h-4 w-24 rounded-md" />
          <Skeleton className="mt-4 h-10 w-full" />
          <Skeleton className="mt-3 h-10 w-2/3" />
          <div className="mt-5 flex items-center gap-3">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-4 w-40 rounded-md" />
          </div>
        </div>

        {/* Body paragraphs */}
        <div className="space-y-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              {i % 2 === 0 && <Skeleton className="mb-3 h-7 w-1/2 rounded-md" />}
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-11/12 rounded-md" />
              <Skeleton className="h-4 w-4/5 rounded-md" />
            </div>
          ))}
        </div>
      </article>
    </main>
  );
}
