import { BuyButton } from "@/components/affiliate/BuyButton";
import { formatAgeRange } from "@/lib/content/format-age";
import type { EvidenceConfidence as Confidence } from "@/lib/scoring/evidence-status";
import { EVIDENCE_CONFIDENCE_LABELS } from "@/lib/scoring/evidence-status";

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

export interface PurchaseMerchant {
  /** Display name, e.g. "Amazon". */
  name: string;
  url: string;
  /**
   * Affiliate tag, appended by BuyButton. Required, matching the shape of
   * `toyReview.affiliateLinks` — a link without a tag would drop attribution.
   */
  tag: string;
  /** Only set when a real price check was recorded. */
  priceCheckedAt?: string | null;
}

export interface PurchaseDecisionPanelProps {
  productName: string;
  /** Review slug or document id, used for affiliate click attribution. */
  productId?: string;
  merchants: PurchaseMerchant[];
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
          {EVIDENCE_CONFIDENCE_LABELS[confidence]}
          {typeof safetyScore === "number" && (
            <>
              {" "}
              alongside an editorial assessment of {safetyScore}/100.
              {(confidence === "low" || confidence === "medium") &&
                " A high editorial score with Low or Medium evidence confidence should be interpreted cautiously."}
            </>
          )}
        </Row>
        <Row label="Where to buy">
          {merchants.length === 1
            ? `${primary.name} is the only merchant we link for this product.`
            : `${merchants.length} merchants linked: ${merchants
                .map((m) => m.name)
                .join(", ")}.`}
          {/* No price shown unless a real check timestamp exists. */}
          {primary?.priceCheckedAt ? (
            <> Price last checked {primary.priceCheckedAt.slice(0, 10)}.</>
          ) : (
            <> Check the merchant for current price and availability.</>
          )}
        </Row>
      </dl>

      {/* CTA with the affiliate disclosure immediately adjacent. */}
      {primary && (
        <div className="mt-5 border-t border-border pt-4">
          <BuyButton
            url={primary.url}
            tag={primary.tag}
            productId={productId}
            label={`Check current price at ${primary.name}`}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Affiliate link. SafeNest may earn a commission if you buy through it,
            at no extra cost to you. Commissions never influence our editorial
            assessment or rankings.
          </p>
        </div>
      )}
    </section>
  );
}
