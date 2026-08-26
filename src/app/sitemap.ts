/**
 * Next.js sitemap generation (App Router convention).
 *
 * Fetches all published content slugs from Sanity (reviews, guides,
 * blog posts, categories) and generates sitemap entries.
 *
 * Requirements: 4.5
 */

import type { MetadataRoute } from "next";
import { groq } from "next-sanity";
import { sanityClient } from "@/lib/sanity/client";
import {
  getBaseUrl,
  createSitemapEntries,
  createStaticPageEntries,
  newestContentDate,
} from "@/lib/seo/sitemap";
import { GIFT_GUIDES } from "@/lib/seo/gift-guides";
import {
  getValidToyTypeParams,
  getValidCategoryAgeParams,
} from "@/lib/seo/programmatic-pages";

/** GROQ query to fetch all published content slugs for the sitemap. */
const sitemapContentQuery = groq`{
  // _createdAt/publishedAt/recallCheckedAt are needed because the nightly recall
  // sweep bumps _updatedAt on every review; contentLastModified() uses them to
  // tell a real edit from that bookkeeping write.
  "reviews": *[_type == "toyReview"] | order(_updatedAt desc) { slug, _updatedAt, _createdAt, publishedAt, recallCheckedAt },
  "guides": *[_type == "buyingGuide"] | order(_updatedAt desc) { slug, _updatedAt },
  "blogPosts": *[_type == "blogPost" && (!defined(publishedAt) || publishedAt <= now())] | order(_updatedAt desc) { slug, _updatedAt },
  "categories": *[_type == "category"] | order(_updatedAt desc) { slug, _updatedAt },
  "ageBasedGuides": *[_type == "ageBasedGuide"] | order(_updatedAt desc) { slug, _updatedAt },
  "lastRecallSyncAt": *[_type == "recallSyncStatus"][0].lastSuccessfulSyncAt
}`;
// Note: safetyArticle documents are intentionally NOT included — there is no
// /articles route, so those URLs 404. Their content is surfaced under /blog.

interface SitemapContent {
  reviews: Array<{
    slug: { current: string };
    _updatedAt?: string;
    _createdAt?: string;
    publishedAt?: string | null;
    recallCheckedAt?: string | null;
  }>;
  guides: Array<{ slug: { current: string }; _updatedAt?: string }>;
  blogPosts: Array<{ slug: { current: string }; _updatedAt?: string }>;
  categories: Array<{ slug: { current: string }; _updatedAt?: string }>;
  ageBasedGuides: Array<{ slug: { current: string }; _updatedAt?: string }>;
  lastRecallSyncAt?: string | null;
}

/** Parse an ISO timestamp into a Date, or undefined when absent/invalid. */
function toDate(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/**
 * Newest `_updatedAt` in a list that the GROQ query already ordered by
 * `_updatedAt desc`, so the first entry wins.
 *
 * Only safe for document types nothing writes to on a schedule. Reviews use
 * `newestContentDate` instead, because ordering by `_updatedAt` puts whichever
 * review the nightly recall sweep happened to touch last at the front.
 */
function newestUpdatedAt(
  items: Array<{ _updatedAt?: string }>
): Date | undefined {
  return toDate(items[0]?._updatedAt);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();

  let content: SitemapContent = {
    reviews: [],
    guides: [],
    blogPosts: [],
    categories: [],
    ageBasedGuides: [],
    lastRecallSyncAt: null,
  };

  try {
    content = await sanityClient.fetch<SitemapContent>(sitemapContentQuery);
  } catch (error) {
    // If Sanity is unavailable, return static pages only
    console.error("[Sitemap] Failed to fetch content from Sanity:", error);
  }

  const staticPages = createStaticPageEntries(baseUrl, {
    reviews: newestContentDate(content.reviews),
    guides: newestUpdatedAt(content.guides),
    blogPosts: newestUpdatedAt(content.blogPosts),
    categories: newestUpdatedAt(content.categories),
    recalls: toDate(content.lastRecallSyncAt),
  });
  // Gift guides are defined in code (GIFT_GUIDES), so there is no per-guide
  // modification date to report — the entries ship without <lastmod>.
  const giftGuideEntries = GIFT_GUIDES.map((g) => ({
    url: `${baseUrl}/gift-guides/${g.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));
  const reviewEntries = createSitemapEntries(content.reviews, "/reviews", "weekly", 0.9);
  const guideEntries = createSitemapEntries(content.guides, "/guides", "weekly", 0.8);
  const blogEntries = createSitemapEntries(content.blogPosts, "/blog", "weekly", 0.7);
  const categoryEntries = createSitemapEntries(content.categories, "/categories", "monthly", 0.6);
  // Age-based guides are served at /best-toys/{slug} (not /guides/age).
  const ageGuideEntries = createSitemapEntries(content.ageBasedGuides, "/best-toys", "monthly", 0.7);

  // Programmatic listing pages. These render real, indexable content (they only
  // exist when at least MIN_REVIEWS_FOR_PAGE reviews match) but almost nothing
  // links to them, so without sitemap entries a crawler has no way to find them.
  const programmaticEntries = await getProgrammaticEntries(baseUrl);

  // De-duplicate: one <url> per address, even if two generators produce it.
  return dedupeByUrl([
    ...staticPages,
    ...giftGuideEntries,
    ...reviewEntries,
    ...guideEntries,
    ...blogEntries,
    ...categoryEntries,
    ...ageGuideEntries,
    ...programmaticEntries,
  ]);
}

/**
 * Sitemap entries for the `/safe-toys/{toyType}` and
 * `/best-toys/category/{category}/{ageGroup}` families.
 *
 * Best-effort: a Sanity failure here must not take the whole sitemap down, so
 * the error is logged and the remaining entries are still returned.
 */
async function getProgrammaticEntries(
  baseUrl: string
): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  try {
    const toyTypes = await getValidToyTypeParams();
    for (const { toyType } of toyTypes) {
      entries.push({
        url: `${baseUrl}/safe-toys/${toyType}`,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  } catch (error) {
    console.error("[Sitemap] Failed to resolve toy-type pages:", error);
  }

  try {
    const categoryAgePairs = await getValidCategoryAgeParams();
    for (const { category, ageGroup } of categoryAgePairs) {
      entries.push({
        url: `${baseUrl}/best-toys/category/${category}/${ageGroup}`,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  } catch (error) {
    console.error("[Sitemap] Failed to resolve category/age pages:", error);
  }

  return entries;
}

/** Keeps the first entry for each URL, preserving order. */
function dedupeByUrl(entries: MetadataRoute.Sitemap): MetadataRoute.Sitemap {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.url)) {
      return false;
    }
    seen.add(entry.url);
    return true;
  });
}
