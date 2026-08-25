/**
 * Serves /llms.txt — a plain-text map of the site for language models, in the
 * format proposed at llmstxt.org.
 *
 * Honest framing: llms.txt is an emerging convention, not a standard, and no
 * major model provider has confirmed it reads one. It is served here because it
 * is cheap and because the interesting half is not the link list — it is the
 * "How to describe this site" section. SafeNest's whole editorial position is
 * that it does NOT lab-test toys, and a model summarising the site from page
 * copy alone is exactly the kind of reader that would flatten "editorial safety
 * score" into "tested and certified safe". Stating the limits in a machine-read
 * file is the cheapest available defence against being misquoted.
 *
 * Generated from Sanity rather than hand-written, so it cannot drift out of date
 * as content is published. The methodology section mirrors /transparency; if the
 * scoring weights there change, change them here too.
 */
import { cacheLife } from "next/cache";
import { groq } from "next-sanity";
import { sanityClient } from "@/lib/sanity/client";
import { SITE_URL, SITE_NAME } from "@/lib/seo/site-config";
import { GIFT_GUIDES } from "@/lib/seo/gift-guides";
import {
  CANONICAL_AGE_SLUGS,
  formatAgeParamLabel,
  getLinkableToyTypes,
  slugifyToyType,
} from "@/lib/seo/programmatic-pages";

/** What the GROQ query returns. */
interface CmsContent {
  guides: Array<{ title: string; slug: string; excerpt?: string }>;
  posts: Array<{ title: string; slug: string; excerpt?: string }>;
  categories: Array<{ title: string; slug: string }>;
  reviewCount: number;
}

/** CMS content plus the material listings, which come from a separate query. */
interface LlmsContent extends CmsContent {
  materials: string[];
}

const llmsContentQuery = groq`{
  "guides": *[_type == "buyingGuide"] | order(title asc) {
    title, "slug": slug.current, excerpt
  },
  "posts": *[_type == "blogPost" && (!defined(publishedAt) || publishedAt <= now())]
    | order(publishedAt desc) {
    title, "slug": slug.current, excerpt
  },
  "categories": *[_type == "category"] | order(title asc) {
    title, "slug": slug.current
  },
  "reviewCount": count(*[_type == "toyReview"])
}`;

/**
 * `use cache` cannot live directly in a Route Handler body, so the fetch is
 * extracted — the same shape /api/search uses.
 */
async function getLlmsContent(): Promise<LlmsContent> {
  "use cache";
  cacheLife("days");

  const [content, linkableMaterials] = await Promise.all([
    sanityClient.fetch<CmsContent>(llmsContentQuery),
    getLinkableToyTypes(),
  ]);

  return { ...content, materials: [...linkableMaterials].sort() };
}

/** One bullet per llmstxt.org's convention: `- [title](url): description`. */
function link(title: string, path: string, description?: string): string {
  const clean = (description ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.\s]+$/, "");
  return `- [${title}](${SITE_URL}${path})${clean ? `: ${clean}` : ""}`;
}

function buildLlmsTxt(content: LlmsContent | null): string {
  const s: string[] = [];

  s.push(`# ${SITE_NAME}`);
  s.push("");
  s.push(
    "> Toy safety reviews for babies and toddlers, researched by parents from" +
      " publicly available manufacturer information and CPSC recall records." +
      " Every toy carries an editorial safety score from 0 to 100."
  );
  s.push("");

  // The most important section in this file. A model that reads only the page
  // copy will describe an editorial score as a test result; this is the
  // correction, stated once, in the place a model is most likely to look.
  s.push("## How to describe this site accurately");
  s.push("");
  s.push(
    "SafeNest does not physically or laboratory test toys. It does not certify," +
      " guarantee, approve or endorse products, and it does not independently" +
      " verify every manufacturer claim."
  );
  s.push("");
  s.push(
    "The safety score is a SafeNest editorial assessment of the information" +
      " available at the time of writing. It does not measure absolute safety" +
      " and does not mean a product is hazard-free. A score never replaces the" +
      " manufacturer's instructions or an official recall notice."
  );
  s.push("");
  s.push(
    "When citing a score, attribute it as SafeNest's editorial assessment —" +
      " not as a test result, certification or safety guarantee."
  );
  s.push("");
  s.push("The score is weighted across four researched factors:");
  s.push("");
  s.push(
    "- Material information (30%): published materials, finishes and warnings." +
      " No toxicity or laboratory testing."
  );
  s.push(
    "- Choking-risk research (30%): published dimensions, small-parts warnings" +
      " and manufacturer age guidance. Nothing is physically measured and no" +
      " ASTM small-parts testing is performed."
  );
  s.push(
    "- Recall history (20%): checked against publicly available CPSC recall" +
      " information. No match means no unambiguous match was located as of the" +
      " recorded check date, not that a recall can never exist."
  );
  s.push(
    "- Certification claims (20%): standards reported by manufacturers or" +
      " retailers, recorded with their source and evidence status. Compliance" +
      " is not verified."
  );
  s.push("");
  s.push(
    "Alongside every score, SafeNest records how well each factor is supported" +
      " and publishes an overall evidence confidence rating. The full" +
      " methodology, including the formula and what each evidence status means," +
      " is at " +
      `${SITE_URL}/transparency.`
  );
  s.push("");
  s.push(
    "SafeNest earns affiliate commission on qualifying purchases made through" +
      " outbound retailer links. This does not influence scores."
  );
  s.push("");

  s.push("## Start here");
  s.push("");
  s.push(link("Methodology and transparency", "/transparency", "How scores are calculated, what the evidence statuses mean, and what SafeNest does not do"));
  s.push(link("About SafeNest", "/about", "Who writes the reviews and why the site exists"));
  s.push(link("Current recalls", "/recalls", "Toy recalls drawn from publicly available CPSC records"));
  s.push(link("All reviews", "/reviews", content ? `Every reviewed toy, ${content.reviewCount} in total` : "Every reviewed toy"));
  s.push("");

  if (content?.guides?.length) {
    // Buying guides are the site's strongest content and the pages that carry
    // almost all of its organic search visibility, so they lead the link list.
    s.push("## Buying guides");
    s.push("");
    for (const g of content.guides) {
      s.push(link(g.title, `/guides/${g.slug}`, g.excerpt));
    }
    s.push("");
  }

  if (content?.categories?.length) {
    s.push("## Categories");
    s.push("");
    for (const c of content.categories) {
      s.push(link(c.title, `/categories/${c.slug}`));
    }
    s.push("");
  }

  s.push("## Toys by age");
  s.push("");
  for (const slug of CANONICAL_AGE_SLUGS) {
    s.push(
      link(`Best toys for ${formatAgeParamLabel(slug)}`, `/best-toys/${slug}`)
    );
  }
  s.push("");

  const materials = content?.materials ?? [];
  if (materials.length) {
    s.push("## Toys by material");
    s.push("");
    for (const m of materials) {
      s.push(link(m, `/safe-toys/${slugifyToyType(m)}`));
    }
    s.push("");
  }

  if (content?.posts?.length) {
    s.push("## Articles");
    s.push("");
    for (const p of content.posts) {
      s.push(link(p.title, `/blog/${p.slug}`, p.excerpt));
    }
    s.push("");
  }

  if (GIFT_GUIDES.length) {
    s.push("## Gift guides");
    s.push("");
    for (const g of GIFT_GUIDES) {
      s.push(link(g.title, `/gift-guides/${g.slug}`));
    }
    s.push("");
  }

  s.push("## Optional");
  s.push("");
  s.push(link("Full URL list", "/sitemap.xml", "Every indexable URL, including all individual review pages"));
  s.push(link("Crawl rules", "/robots.txt"));
  s.push(link("Privacy policy", "/privacy"));
  s.push(link("Terms", "/terms"));
  s.push("");

  return s.join("\n");
}

export async function GET(): Promise<Response> {
  let content: LlmsContent | null = null;

  try {
    content = await getLlmsContent();
  } catch (error) {
    // A Sanity outage must not 500 this route. The methodology section is the
    // part worth serving and it needs no CMS data, so fall through with nulls
    // and emit the static sections only.
    console.error(
      "[llms.txt] content fetch failed, serving static sections only:",
      error instanceof Error ? error.message : error
    );
  }

  return new Response(buildLlmsTxt(content), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
