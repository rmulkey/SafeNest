"use client";

import React from "react";
import { trackAffiliateClick } from "@/lib/analytics/events";

/**
 * The one buy-CTA label.
 *
 * Six variants had accumulated across ten call sites — "Check current price at
 * Amazon", "Check Price", and an unused "Buy on Amazon" default that only the
 * component itself knew about. Making the canonical wording the DEFAULT rather
 * than something each call site passes means they cannot drift apart again.
 *
 * "Check price" rather than "Buy": 94 of 138 affiliate links currently resolve to
 * an Amazon search page rather than a product page, so promising a purchase would
 * overstate what the click delivers. It also sets the right expectation that no
 * price is shown here — the site has no Creators API access and does not display
 * prices it cannot verify.
 */
export const BUY_CTA_LABEL = "Check price at Amazon";

interface BuyButtonProps {
  url: string;
  tag: string;
  /** Visual size variant */
  size?: "sm" | "md" | "lg";
  /** Optional override. Prefer the default so the label stays consistent. */
  label?: string;
  className?: string;
  /** Product identifier for conversion tracking (e.g. review slug or _id). */
  productId?: string;
  /** Affiliate partner for conversion tracking. Defaults to "amazon". */
  partnerId?: string;
}

/**
 * Builds the final Amazon affiliate URL with the partner tag appended.
 */
export function buildAmazonUrl(url: string, tag: string): string {
  return url + (url.includes("?") ? "&" : "?") + "tag=" + tag;
}

/** Fragment id of the shared Amazon glyph, defined once by `AmazonGlyphSprite`. */
export const AMAZON_GLYPH_ID = "amazon-glyph";

/**
 * Defines the Amazon glyph once per document so buttons can reference it.
 *
 * WHY THIS EXISTS
 * The glyph is 1,220 bytes of path data and was inlined into every BuyButton.
 * On a listing page that is once per product card, and it dominated page weight:
 * /guides/best-sensory-toys-babies was 308 KB of HTML for 5.5 KB of text, of
 * which 40 KB was 33 identical copies of this glyph — 12.3% of the page, pure
 * duplication. The heavier listings are worse: /best-toys/1-2-years is 1,260 KB
 * with 87 cards, /reviews is 1,080 KB with 138.
 *
 * That is the real content behind Semrush's "low text to HTML ratio" on 228
 * pages. It is not thin text; it is repeated markup.
 *
 * Rendered once in the root layout. A `<use>` reference costs about 70 bytes, so
 * this pays for itself on any page with two or more buttons and saves roughly
 * 1.2 KB per button beyond the first.
 *
 * `focusable="false"` is set because IE/older-Edge put SVG in the tab order;
 * `aria-hidden` alone does not remove it. The button carries its own accessible
 * label, so the glyph must never be announced or focusable.
 */
export function AmazonGlyphSprite() {
  return (
    <svg
      width="0"
      height="0"
      aria-hidden="true"
      focusable="false"
      style={{ position: "absolute" }}
    >
      <symbol id={AMAZON_GLYPH_ID} viewBox="0 0 24 24" fill="currentColor">
        <path d="M13.958 10.09c0 1.232.029 2.256-.591 3.351-.502.891-1.301 1.438-2.186 1.438-1.214 0-1.922-.924-1.922-2.292 0-2.692 2.415-3.182 4.7-3.182v.685zm3.186 7.705a.66.66 0 01-.753.077c-1.06-.878-1.25-1.284-1.828-2.12-1.747 1.784-2.983 2.318-5.246 2.318-2.676 0-4.76-1.652-4.76-4.955 0-2.58 1.397-4.334 3.387-5.191 1.724-.756 4.132-.891 5.971-1.099v-.412c0-.756.058-1.648-.385-2.301-.385-.582-1.124-.822-1.78-.822-1.21 0-2.286.62-2.55 1.905-.054.285-.263.566-.548.58l-3.075-.33c-.259-.058-.546-.266-.472-.66C5.627 1.3 8.806 0 11.639 0c1.455 0 3.356.385 4.502 1.488 1.455 1.36 1.318 3.17 1.318 5.142v4.654c0 1.398.58 2.012 1.124 2.768.192.266.234.584-.012.78-.614.514-1.706 1.47-2.307 2.006l-.012-.043z" />
        <path d="M21.83 18.504c-2.078 1.533-5.091 2.35-7.685 2.35-3.637 0-6.912-1.345-9.388-3.583-.194-.176-.021-.416.213-.28 2.674 1.556 5.98 2.492 9.394 2.492 2.303 0 4.836-.478 7.166-1.467.352-.15.646.231.3.488z" />
        <path d="M22.678 17.377c-.265-.34-1.752-.16-2.42-.081-.203.024-.234-.152-.051-.281 1.185-.832 3.13-.592 3.357-.313.228.283-.06 2.238-1.172 3.17-.171.144-.334.067-.258-.123.25-.627.812-2.03.544-2.372z" />
      </symbol>
    </svg>
  );
}

function AmazonGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <use href={`#${AMAZON_GLYPH_ID}`} />
    </svg>
  );
}

const sizeClasses: Record<NonNullable<BuyButtonProps["size"]>, string> = {
  // min-h values keep the smallest variant at a 44px tap target. `sm` is used on
  // every listing card, so it is the size that actually matters on mobile; its
  // padding alone produced a ~36px control.
  sm: "min-h-11 px-4 py-2 text-sm gap-1.5",
  md: "min-h-11 px-5 py-2.5 text-sm gap-2",
  lg: "min-h-12 px-6 py-3 text-base gap-2",
};

const glyphSize: Record<NonNullable<BuyButtonProps["size"]>, string> = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
};

/**
 * A consistent, FTC-compliant Amazon buy button used across review pages.
 *
 * Colour note: the label is Amazon's ink (#0F1111) on Amazon's orange
 * (#FF9900), not white. White on that orange measures 2.14:1, which fails WCAG
 * AA for text (4.5:1) and also fails the 3:1 floor for large text and non-text
 * contrast — on the site's primary conversion control. Dark on orange measures
 * 8.85:1, and 7.33:1 against the hover shade. It is also what Amazon itself
 * does: their own buy buttons pair dark text with orange/yellow and never use
 * white, so the accessible pairing is the brand-faithful one too. The orange is
 * kept because the recognition is the conversion asset; only the label changed.
 */
export function BuyButton({
  url,
  tag,
  size = "md",
  label = BUY_CTA_LABEL,
  className = "",
  productId,
  partnerId = "amazon",
}: BuyButtonProps) {
  function handleClick() {
    // Fire the affiliate-click conversion event. No-ops gracefully when
    // analytics scripts aren't loaded (e.g. consent not granted).
    trackAffiliateClick({
      productId: productId ?? url,
      sourcePageUrl: typeof window !== "undefined" ? window.location.pathname : "",
      partnerId,
    });
  }

  return (
    <a
      href={buildAmazonUrl(url, tag)}
      target="_blank"
      rel="nofollow sponsored noopener"
      onClick={handleClick}
      className={`inline-flex items-center justify-center rounded-lg bg-[#FF9900] font-semibold text-[#0F1111] hover:bg-[#E88B00] transition-colors shadow-sm ${sizeClasses[size]} ${className}`}
    >
      <AmazonGlyph className={glyphSize[size]} />
      {label}
    </a>
  );
}
