import { BuyButton } from "@/components/affiliate/BuyButton";
import { formatAgeRange } from "@/lib/content/format-age";
import type { EvidenceConfidence as Confidence } from "@/lib/scoring/evidence-status";
import { EVIDENCE_CONFIDENCE_LABELS } from "@/lib/scoring/evidence-status";
import { AffiliateDisclosure } from "@/components/affiliate/AffiliateDisclosure";

/**
 * Concise decision-support panel placed near the end of a review.
 *
 * DATA INTEGRITY
 * Every row is derived from data that already exists on the review. Nothing is
 * invented: no prices, discounts, stock status, review counts, or merchant
 * comparisons. A row is omitted entirely rather than guessed at.
 *
 *  - Best for / Not ideal for: taken from the first pro and first con, which are
 *    editorial fields the operator already authored. If absent, the row is
 *    dropped.
 *  - Age guidance: attributed to the manufacturer, never presented as a SafeNest
 *    safety determination.
 *  - Main limitation: prefers an explicit `mainLimitation` field, otherwise falls
 *    back to the strongest existing con. Never fabricated.
 *  - Price: shown only when a real `priceCheckedAt` timestamp exists. There is no
 *    "latest price" language, because we do not track prices.
 *  - Merchants: the data model supports an array. With a single merchant we show
 *    one option and no comparison UI, since a one-row "comparison" is misleading.
 */

export interface MerchantOption {
  /** Display name, e.g. "Amazon". */
  merchant: string;
  url: string;
  /** Whether the link carries affiliate attribution. */
  affiliate: boolean;
  /**
   * Affiliate tag appended by BuyButton. Required when `affiliate` is true —
   * a link without a tag silently drops attribution.
   */
  tag: string;
  /**
   * Set ONLY when a real price check was recorded. There is no default and no
   * inferred value: an absent timestamp renders no date at all.
   */
  priceCheckedAt?: string | null;
}

export interface PurchaseDecisionPanelProps {
  productName: string;
  /** Review slug or document id, used for affiliate click attribution. */
  productId?: string;
  merchants: MerchantOption[];
  ageMinMonths?: number;
  ageMaxMonths?: number;
  confidence: Confidence;
  bestFor?: string | null;
  notIdealFor?: string | null;
  mainLimitation?: string | null;
  safetyScore?: number;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-[10rem_1fr] sm:gap-3">
      <dt className="text-sm font-medium text-foreground">{label}</dt>
      <dd className="text-sm text-muted-foreground">{children}</dd>
    </div>
  );
}

export function PurchaseDecisionPanel({
  productName,
  productId,
  merchants,
  ageMinMonths,
  ageMaxMonths,
  confidence,
  bestFor,
  notIdealFor,
  mainLimitation,
  safetyScore,
}: PurchaseDecisionPanelProps) {
  const hasAge =
    typeof ageMinMonths === "number" && typeof ageMaxMonths === "number";
  const primary = merchants[0];

  return (
    <section
      aria-labelledby="purchase-decision-heading"
      className="mt-10 rounded-lg border border-border bg-card p-5"
    >
      <h2
        id="purchase-decision-heading"
        className="text-lg font-semibold text-foreground"
      >
        Is the {productName} right for your child?
      </h2>

      <dl className="mt-4 space-y-3">
        {bestFor && <Row label="Best for">{bestFor}</Row>}
        {notIdealFor && <Row label="Not ideal for">{notIdealFor}</Row>}
        {hasAge && (
          <Row label="Manufacturer age guidance">
            {formatAgeRange(ageMinMonths!, ageMaxMonths!)}. Age suitability is the
            manufacturer&apos;s labelling, not a SafeNest determination.
          </Row>
        )}
        {mainLimitation && (
          <Row label="Main limitation">{mainLimitation}</Row>
        )}
        <Row label="Evidence confidence">
          {/* The row is already labelled "Evidence confidence", so the value is
              just the level — "Medium", not "Medium evidence confidence". */}
          {EVIDENCE_CONFIDENCE_LABELS[confidence].replace(
            / evidence confidence$/i,
            ""
          )}
          {/* Insufficient evidence suppresses the number here too, so the panel
              cannot become a back door to a score the page withheld. */}
          {confidence !== "insufficient" && typeof safetyScore === "number" && (
            <>
              {" "}
              alongside an editorial assessment of {safetyScore}/100.
              {(confidence === "low" || confidence === "medium") &&
                " A high editorial score with Low or Medium evidence confidence should be interpreted cautiously."}
            </>
          )}
        </Row>
        {/* A single merchant is shown as one truthful option. No comparison
            table is rendered for one row, because a one-row "comparison"
            implies alternatives we do not have. */}
        {primary && (
          <Row label="Merchant options">
            {merchants.length === 1
              ? `${primary.merchant} is the only merchant SafeNest links for this product.`
              : `${merchants.length} merchants linked: ${merchants
                  .map((m) => m.merchant)
                  .join(", ")}.`}
            {/* A price-check date appears only when the data actually carries
                one. We do not track prices, so there is nothing to imply. */}
            {primary.priceCheckedAt ? (
              <> Price last checked {primary.priceCheckedAt.slice(0, 10)}.</>
            ) : (
              <> Check the merchant for current price and availability.</>
            )}
          </Row>
        )}
      </dl>

      {/* CTA with the affiliate disclosure immediately adjacent. */}
      {primary && (
        <div className="mt-5 border-t border-border pt-4">
          <BuyButton
            url={primary.url}
            tag={primary.tag}
            productId={productId}
            label={`Check current price at ${primary.merchant}`}
          />
          {/* Disclosure sits immediately below the CTA, not in a distant
              footnote. No urgency, scarcity, discount or availability claim. */}
          {primary.affiliate && (
            <AffiliateDisclosure className="mt-2" />
          )}
        </div>
      )}
    </section>
  );
}
