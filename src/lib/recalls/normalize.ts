/**
 * Normalisation of raw CPSC recall records into the shape this site stores.
 *
 * Pure functions only — no network, no Sanity — so the behaviour is testable
 * against fixtures.
 *
 * INTEGRITY RULES ENCODED HERE
 *  - Every stored field must trace back to the CPSC payload. Nothing is inferred
 *    or invented; missing values stay missing rather than being filled in.
 *  - A recall is only stored if it has a stable identifier and an official URL,
 *    because the official notice is what consumers must ultimately rely on.
 *  - The deduplication key is the CPSC recall number (falling back to RecallID),
 *    which makes ingestion idempotent across repeated syncs.
 */
import type { CpscRawRecall } from "./cpsc-client";
import { CPSC_ATTRIBUTION } from "./cpsc-client";

export interface NormalizedRecall {
  /** Stable dedupe key, e.g. "25-123". */
  recallNumber: string;
  /** CPSC's numeric id when present, for cross-referencing. */
  recallId: string | null;
  title: string;
  /** ISO date (YYYY-MM-DD). */
  recallDate: string;
  lastPublishDate: string | null;
  /** Direct link to the official CPSC notice. */
  officialNoticeUrl: string;
  hazards: string[];
  remedies: string[];
  productNames: string[];
  models: string[];
  manufacturers: string[];
  retailers: string[];
  description: string | null;
  imageUrl: string | null;
  /** Always CPSC for this pipeline; stored so provenance is explicit on-page. */
  sourceAttribution: string;
}

function cleanText(v: unknown): string | null {
  if (typeof v !== "string") return null;
  // CPSC descriptions contain HTML entities and tags in some records.
  const stripped = v
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length ? stripped : null;
}

function names(list: Array<{ Name?: string }> | undefined): string[] {
  if (!Array.isArray(list)) return [];
  return Array.from(
    new Set(
      list
        .map((x) => cleanText(x?.Name))
        .filter((x): x is string => Boolean(x))
    )
  );
}

function isoDate(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const t = Date.parse(v);
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString().slice(0, 10);
}

/**
 * Convert one raw record. Returns null when the record lacks the minimum fields
 * required to represent it honestly (identifier, date, official URL).
 */
export function normalizeRecall(raw: CpscRawRecall): NormalizedRecall | null {
  const recallNumber =
    cleanText(raw.RecallNumber) ??
    (raw.RecallID != null ? String(raw.RecallID) : null);
  const recallDate = isoDate(raw.RecallDate);
  const url = cleanText(raw.URL);
  const title = cleanText(raw.Title);

  if (!recallNumber || !recallDate || !url || !title) return null;

  const products = Array.isArray(raw.Products) ? raw.Products : [];

  return {
    recallNumber,
    recallId: raw.RecallID != null ? String(raw.RecallID) : null,
    title,
    recallDate,
    lastPublishDate: isoDate(raw.LastPublishDate),
    officialNoticeUrl: url,
    hazards: names(raw.Hazards),
    remedies: [
      ...names(raw.Remedies),
      ...(Array.isArray(raw.RemedyOptions)
        ? raw.RemedyOptions.map((o) => cleanText(o?.Option)).filter(
            (x): x is string => Boolean(x)
          )
        : []),
    ].filter((v, i, a) => a.indexOf(v) === i),
    productNames: Array.from(
      new Set(
        products
          .map((p) => cleanText(p?.Name) ?? cleanText(p?.Description))
          .filter((x): x is string => Boolean(x))
      )
    ),
    models: Array.from(
      new Set(
        products
          .map((p) => cleanText(p?.Model))
          .filter((x): x is string => Boolean(x))
      )
    ),
    manufacturers: names(raw.Manufacturers),
    retailers: names(raw.Retailers),
    description: cleanText(raw.Description),
    imageUrl:
      (Array.isArray(raw.Images) &&
        cleanText(raw.Images.find((i) => cleanText(i?.URL))?.URL)) ||
      null,
    sourceAttribution: CPSC_ATTRIBUTION,
  };
}

/**
 * Normalise a batch, dropping unusable records and collapsing duplicates.
 *
 * CPSC can return the same recall in overlapping date windows, and occasionally
 * repeats a recall number. The later record wins only if it has a newer
 * LastPublishDate, so re-syncing never regresses data.
 */
export function normalizeBatch(raws: CpscRawRecall[]): {
  recalls: NormalizedRecall[];
  skipped: number;
  duplicatesCollapsed: number;
} {
  const byKey = new Map<string, NormalizedRecall>();
  let skipped = 0;
  let duplicatesCollapsed = 0;

  for (const raw of raws) {
    const n = normalizeRecall(raw);
    if (!n) {
      skipped++;
      continue;
    }
    const existing = byKey.get(n.recallNumber);
    if (!existing) {
      byKey.set(n.recallNumber, n);
      continue;
    }
    duplicatesCollapsed++;
    const a = existing.lastPublishDate ?? existing.recallDate;
    const b = n.lastPublishDate ?? n.recallDate;
    if (b > a) byKey.set(n.recallNumber, n);
  }

  const recalls = Array.from(byKey.values()).sort((x, y) =>
    y.recallDate.localeCompare(x.recallDate)
  );
  return { recalls, skipped, duplicatesCollapsed };
}

/** Deterministic Sanity document id for a recall. */
export function recallDocId(recallNumber: string): string {
  return `recall-cpsc-${recallNumber.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase()}`;
}

/**
 * Heuristic: is this recall plausibly a children's toy or juvenile product?
 * Used only to prioritise what we surface, never to assert a match with a
 * reviewed product.
 */
const CHILD_KEYWORDS = [
  "toy", "toys", "infant", "baby", "babies", "toddler", "child", "children",
  "kids", "nursery", "crib", "stroller", "teether", "teething", "pacifier",
  "rattle", "playpen", "high chair", "bassinet", "booster", "doll", "puzzle",
  "block", "blocks", "magnet", "magnetic", "ride-on", "bib", "sippy",
];

export function isLikelyChildProduct(r: NormalizedRecall): boolean {
  const haystack = [
    r.title,
    r.description ?? "",
    ...r.productNames,
    ...r.hazards,
  ]
    .join(" ")
    .toLowerCase();
  return CHILD_KEYWORDS.some((k) => {
    // Word-boundary match so "blocking" doesn't match "block".
    return new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(
      haystack
    );
  });
}
