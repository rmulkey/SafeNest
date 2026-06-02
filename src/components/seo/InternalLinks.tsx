/**
 * InternalLinks - Displays 3–6 related content links based on shared category and age range.
 *
 * Fetches related toy reviews, buying guides, and age-based guides from Sanity CMS,
 * filtering by matching category or overlapping age range.
 *
 * Requirements: 4.3
 */

import Link from "next/link";
import { sanityClient } from "@/lib/sanity/client";
import { relatedContentQuery } from "@/lib/sanity/queries";

interface RelatedItem {
  _id: string;
  _type: "toyReview" | "buyingGuide" | "ageBasedGuide";
  title: string;
  slug: { current: string };
}

interface InternalLinksProps {
  /** The current document's Sanity _id (to exclude from results) */
  currentDocId: string;
  /** The category reference ID for matching related content */
  categoryId?: string | null;
  /** Age range for matching related content */
  ageRange?: { minMonths: number; maxMonths: number } | null;
}

function getHref(item: RelatedItem): string {
  const slug = item.slug.current;
  switch (item._type) {
    case "toyReview":
      return `/reviews/${slug}`;
    case "buyingGuide":
      return `/guides/${slug}`;
    case "ageBasedGuide":
      return `/best-toys/${slug}`;
    default:
      return `/reviews/${slug}`;
  }
}

function getTypeLabel(type: RelatedItem["_type"]): string {
  switch (type) {
    case "toyReview":
      return "Review";
    case "buyingGuide":
      return "Guide";
    case "ageBasedGuide":
      return "Age Guide";
    default:
      return "Article";
  }
}

export async function InternalLinks({
  currentDocId,
  categoryId,
  ageRange,
}: InternalLinksProps) {
  const items = await sanityClient.fetch<RelatedItem[]>(relatedContentQuery, {
    currentDocId,
    categoryId: categoryId ?? "",
    minMonths: ageRange?.minMonths ?? 0,
    maxMonths: ageRange?.maxMonths ?? 120,
  });

  // Require minimum 3 links; cap at 6
  if (!items || items.length < 3) {
    return null;
  }

  const links = items.slice(0, 6);

  return (
    <aside aria-label="Related content" className="mt-12 border-t pt-8">
      <h2 className="text-lg font-semibold mb-4">Related Content</h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {links.map((item) => (
          <li key={item._id}>
            <Link
              href={getHref(item)}
              className="block rounded-lg border border-border p-3 hover:border-primary-400 hover:shadow-sm transition-all"
            >
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {getTypeLabel(item._type)}
              </span>
              <p className="mt-1 text-sm font-medium">{item.title}</p>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
