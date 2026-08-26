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

/** Timestamps a Sanity document can offer for dating its content. */
export interface ContentTimestamps {
  _updatedAt?: string | null;
  _createdAt?: string | null;
  publishedAt?: string | null;
  /** Written by the daily CPSC sweep; see `contentLastModified`. */
  recallCheckedAt?: string | null;
}

/** Parse an ISO timestamp, or undefined when absent or unparseable. */
function toDate(value?: string | Date | null): Date | undefined {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/**
 * How close `_updatedAt` must be to `recallCheckedAt` to be read as the sweep's
 * own write rather than an edit.
 *
 * The sweep patches every review in sequence, so `_updatedAt` trails the shared
 * `syncedAt` by however long the loop takes. Thirty minutes is far longer than
 * that loop and far shorter than a day, so it separates the two cases cleanly.
 */
export const RECALL_SWEEP_WINDOW_MS = 30 * 60 * 1000;

/**
 * The date this document's *content* last changed, ignoring bookkeeping writes.
 *
 * `_updatedAt` is not a content signal on toyReview documents. The daily
 * `sync-recalls` cron patches `recallCheckedAt` on every review in the catalog
 * (src/lib/recalls/sync.ts) so a page can truthfully say "no matching CPSC recall
 * as of <date>". That write is required, but it bumps `_updatedAt` on all 138
 * reviews every night. Measured 2026-08-26: all 138 reviews reported
 * `_updatedAt` of that day and none had been created or edited that day, so the
 * sitemap was declaring 138 pages freshly modified daily.
 *
 * That is precisely the failure `createSitemapEntry` already warns about: a
 * `<lastmod>` that is always "now" is inaccurate, and search engines discount the
 * field across the whole sitemap once they notice. The site could least afford it
 * — Search Console showed all seven hub pages had never been crawled at all.
 *
 * So when the newest write looks like the sweep, fall back to the publication
 * date, which is a real content date.
 *
 * KNOWN LIMITATION: a genuine edit is reported until the next nightly sweep, and
 * from then on the entry reports its publication date again. Removing that would
 * require storing a dedicated content-revision timestamp, which means a schema
 * change and a Studio document action. Reporting a slightly stale date is honest;
 * reporting a fabricated fresh one is not.
 */
export function contentLastModified(doc: ContentTimestamps): Date | undefined {
  const updated = toDate(doc._updatedAt);
  const checked = toDate(doc.recallCheckedAt);

  if (
    updated &&
    checked &&
    Math.abs(updated.getTime() - checked.getTime()) <= RECALL_SWEEP_WINDOW_MS
  ) {
    return newestOf(toDate(doc.publishedAt), toDate(doc._createdAt));
  }
  return updated;
}

/** Newest content date across a set of documents, ignoring bookkeeping writes. */
export function newestContentDate(
  items: readonly ContentTimestamps[]
): Date | undefined {
  return newestOf(...items.map(contentLastModified));
}

/**
 * Creates sitemap entries from an array of content items with slugs.
 *
 * Dating goes through `contentLastModified`, so a document whose newest write was
 * the nightly recall sweep is dated by its publication date instead.
 */
export function createSitemapEntries(
  items: Array<{ slug: { current: string } } & ContentTimestamps>,
  prefix: string,
  changeFrequency: SitemapChangeFrequency = "weekly",
  priority: number = 0.7
): MetadataRoute.Sitemap {
  return items.map((item) =>
    createSitemapEntry({
      slug: item.slug.current,
      prefix,
      lastModified: contentLastModified(item),
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
    // /transparency, /about, /contact, /privacy and /terms are edited by hand;
    // we hold no reliable modification date for them, so they ship without
    // <lastmod>.
    entry("/transparency", "monthly", 0.6),
    entry("/privacy", "yearly", 0.3),
    entry("/terms", "yearly", 0.3),
    // Note: individual /gift-guides/{slug} pages are generated from GIFT_GUIDES
    // in sitemap.ts (giftGuideEntries), so they are intentionally omitted here
    // to avoid duplicate sitemap entries.
    entry("/about", "monthly", 0.4),
    entry("/contact", "monthly", 0.4),
  ];
}
