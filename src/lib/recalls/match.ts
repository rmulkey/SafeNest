/**
 * Matching CPSC recalls to reviewed products.
 *
 * THIS IS THE HIGHEST-RISK CODE IN THE RECALL PIPELINE.
 * A false positive tells a parent that a safe toy is recalled. A false negative
 * leaves a genuinely recalled toy unflagged. Both are harmful, so the design is
 * deliberately conservative:
 *
 *  - Only a strong, explainable signal auto-confirms a match: the recall must
 *    name the product's brand AND share a distinctive product-name token, or
 *    match an explicit model number.
 *  - Anything weaker becomes a REVIEW CANDIDATE for a human to adjudicate. It is
 *    never published as a confirmed match.
 *  - Brand alone is never sufficient. "Melissa & Doug recalls a jigsaw puzzle"
 *    must not flag every Melissa & Doug toy in the catalog.
 *  - Every decision carries the evidence that produced it, so a human can audit
 *    why something matched.
 */
import type { NormalizedRecall } from "./normalize";

export interface CatalogProduct {
  _id: string;
  productName: string;
  brand?: string;
  slug?: string;
}

export type MatchConfidence = "confirmed" | "needs-review" | "no-match";

export interface MatchResult {
  productId: string;
  productName: string;
  recallNumber: string;
  confidence: MatchConfidence;
  /** Human-readable justification, stored for auditability. */
  evidence: string[];
  score: number;
}

/** Words too generic to carry matching signal on their own. */
const STOPWORDS = new Set([
  "the", "and", "for", "with", "set", "sets", "toy", "toys", "kids", "kid",
  "baby", "babies", "infant", "infants", "toddler", "toddlers", "child",
  "children", "piece", "pieces", "pc", "pcs", "count", "pack", "play",
  "playset", "game", "games", "first", "my", "of", "in", "a", "an", "to",
  "classic", "deluxe", "jumbo", "mini", "large", "small", "wooden", "wood",
  "plastic", "learning", "educational", "activity", "new", "original",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

/** Normalised brand comparison ("B. toys (Battat)" -> "b toys battat"). */
function normalizeBrand(brand: string): string {
  return brand.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function brandAppearsIn(brand: string, haystack: string): boolean {
  const nb = normalizeBrand(brand);
  if (!nb || nb.length < 3) return false;
  const nh = normalizeBrand(haystack);
  // Word-boundary match on the full brand phrase.
  //
  // Plain substring matching produced systematic false positives: the brand
  // "Hape" occurs inside the very common recall word "shape", so every Hape
  // product in the catalog was flagged against any recall mentioning a "shape
  // sorter". Requiring boundaries also keeps "Toys" inside "Green Toys" from
  // matching an unrelated recall that merely says "toys".
  const escaped = nb.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\s)${escaped}(\\s|$)`).test(nh);
}

/**
 * Compare a single product against a single recall.
 *
 * Scoring is intentionally simple and explainable rather than statistical:
 *   +3  model number appears verbatim in the recall
 *   +2  brand phrase appears in the recall
 *   +1  per distinctive shared product-name token (max 3)
 *
 * confirmed     : model hit, or brand hit plus >=2 distinctive shared tokens
 * needs-review  : brand hit, or >=2 distinctive shared tokens
 * no-match      : anything less
 */
export function matchProductToRecall(
  product: CatalogProduct,
  recall: NormalizedRecall
): MatchResult {
  const evidence: string[] = [];
  let score = 0;

  const recallHaystack = [
    recall.title,
    recall.description ?? "",
    ...recall.productNames,
    ...recall.manufacturers,
    ...recall.models,
  ].join(" ");

  // 1. Model number (strongest available signal).
  let modelHit = false;
  for (const model of recall.models) {
    const m = model.trim();
    // Require something that actually looks like an identifier.
    if (m.length < 4 || !/\d/.test(m)) continue;
    const pattern = new RegExp(
      `\\b${m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "i"
    );
    if (pattern.test(product.productName)) {
      modelHit = true;
      score += 3;
      evidence.push(`Recall model "${m}" appears in the product name.`);
      break;
    }
  }

  // 2. Brand.
  const brandHit = Boolean(product.brand) && brandAppearsIn(product.brand!, recallHaystack);
  if (brandHit) {
    score += 2;
    evidence.push(`Recall names the brand "${product.brand}".`);
  }

  // 3. Distinctive shared tokens.
  const productTokens = new Set(tokenize(product.productName));
  const brandTokens = new Set(product.brand ? tokenize(product.brand) : []);
  const recallTokens = new Set(tokenize(recallHaystack));
  const shared = [...productTokens].filter(
    (t) => recallTokens.has(t) && !brandTokens.has(t)
  );
  const sharedCounted = shared.slice(0, 3);
  if (sharedCounted.length) {
    score += sharedCounted.length;
    evidence.push(
      `Shared distinctive term(s): ${sharedCounted.map((t) => `"${t}"`).join(", ")}.`
    );
  }

  let confidence: MatchConfidence;
  if (modelHit || (brandHit && shared.length >= 2)) {
    confidence = "confirmed";
  } else if (brandHit || shared.length >= 2) {
    confidence = "needs-review";
    evidence.push(
      "Signal is suggestive but not conclusive — queued for human review rather than published."
    );
  } else {
    confidence = "no-match";
  }

  return {
    productId: product._id,
    productName: product.productName,
    recallNumber: recall.recallNumber,
    confidence,
    evidence,
    score,
  };
}

export interface MatchRunResult {
  confirmed: MatchResult[];
  needsReview: MatchResult[];
}

/** Compare every recall against every catalog product. */
export function matchRecalls(
  products: CatalogProduct[],
  recalls: NormalizedRecall[]
): MatchRunResult {
  const confirmed: MatchResult[] = [];
  const needsReview: MatchResult[] = [];

  for (const recall of recalls) {
    for (const product of products) {
      const result = matchProductToRecall(product, recall);
      if (result.confidence === "confirmed") confirmed.push(result);
      else if (result.confidence === "needs-review") needsReview.push(result);
    }
  }

  return { confirmed, needsReview };
}
