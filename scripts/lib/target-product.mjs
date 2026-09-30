/**
 * Read a Target product page's own product record.
 *
 * WHY THIS EXISTS
 * build-verified-queue.mjs used to regex-match `"primary_image":{"image_name":…}`
 * and nothing else. That proved *an* image existed on the page, never that it
 * belonged to the product being reviewed, and the age range, materials and
 * choking warning were typed into the candidate file by hand. A wrong URL would
 * have attached another product's photo to a review, which the data-integrity
 * rule forbids outright.
 *
 * Target ships the full product record in the page's `__NEXT_DATA__` script:
 * title, brand, primary image, the "Suggested Age" and "Material" bullets, and
 * the CPSC choking-hazard warning. Reading that record lets the pipeline check
 * the photo against the name and take the factual fields from the retailer's
 * listing instead of from memory.
 */

export const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

/** Target's item id, from any product URL shape (`/p/<slug>/-/A-<tcin>`). */
export function tcinFromUrl(url) {
  const m = String(url).match(/A-(\d{6,})/);
  return m ? m[1] : null;
}

/** Canonical product URL. Query strings and stray `%0D` suffixes are dropped. */
export function canonicalTargetUrl(url) {
  const tcin = tcinFromUrl(url);
  return tcin ? `https://www.target.com/p/-/A-${tcin}` : null;
}

const decode = (s) =>
  String(s ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

/**
 * Find the product record for `tcin` in the page's `__NEXT_DATA__`.
 *
 * Recommendation carousels can embed other products, so an object is only
 * accepted when its own `tcin` matches the one in the URL. If no object carries a
 * tcin, a lone product record is accepted; two or more unlabeled ones are
 * ambiguous and rejected.
 */
export function extractTargetItem(html, tcin) {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  let data;
  try {
    data = JSON.parse(m[1]);
  } catch {
    return null;
  }
  const matched = [];
  const unlabeled = [];
  const walk = (o) => {
    if (!o || typeof o !== "object") return;
    if (Array.isArray(o)) {
      o.forEach(walk);
      return;
    }
    if (o.item && typeof o.item === "object" && o.item.product_description) {
      if (String(o.tcin ?? "") === tcin) matched.push(o.item);
      else if (!o.tcin) unlabeled.push(o.item);
    }
    Object.values(o).forEach(walk);
  };
  walk(data);
  if (matched.length > 0) return matched[0];
  return unlabeled.length === 1 ? unlabeled[0] : null;
}

/**
 * Parse Target's "Suggested Age" bullet into months.
 *
 * Handles "5 Years and Up", "18 Months and Up", "Newborn and Up",
 * "0 Months and Up", and ranges such as "1 - 4 Years" or "6 Months - 4 Years".
 * Returns null when the listing gives no parseable age, so the caller can refuse
 * to guess.
 */
export function parseSuggestedAge(text) {
  const raw = decode(text);
  if (!raw) return null;
  const toMonths = (n, unit) =>
    Math.round(Number(n) * (/^y/i.test(unit) ? 12 : 1));

  if (/\bnewborn\b/i.test(raw)) return { raw, minMonths: 0, maxMonths: null };

  const range = raw.match(
    /(\d+(?:\.\d+)?)\s*(months?|years?)?\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*(months?|years?)/i
  );
  if (range) {
    const maxUnit = range[4];
    const minUnit = range[2] || maxUnit;
    return {
      raw,
      minMonths: toMonths(range[1], minUnit),
      maxMonths: toMonths(range[3], maxUnit),
    };
  }
  const up = raw.match(/(\d+(?:\.\d+)?)\s*(months?|years?)\b/i);
  if (up) return { raw, minMonths: toMonths(up[1], up[2]), maxMonths: null };
  return null;
}

/** The factual fields the pipeline takes from the listing. */
export function targetFacts(item, tcin) {
  const pd = item.product_description ?? {};
  const bullets = (pd.bullet_descriptions ?? []).map(decode);
  const bullet = (label) => {
    const b = bullets.find((x) => x.toLowerCase().startsWith(`${label.toLowerCase()}:`));
    return b ? b.slice(label.length + 1).trim() : null;
  };
  // Target names this `image_info`; `images` is kept as a fallback in case the
  // older key reappears.
  const images = item.enrichment?.image_info ?? item.enrichment?.images ?? {};
  const primary = images.primary_image ?? {};
  const imageName =
    primary.image_name ??
    (typeof images.primary_image_url === "string"
      ? images.primary_image_url.split("/").pop()
      : null);
  return {
    tcin,
    title: decode(pd.title),
    brand: decode(item.primary_brand?.name),
    imageName,
    suggestedAge: bullet("Suggested Age"),
    age: parseSuggestedAge(bullet("Suggested Age")),
    material: bullet("Material"),
    bullets,
    choking: (item.choking_hazard ?? []).map((c) => ({
      code: c.code,
      message: decode(c.message),
    })),
    highlights: (pd.soft_bullets?.bullets ?? []).map(decode),
    description: decode(pd.downstream_description),
  };
}

/** Fetch a product page and return its facts, or throw with a reason. */
export async function fetchTargetProduct(url, { fetchImpl = fetch } = {}) {
  const tcin = tcinFromUrl(url);
  if (!tcin) throw new Error(`no Target item id in ${url}`);
  const res = await fetchImpl(canonicalTargetUrl(url), {
    headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`target page HTTP ${res.status}`);
  const item = extractTargetItem(await res.text(), tcin);
  if (!item) throw new Error("product record not found on page");
  return targetFacts(item, tcin);
}

const STOP = new Set([
  "the", "and", "for", "with", "a", "an", "of", "to", "in", "on", "by",
  "toy", "toys", "baby", "babies", "kids", "set", "piece", "pieces", "pc",
]);
const tokens = (s) =>
  decode(s)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[™®©]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean);

/**
 * Does the listing describe the product the review names?
 *
 * The brand must match, and at least 60% of the name's distinctive words must
 * appear in Target's title. Brand words and generic words ("toy", "set") do not
 * count, since they would let a different product from the same maker pass.
 */
export function titleMatches(productName, brand, facts) {
  const brandTok = tokens(brand);
  const haystack = new Set([...tokens(facts.title), ...tokens(facts.brand)]);
  const brandOk =
    brandTok.length > 0 &&
    brandTok.every((t) => haystack.has(t) || t.length <= 1);
  const distinctive = tokens(productName).filter(
    (t) => !STOP.has(t) && !brandTok.includes(t)
  );
  const missing = distinctive.filter((t) => !haystack.has(t));
  const share = distinctive.length ? 1 - missing.length / distinctive.length : 0;
  return { ok: brandOk && share >= 0.6, brandOk, share, missing };
}
