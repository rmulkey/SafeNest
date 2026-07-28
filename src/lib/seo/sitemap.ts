/**
 * Sitemap URL generation helpers for SafeNest Toys.
 *
 * Provides utility functions for constructing sitemap entries
 * from Sanity content slugs, XML sitemap generation, and
 * search engine ping functionality.
 *
 * Requirements: 2.3, 4.5
 */

import type { MetadataRoute } from "next";

/**
 * Base URL for the site. Falls back to localhost for development.
 */
export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}

/**
 * Generates an XML sitemap string from an array of sitemap entries.
 * Useful for programmatic sitemap generation outside Next.js conventions.
 */
export function generateSitemapXml(entries: MetadataRoute.Sitemap): string {
  const urlEntries = entries
    .map((entry) => {
      const lastmod = entry.lastModified
        ? `<lastmod>${new Date(entry.lastModified).toISOString()}</lastmod>`
        : "";
      const changefreq = entry.changeFrequency
        ? `<changefreq>${entry.changeFrequency}</changefreq>`
        : "";
      const priority =
        entry.priority !== undefined
          ? `<priority>${entry.priority.toFixed(1)}</priority>`
          : "";

      return `  <url>\n    <loc>${entry.url}</loc>\n    ${lastmod}\n    ${changefreq}\n    ${priority}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>`;
}

/**
 * Search-engine notification lives in ./indexnow.ts.
 *
 * The previous implementation here GET-ed `bing.com/indexnow?url=<sitemap>` with
 * no key, which the protocol rejects with HTTP 400 — so it never notified
 * anything. It also could not have worked as written: IndexNow submits changed
 * page URLs, not a sitemap URL.
 *
 * There is no equivalent call for Google. Its Indexing API accepts only
 * JobPosting and BroadcastEvent pages, and the sitemap ping endpoint was retired
 * in 2024. Google discovers this site through the `Sitemap:` line in robots.txt
 * and through Search Console.
 */

export type SitemapChangeFrequency = MetadataRoute.Sitemap[number]["changeFrequency"];

export interface SitemapEntryOptions {
  slug: string;
  prefix: string;
  lastModified?: string | Date;
  changeFrequency?: SitemapChangeFrequency;
  priority?: number;
}

/**
 * Generates a single sitemap entry from a slug and path prefix.
 */
export function createSitemapEntry(options: SitemapEntryOptions): MetadataRoute.Sitemap[number] {
  const { slug, prefix, lastModified, changeFrequency = "weekly", priority = 0.7 } = options;
  const baseUrl = getBaseUrl();

  return {
    url: `${baseUrl}${prefix}/${slug}`,
    // Omitted rather than defaulted to "now": an inaccurate <lastmod> teaches
    // search engines to ignore the field across the whole sitemap.
    ...(lastModified ? { lastModified: new Date(lastModified) } : {}),
    changeFrequency,
    priority,
  };
}

/**
 * Creates sitemap entries from an array of content items with slugs.
 */
export function createSitemapEntries(
  items: Array<{ slug: { current: string }; _updatedAt?: string }>,
  prefix: string,
  changeFrequency: SitemapChangeFrequency = "weekly",
  priority: number = 0.7
): MetadataRoute.Sitemap {
  return items.map((item) =>
    createSitemapEntry({
      slug: item.slug.current,
      prefix,
      lastModified: item._updatedAt,
      changeFrequency,
      priority,
    })
  );
}

/**
 * Real "last modified" timestamps for the hand-maintained sitemap entries.
 *
 * These pages are listings rather than documents, so their freshness comes from
 * the content they render. Anything we cannot date honestly is left undated —
 * `<lastmod>` that simply reports "now" on every crawl is inaccurate, and search
 * engines discount the signal for the whole sitemap when they detect that.
 */
export interface StaticPageDates {
  /** Newest `_updatedAt` across the toy reviews. */
  reviews?: Date;
  /** Newest `_updatedAt` across the buying guides. */
  guides?: Date;
  /** Newest `_updatedAt` across the blog posts. */
  blogPosts?: Date;
  /** Newest `_updatedAt` across the categories. */
  categories?: Date;
  /** Timestamp of the last successful CPSC recall sync. */
  recalls?: Date;
}

/** Most recent of the supplied dates, or undefined when none are known. */
function newestOf(...dates: Array<Date | undefined>): Date | undefined {
  const known = dates.filter((d): d is Date => d instanceof Date && !Number.isNaN(d.getTime()));
  if (known.length === 0) {
    return undefined;
  }
  return known.reduce((latest, d) => (d > latest ? d : latest));
}

/**
 * Creates sitemap entries for the site's hand-maintained (non-slug) pages.
 *
 * `dates` is optional so existing callers and tests keep working; when it is
 * omitted the entries carry no `<lastmod>` at all rather than a fabricated one.
 */
export function createStaticPageEntries(
  baseUrl: string,
  dates: StaticPageDates = {}
): MetadataRoute.Sitemap {
  const { reviews, guides, blogPosts, categories, recalls } = dates;
  // The homepage surfaces reviews, guides and posts, so it is as fresh as the
  // newest of them.
  const anyContent = newestOf(reviews, guides, blogPosts, categories);
  const ageListings = reviews;

  const entry = (
    path: string,
    changeFrequency: SitemapChangeFrequency,
    priority: number,
    lastModified?: Date
  ): MetadataRoute.Sitemap[number] => ({
    url: path ? `${baseUrl}${path}` : baseUrl,
    ...(lastModified ? { lastModified } : {}),
    changeFrequency,
    priority,
  });

  return [
    entry("", "daily", 1.0, anyContent),
    entry("/reviews", "daily", 0.9, reviews),
    entry("/categories", "weekly", 0.7, categories),
    entry("/recalls", "daily", 0.8, recalls),
    entry("/guides", "weekly", 0.8, guides),
    entry("/blog", "daily", 0.7, blogPosts),
    entry("/best-toys", "weekly", 0.8, ageListings),
    entry("/gift-guides", "weekly", 0.8, anyContent),
    // Only the canonical age slugs are listed. `/best-toys/[age]` also answers
    // raw month counts and alias slugs, but those canonicalise to these URLs
    // (see CANONICAL_AGE_SLUG_BY_MONTHS) and must not compete in the sitemap.
    entry("/best-toys/0-6-months", "weekly", 0.7, ageListings),
    entry("/best-toys/6-12-months", "weekly", 0.7, ageListings),
    entry("/best-toys/1-2-years", "weekly", 0.7, ageListings),
    entry("/best-toys/2-3-years", "weekly", 0.7, ageListings),
    entry("/best-toys/3-plus-years", "weekly", 0.7, ageListings),
    // /transparency, /about and /contact are edited by hand; we hold no reliable
    // modification date for them, so they ship without <lastmod>.
    entry("/transparency", "monthly", 0.6),
    // Note: individual /gift-guides/{slug} pages are generated from GIFT_GUIDES
    // in sitemap.ts (giftGuideEntries), so they are intentionally omitted here
    // to avoid duplicate sitemap entries.
    entry("/about", "monthly", 0.4),
    entry("/contact", "monthly", 0.4),
  ];
}
