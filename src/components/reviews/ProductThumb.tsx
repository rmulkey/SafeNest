import Image from "next/image";
import { urlForImage } from "@/lib/sanity/client";

interface ProductThumbProps {
  /** Sanity image reference. When absent, a neutral placeholder is rendered. */
  mainImage?: { asset: { _ref: string }; alt?: string } | null;
  /** Used as the alt text fallback when the asset carries no alt of its own. */
  productName: string;
  /** Rendered box, in px. Square. */
  size: number;
  className?: string;
}

/**
 * Square product thumbnail for listing cards.
 *
 * Extracted from ComparisonTable, which had the only working implementation.
 * `/best-toys/category/[category]/[ageGroup]` and `/safe-toys/[toyType]` were
 * fetching `mainImage` in their GROQ projections and never rendering it, so
 * those pages listed 38-53 product cards with no product photo at all — while
 * asking the reader to buy. Sharing one component fixes both pages without
 * adding yet another hand-rolled card variant.
 *
 * The placeholder is `aria-hidden` because the product name is always rendered
 * as text next to it; announcing "teddy bear emoji" adds nothing.
 */
export function ProductThumb({
  mainImage,
  productName,
  size,
  className = "",
}: ProductThumbProps) {
  if (!mainImage) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground ${className}`}
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <span className="text-lg">🧸</span>
      </div>
    );
  }

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-lg bg-muted ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={urlForImage(mainImage).width(size * 2).height(size * 2).url()}
        alt={mainImage.alt || productName}
        fill
        className="object-cover"
        sizes={`${size}px`}
      />
    </div>
  );
}
