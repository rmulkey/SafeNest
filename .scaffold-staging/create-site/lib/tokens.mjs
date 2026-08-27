/**
 * Token derivation for the create-site scaffolder.
 *
 * The scaffolder uses simple, unambiguous string-token substitution (e.g.
 * `__SITE_NAME__`) over the files in `templates/`. Tokens are derived from the
 * operator's `--name` plus optional overrides; everything niche-specific that
 * is NOT a structural identifier stays in `site.config.ts` as a clearly-marked
 * `TODO` placeholder for the operator to fill in.
 *
 * The token delimiter is double-underscore (`__TOKEN__`) rather than mustache
 * `{{...}}` so substitution never collides with JSX object literals
 * (`style={{ ... }}`) that legitimately appear in the template `.tsx` files.
 */

/** Lower-case kebab-case slug, safe for a directory / package / path segment. */
export function toSlug(value) {
  return String(value)
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2") // camelCase boundaries → hyphen
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Strip non-alphanumerics for a niceish display name fallback (TitleCase-ish). */
export function toDisplayName(value) {
  const cleaned = String(value).trim().replace(/[-_]+/g, " ").replace(/\s+/g, " ");
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** camelCase a slug (for a Sanity document type name, e.g. "productReview"). */
function toCamel(value) {
  const parts = toSlug(value).split("-").filter(Boolean);
  if (parts.length === 0) return "";
  return (
    parts[0] +
    parts
      .slice(1)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join("")
  );
}

/**
 * Build the full token map from the parsed CLI options.
 *
 * `name` is required. Derived defaults:
 *  - slug / siteId  ← kebab-case of name
 *  - displayName    ← TitleCase of name (the user-facing brand name)
 *  - shortName      ← first word of the display name
 *  - nounSingular   ← "product"   (overridable; baked into the best-<noun> route)
 *  - nounPlural     ← "products"  (overridable; baked into the best-<noun> route)
 *  - reviewTypeName ← "productReview"
 *  - domain         ← "<slug>.example.com" (a clearly-fake placeholder)
 */
export function buildTokens(options) {
  const rawName = options.name;
  if (!rawName || !String(rawName).trim()) {
    throw new Error("A site --name is required.");
  }

  const slug = options.slug ? toSlug(options.slug) : toSlug(rawName);
  if (!slug) {
    throw new Error(`Could not derive a valid slug from name "${rawName}".`);
  }

  const displayName = options.displayName
    ? String(options.displayName)
    : toDisplayName(rawName);
  const shortName = options.shortName
    ? String(options.shortName)
    : displayName.split(" ")[0] || displayName;

  const siteId = options.siteId ? toSlug(options.siteId) : slug;
  const nounSingular = options.nounSingular ? toSlug(options.nounSingular) : "product";
  const nounPlural = options.nounPlural ? toSlug(options.nounPlural) : "products";
  const reviewTypeName = options.reviewTypeName
    ? toCamel(options.reviewTypeName)
    : `${toCamel(nounSingular)}Review`;
  const domain = options.domain ? String(options.domain) : `${slug}.example.com`;

  return {
    __SITE_NAME__: displayName,
    __SITE_SHORT_NAME__: shortName,
    __SITE_ID__: siteId,
    __SITE_SLUG__: slug,
    __SITE_DOMAIN__: domain,
    __PRODUCT_NOUN_SINGULAR__: nounSingular,
    __PRODUCT_NOUN_PLURAL__: nounPlural,
    __REVIEW_TYPE_NAME__: reviewTypeName,
  };
}

/** Replace every known token in a string with its value. */
export function applyTokens(text, tokens) {
  let out = text;
  for (const [token, value] of Object.entries(tokens)) {
    out = out.split(token).join(value);
  }
  return out;
}
