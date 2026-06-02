/**
 * Affiliate URL construction utilities.
 * Supports Amazon affiliate links and custom partner URL patterns.
 */

/**
 * Builds an affiliate URL by appending the appropriate tracking parameters.
 *
 * For Amazon links: appends ?tag={affiliateTag} (or &tag= if query params exist)
 * For other partners: appends a custom attribution parameter ?ref={affiliateTag}
 *
 * @param destinationUrl - The base product URL
 * @param partnerId - The affiliate partner identifier (e.g., "amazon", "brand-direct")
 * @param affiliateTag - The affiliate tag/tracking code to append
 * @returns The destination URL with affiliate tracking parameters
 */
export function buildAffiliateUrl(
  destinationUrl: string,
  partnerId: string,
  affiliateTag: string
): string {
  try {
    const url = new URL(destinationUrl);

    if (partnerId === "amazon") {
      url.searchParams.set("tag", affiliateTag);
    } else {
      // For other partners, use a generic ref parameter for attribution
      url.searchParams.set("ref", affiliateTag);
    }

    return url.toString();
  } catch {
    // If the URL is malformed, return it as-is
    return destinationUrl;
  }
}

/**
 * Known Amazon registrable suffixes (the part after the "amazon" label).
 * Kept as an explicit allowlist so that look-alike hosts like
 * "amazon.evil.com" or "amazon.com.evil.example" cannot pass.
 */
const AMAZON_SUFFIXES = [
  "com",
  "ca",
  "co.uk",
  "de",
  "fr",
  "es",
  "it",
  "nl",
  "se",
  "pl",
  "co.jp",
  "in",
  "com.au",
  "com.br",
  "com.mx",
  "com.tr",
  "sg",
  "ae",
  "sa",
  "eg",
];

/**
 * Returns true when `host` is an Amazon-owned hostname, i.e. the registrable
 * domain is `amazon.<known-suffix>` (optionally with subdomains) or an
 * `amzn.to` short link.
 */
function isAmazonHost(host: string): boolean {
  if (host === "amzn.to" || host.endsWith(".amzn.to")) {
    return true;
  }
  return AMAZON_SUFFIXES.some(
    (suffix) =>
      host === `amazon.${suffix}` || host.endsWith(`.amazon.${suffix}`)
  );
}

/**
 * Matches the path of an Amazon **direct product** link: `/dp/{ASIN}` (an ASIN
 * is a short alphanumeric token) or a `/gp/product/` path. These are the
 * fabricated-link risk under the project's data-integrity rule because they
 * encode a specific product id that must be verified to resolve to a live page.
 */
const DP_PATH_PATTERN = /\/dp\/[A-Za-z0-9]+/i;
const GP_PRODUCT_PATH_PATTERN = /\/gp\/product\//i;

/**
 * Returns true when `url` is an Amazon **direct product** link of the form
 * `/dp/{ASIN}` or `/gp/product/...`.
 *
 * Such links are flagged because they carry a concrete product identifier that
 * may have been fabricated. Per the data-integrity rule, a direct product link
 * is only acceptable once its ASIN has been verified to resolve to a live page;
 * otherwise the safe fallback is an Amazon **search** URL (`/s?k=`), which this
 * function does NOT flag.
 *
 * Non-Amazon hosts, search URLs, relative paths, and malformed/empty strings
 * all return false.
 *
 * @param url - The candidate URL
 * @returns true only for Amazon direct-product (`/dp/` or `/gp/product/`) links
 */
export function isFabricatedDpLink(url: string): boolean {
  if (typeof url !== "string" || url.trim() === "") {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  if (!isAmazonHost(parsed.hostname.toLowerCase())) {
    return false;
  }

  return (
    DP_PATH_PATTERN.test(parsed.pathname) ||
    GP_PRODUCT_PATH_PATTERN.test(parsed.pathname)
  );
}

/**
 * Validates that an affiliate URL is one we are allowed to store/display.
 *
 * This encodes the project's data-integrity rule for links: every affiliate
 * link must resolve to a real Amazon destination. We therefore only accept
 * absolute http(s) Amazon URLs that are either:
 *   - an Amazon **search** URL (path `/s` with a `k=` query param), or
 *   - a **direct product** URL (path contains `/dp/` or `/gp/`).
 *
 * Fabricated, empty, relative, or non-Amazon URLs are rejected so they can
 * never silently become "verified" data.
 *
 * @param url - The candidate affiliate URL
 * @returns true only for valid Amazon search or product URLs
 */
export function isValidAffiliateUrl(url: string): boolean {
  if (typeof url !== "string" || url.trim() === "") {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    // Relative or otherwise malformed URLs throw and are rejected.
    return false;
  }

  // Only secure/standard web protocols are acceptable.
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  // Must point at an Amazon domain (amazon.com, amazon.co.uk, amzn.to, ...).
  // Crucially, "amazon" must be the *registrable* domain — not just any label —
  // so look-alikes such as "amazon.com.evil.example" or "amazon.evil.com" are
  // rejected.
  if (!isAmazonHost(parsed.hostname.toLowerCase())) {
    return false;
  }

  // Amazon search URL: /s?k=...
  const isSearchUrl =
    parsed.pathname === "/s" && parsed.searchParams.has("k");

  // Direct product URL: path contains /dp/ or /gp/
  const isProductUrl =
    parsed.pathname.includes("/dp/") || parsed.pathname.includes("/gp/");

  return isSearchUrl || isProductUrl;
}
