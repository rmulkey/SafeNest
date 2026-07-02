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
 * Search engine ping URLs for sitemap submission.
 * Google no longer supports the ping endpoint (deprecated 2023),
 * but IndexNow and Bing still accept pings.
 */
const SEARCH_ENGINE_PING_URLS = [
  "https://www.bing.com/indexnow",
] as const;

/**
 * Pings search engines to notify them of sitemap updates.
 * Sends the sitemap URL to each engine's ping endpoint.
 * Failures are logged but do not throw — search engine pinging is best-effort.
 *
 * @param sitemapUrl - The full URL to the sitemap (e.g., https://safenesttoys.com/sitemap.xml)
 */
export async function pingSearchEngines(sitemapUrl?: string): Promise<void> {
  const resolvedUrl = sitemapUrl ?? `${getBaseUrl()}/sitemap.xml`;

  const results = await Promise.allSettled(
    SEARCH_ENGINE_PING_URLS.map(async (pingUrl) => {
      try {
        const response = await fetch(`${pingUrl}?url=${encodeURIComponent(resolvedUrl)}`, {
          method: "GET",
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) {
          console.warn(
            `[Sitemap] Ping to ${pingUrl} returned status ${response.status}`
          );
        } else {
          console.log(`[Sitemap] Successfully pinged ${pingUrl}`);
        }
      } catch (error) {
        console.warn(`[Sitemap] Failed to ping ${pingUrl}:`, error);
      }
    })
  );

  const failures = results.filter((r) => r.status === "rejected");
  if (failures.length > 0) {
    console.warn(`[Sitemap] ${failures.length} search engine ping(s) failed`);
  }
}

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
    lastModified: lastModified ? new Date(lastModified) : new Date(),
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
 * Creates static page sitemap entries for pages that rarely change.
 */
export function createStaticPageEntries(baseUrl: string): MetadataRoute.Sitemap {
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/reviews`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/recalls`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/guides`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/best-toys`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/gift-guides`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/best-toys/0-6-months`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/best-toys/6-12-months`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/best-toys/1-2-years`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/best-toys/2-3-years`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/best-toys/3-plus-years`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/transparency`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    // Note: individual /gift-guides/{slug} pages are generated from GIFT_GUIDES
    // in sitemap.ts (giftGuideEntries), so they are intentionally omitted here
    // to avoid duplicate sitemap entries.
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];
}
