import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Route-level loading skeleton for a toy review page. Mirrors the real layout:
 * title, product image, two score blocks, and body text lines.
 */
export default function ReviewLoading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="max-w-4xl mx-auto px-4 py-8 md:py-12 pb-24 lg:pb-12"
    >
      <span className="sr-only">Loading</span>

      {/* Header */}
      <div className="mb-8">
        <Skeleton className="h-9 w-2/3 md:h-10" />
        <Skeleton className="mt-3 h-4 w-40 rounded-md" />
      </div>

      {/* Product image */}
      <Skeleton className="mb-8 aspect-[16/9] max-h-[400px] w-full" />

      {/* Buy CTA bar */}
      <Skeleton className="mb-8 h-20 w-full" />

      {/* Score displays */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>

      {/* Text sections */}
      <div className="space-y-6">
        {[0, 1, 2].map((section) => (
          <div key={section} className="space-y-2">
            <Skeleton className="h-6 w-48 rounded-md" />
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-11/12 rounded-md" />
            <Skeleton className="h-4 w-4/5 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
