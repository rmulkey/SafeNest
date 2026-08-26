import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getBaseUrl,
  generateSitemapXml,
  createSitemapEntry,
  createSitemapEntries,
  createStaticPageEntries,
  contentLastModified,
  newestContentDate,
} from "./sitemap";

/**
 * Unit tests for the pure sitemap helpers. Nothing here touches the network —
 * search-engine submission lives in indexnow.ts and is tested there.
 */

describe("getBaseUrl", () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("prefers NEXT_PUBLIC_SITE_URL when set", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://safenest.toys";
    expect(getBaseUrl()).toBe("https://safenest.toys");
  });

  it("falls back to the Vercel production URL (https-prefixed) when site URL is absent", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "safenest.vercel.app";
    expect(getBaseUrl()).toBe("https://safenest.vercel.app");
  });

  it("falls back to localhost when no env vars are set", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    expect(getBaseUrl()).toBe("http://localhost:3000");
  });
});

describe("generateSitemapXml", () => {
  it("produces a valid XML document with the urlset namespace", () => {
    const xml = generateSitemapXml([
      { url: "https://safenest.toys", priority: 1.0 },
    ]);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    );
    expect(xml.trimEnd().endsWith("</urlset>")).toBe(true);
  });

  it("emits one <url>/<loc> pair per entry", () => {
    const xml = generateSitemapXml([
      { url: "https://safenest.toys/a" },
      { url: "https://safenest.toys/b" },
      { url: "https://safenest.toys/c" },
    ]);
    const urlCount = xml.match(/<url>/g)?.length ?? 0;
    const locCount = xml.match(/<loc>/g)?.length ?? 0;
    expect(urlCount).toBe(3);
    expect(locCount).toBe(3);
    expect(xml).toContain("<loc>https://safenest.toys/a</loc>");
    expect(xml).toContain("<loc>https://safenest.toys/b</loc>");
    expect(xml).toContain("<loc>https://safenest.toys/c</loc>");
  });

  it("renders optional lastmod, changefreq and priority when present", () => {
    const xml = generateSitemapXml([
      {
        url: "https://safenest.toys/reviews",
        lastModified: new Date("2024-01-15T00:00:00.000Z"),
        changeFrequency: "daily",
        priority: 0.9,
      },
    ]);
    expect(xml).toContain("<lastmod>2024-01-15T00:00:00.000Z</lastmod>");
    expect(xml).toContain("<changefreq>daily</changefreq>");
    expect(xml).toContain("<priority>0.9</priority>");
  });

  it("omits optional tags when not provided", () => {
    const xml = generateSitemapXml([{ url: "https://safenest.toys/x" }]);
    expect(xml).not.toContain("<changefreq>");
    expect(xml).not.toContain("<priority>");
    expect(xml).not.toContain("<lastmod>");
  });

  it("returns a well-formed (empty) urlset for no entries", () => {
    const xml = generateSitemapXml([]);
    expect(xml).toContain("<urlset");
    expect(xml).toContain("</urlset>");
    expect(xml.match(/<url>/g)).toBeNull();
  });
});

describe("createSitemapEntry", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://safenest.toys";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("builds the URL as baseUrl + prefix + slug", () => {
    const entry = createSitemapEntry({
      slug: "wooden-blocks",
      prefix: "/reviews",
    });
    expect(entry.url).toBe("https://safenest.toys/reviews/wooden-blocks");
  });

  it("defaults changeFrequency to weekly and priority to 0.7", () => {
    const entry = createSitemapEntry({ slug: "abc", prefix: "/guides" });
    expect(entry.changeFrequency).toBe("weekly");
    expect(entry.priority).toBe(0.7);
  });

  it("honours explicit changeFrequency and priority", () => {
    const entry = createSitemapEntry({
      slug: "abc",
      prefix: "/guides",
      changeFrequency: "monthly",
      priority: 0.5,
    });
    expect(entry.changeFrequency).toBe("monthly");
    expect(entry.priority).toBe(0.5);
  });

  it("uses the supplied lastModified date", () => {
    const entry = createSitemapEntry({
      slug: "abc",
      prefix: "/reviews",
      lastModified: "2023-06-01T12:00:00.000Z",
    });
    expect(entry.lastModified).toEqual(new Date("2023-06-01T12:00:00.000Z"));
  });

  it("omits lastModified when the item has no known modification date", () => {
    const entry = createSitemapEntry({ slug: "abc", prefix: "/reviews" });
    expect(entry.lastModified).toBeUndefined();
  });
});

describe("createSitemapEntries", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://safenest.toys";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("maps each item's slug to a prefixed sitemap entry", () => {
    const entries = createSitemapEntries(
      [
        { slug: { current: "a" }, _updatedAt: "2024-01-01T00:00:00.000Z" },
        { slug: { current: "b" } },
      ],
      "/reviews"
    );
    expect(entries).toHaveLength(2);
    expect(entries[0].url).toBe("https://safenest.toys/reviews/a");
    expect(entries[1].url).toBe("https://safenest.toys/reviews/b");
    expect(entries[0].lastModified).toEqual(
      new Date("2024-01-01T00:00:00.000Z")
    );
  });

  it("applies custom changeFrequency and priority to all entries", () => {
    const entries = createSitemapEntries(
      [{ slug: { current: "a" } }],
      "/guides",
      "monthly",
      0.6
    );
    expect(entries[0].changeFrequency).toBe("monthly");
    expect(entries[0].priority).toBe(0.6);
  });
});

describe("createStaticPageEntries", () => {
  const baseUrl = "https://safenest.toys";

  it("includes the homepage with priority 1.0", () => {
    const entries = createStaticPageEntries(baseUrl);
    const home = entries.find((e) => e.url === baseUrl);
    expect(home).toBeDefined();
    expect(home?.priority).toBe(1.0);
    expect(home?.changeFrequency).toBe("daily");
  });

  it("produces URLs that all begin with the supplied base URL", () => {
    const entries = createStaticPageEntries(baseUrl);
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry.url.startsWith(baseUrl)).toBe(true);
    }
  });

  it("includes the key marketing pages (reviews, recalls, best-toys)", () => {
    const urls = createStaticPageEntries(baseUrl).map((e) => e.url);
    expect(urls).toContain(`${baseUrl}/reviews`);
    expect(urls).toContain(`${baseUrl}/recalls`);
    expect(urls).toContain(`${baseUrl}/best-toys`);
  });

  it("keeps every priority within the [0, 1] range", () => {
    for (const entry of createStaticPageEntries(baseUrl)) {
      expect(entry.priority).toBeGreaterThanOrEqual(0);
      expect(entry.priority).toBeLessThanOrEqual(1);
    }
  });

  it("omits lastmod entirely when no real dates are known", () => {
    // A <lastmod> of "now" on every crawl is inaccurate, and search engines
    // discount the field for the whole sitemap once they notice.
    for (const entry of createStaticPageEntries(baseUrl)) {
      expect(entry.lastModified).toBeUndefined();
    }
  });

  it("dates content listings from the newest content they render", () => {
    const reviews = new Date("2026-07-20T00:00:00.000Z");
    const guides = new Date("2026-07-22T00:00:00.000Z");
    const blogPosts = new Date("2026-07-25T00:00:00.000Z");
    const categories = new Date("2026-06-01T00:00:00.000Z");
    const recalls = new Date("2026-07-28T17:42:00.000Z");

    const entries = createStaticPageEntries(baseUrl, {
      reviews,
      guides,
      blogPosts,
      categories,
      recalls,
    });
    const byUrl = new Map(entries.map((e) => [e.url, e]));

    expect(byUrl.get(`${baseUrl}/reviews`)?.lastModified).toEqual(reviews);
    expect(byUrl.get(`${baseUrl}/guides`)?.lastModified).toEqual(guides);
    expect(byUrl.get(`${baseUrl}/blog`)?.lastModified).toEqual(blogPosts);
    expect(byUrl.get(`${baseUrl}/categories`)?.lastModified).toEqual(categories);
    // /recalls is dated by the CPSC sync, not by CMS edits.
    expect(byUrl.get(`${baseUrl}/recalls`)?.lastModified).toEqual(recalls);
    // The homepage surfaces all of them, so it takes the newest.
    expect(byUrl.get(baseUrl)?.lastModified).toEqual(blogPosts);
  });

  it("leaves hand-edited pages undated even when content dates are known", () => {
    const entries = createStaticPageEntries(baseUrl, {
      reviews: new Date("2026-07-20T00:00:00.000Z"),
    });
    const byUrl = new Map(entries.map((e) => [e.url, e]));

    for (const path of ["/transparency", "/about", "/contact"]) {
      expect(byUrl.get(`${baseUrl}${path}`)?.lastModified).toBeUndefined();
    }
  });

  it("lists only the canonical age slugs, never raw month counts", () => {
    // /best-toys/18 and /best-toys/1-2-years render the same toys; only the
    // canonical spelling belongs in the sitemap.
    const urls = createStaticPageEntries(baseUrl).map((e) => e.url);
    expect(urls).toContain(`${baseUrl}/best-toys/1-2-years`);
    expect(urls).toContain(`${baseUrl}/best-toys/0-6-months`);
    expect(urls).toContain(`${baseUrl}/best-toys/6-12-months`);
    expect(urls).toContain(`${baseUrl}/best-toys/2-3-years`);
    expect(urls).toContain(`${baseUrl}/best-toys/3-plus-years`);

    const numericAgeUrls = urls.filter((u) =>
      /\/best-toys\/\d+$/.test(u)
    );
    expect(numericAgeUrls).toEqual([]);

    // Alias slugs that resolve to an age already covered above.
    for (const alias of ["0-12-months", "12-24-months", "24-36-months", "3-4-years"]) {
      expect(urls).not.toContain(`${baseUrl}/best-toys/${alias}`);
    }
  });

  it("emits each URL only once", () => {
    const urls = createStaticPageEntries(baseUrl).map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
  });
});

/**
 * Dating must survive the nightly CPSC recall sweep.
 *
 * Measured on production 2026-08-26: all 138 toyReview documents reported an
 * `_updatedAt` of that day, and none had been created or edited that day. The
 * sweep in src/lib/recalls/sync.ts patches `recallCheckedAt` on every review
 * nightly, so the sitemap claimed 138 pages had changed, every day.
 */
describe("contentLastModified — ignores the nightly recall sweep", () => {
  const PUBLISHED = "2026-06-01T09:00:00.000Z";
  const CREATED = "2026-05-20T09:00:00.000Z";

  it("dates by publishedAt when the newest write was the sweep", () => {
    const d = contentLastModified({
      _updatedAt: "2026-08-26T05:00:11.000Z",
      _createdAt: CREATED,
      publishedAt: PUBLISHED,
      recallCheckedAt: "2026-08-26T05:00:00.000Z",
    });
    expect(d?.toISOString()).toBe(PUBLISHED);
  });

  it("tolerates _updatedAt trailing the shared syncedAt across a long sweep", () => {
    // The sweep commits reviews one at a time, so the last review's _updatedAt is
    // minutes after the syncedAt every review records.
    const d = contentLastModified({
      _updatedAt: "2026-08-26T05:24:00.000Z",
      _createdAt: CREATED,
      publishedAt: PUBLISHED,
      recallCheckedAt: "2026-08-26T05:00:00.000Z",
    });
    expect(d?.toISOString()).toBe(PUBLISHED);
  });

  it("reports a real edit made well away from the sweep", () => {
    const edited = "2026-08-26T14:30:00.000Z";
    const d = contentLastModified({
      _updatedAt: edited,
      _createdAt: CREATED,
      publishedAt: PUBLISHED,
      recallCheckedAt: "2026-08-26T05:00:00.000Z",
    });
    expect(d?.toISOString()).toBe(edited);
  });

  it("falls back to _createdAt when there is no publishedAt", () => {
    const d = contentLastModified({
      _updatedAt: "2026-08-26T05:00:05.000Z",
      _createdAt: CREATED,
      recallCheckedAt: "2026-08-26T05:00:00.000Z",
    });
    expect(d?.toISOString()).toBe(CREATED);
  });

  it("uses _updatedAt for documents the sweep never touches", () => {
    // Guides, posts and categories carry no recallCheckedAt.
    const d = contentLastModified({ _updatedAt: PUBLISHED });
    expect(d?.toISOString()).toBe(PUBLISHED);
  });

  it("returns undefined rather than a fabricated date when nothing is known", () => {
    expect(contentLastModified({})).toBeUndefined();
    expect(contentLastModified({ _updatedAt: null })).toBeUndefined();
    expect(contentLastModified({ _updatedAt: "not a date" })).toBeUndefined();
  });

  it("never reports a date newer than the document's own writes", () => {
    const d = contentLastModified({
      _updatedAt: "2026-08-26T05:00:00.000Z",
      _createdAt: CREATED,
      publishedAt: PUBLISHED,
      recallCheckedAt: "2026-08-26T05:00:00.000Z",
    });
    expect(d!.getTime()).toBeLessThanOrEqual(
      new Date("2026-08-26T05:00:00.000Z").getTime()
    );
  });
});

describe("newestContentDate", () => {
  it("does not report today merely because the sweep ran today", () => {
    const swept = Array.from({ length: 138 }, (_, i) => ({
      _updatedAt: "2026-08-26T05:00:00.000Z",
      _createdAt: "2026-05-01T00:00:00.000Z",
      publishedAt: `2026-06-${String((i % 28) + 1).padStart(2, "0")}T00:00:00.000Z`,
      recallCheckedAt: "2026-08-26T05:00:00.000Z",
    }));
    const d = newestContentDate(swept);
    expect(d?.toISOString()).toBe("2026-06-28T00:00:00.000Z");
  });

  it("takes the max rather than trusting list order", () => {
    // The GROQ query orders by _updatedAt desc, which no longer correlates with
    // the content date once the sweep has run.
    const d = newestContentDate([
      { _updatedAt: "2026-08-26T05:00:00.000Z", publishedAt: "2026-06-01T00:00:00.000Z", recallCheckedAt: "2026-08-26T05:00:00.000Z" },
      { _updatedAt: "2026-08-26T04:59:00.000Z", publishedAt: "2026-07-15T00:00:00.000Z", recallCheckedAt: "2026-08-26T05:00:00.000Z" },
    ]);
    expect(d?.toISOString()).toBe("2026-07-15T00:00:00.000Z");
  });

  it("returns undefined for an empty list", () => {
    expect(newestContentDate([])).toBeUndefined();
  });
});

describe("createSitemapEntries — dating", () => {
  it("omits lastModified rather than defaulting to now", () => {
    const [entry] = createSitemapEntries(
      [{ slug: { current: "a" } }],
      "/reviews"
    );
    expect(entry.lastModified).toBeUndefined();
  });

  it("dates a swept review by its publication date", () => {
    const [entry] = createSitemapEntries(
      [
        {
          slug: { current: "a" },
          _updatedAt: "2026-08-26T05:00:02.000Z",
          publishedAt: "2026-06-01T09:00:00.000Z",
          recallCheckedAt: "2026-08-26T05:00:00.000Z",
        },
      ],
      "/reviews"
    );
    expect((entry.lastModified as Date).toISOString()).toBe(
      "2026-06-01T09:00:00.000Z"
    );
  });
});
