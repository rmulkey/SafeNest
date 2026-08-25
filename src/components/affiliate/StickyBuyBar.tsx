"use client";

import { useEffect, useState } from "react";
import { BuyButton } from "./BuyButton";

interface StickyBuyBarProps {
  /**
   * Evidence confidence for this product. When it is "insufficient" the bar
   * shows no number at all, matching the review body — a persistent CTA must not
   * become a back door to a score the page deliberately withheld.
   */
  confidence?: "high" | "medium" | "low" | "insufficient";
  productName: string;
  url: string;
  tag: string;
  safetyScore: number;
}

/**
 * A mobile-first sticky buy bar that slides up after the user scrolls past
 * the initial buy CTA, keeping a conversion path visible at all times.
 *
 * Hidden on desktop (lg+) where the inline CTAs are always reachable.
 */
export function StickyBuyBar({ productName, url, tag, safetyScore, confidence }: StickyBuyBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      // Show after scrolling 600px (past the hero CTA), hide near the very top
      setVisible(window.scrollY > 600);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed left-0 right-0 z-40 lg:hidden border-t border-border bg-background/95 backdrop-blur transition-transform duration-300 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      /*
       * Sits above the cookie consent banner rather than under it. Both are
       * bottom-anchored and full width; the banner is z-50, so at bottom: 0 it
       * hid this CTA entirely until consent was answered. CookieConsentBanner
       * publishes its measured height as --consent-banner-height and removes the
       * property once dismissed, at which point this falls back to 0px.
       */
      style={{ bottom: "var(--consent-banner-height, 0px)" }}
      role="region"
      aria-label="Buy this product"
      /*
       * Hidden from AT and taken out of the tab order while translated
       * off-screen. `translate-y-full` only moves the bar visually — the Amazon
       * link stayed focusable, so keyboard users could tab into an invisible
       * CTA. `inert` also blocks clicks on the off-screen strip.
       */
      inert={!visible}
      aria-hidden={!visible}
    >
      <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{productName}</p>
          <p className="text-xs text-secondary-600 font-medium">
            {confidence === "insufficient"
              ? "Evidence insufficient for a score"
              : `Editorial score ${safetyScore}/100`}
          </p>
        </div>
        <BuyButton url={url} tag={tag} size="md" className="shrink-0" />
      </div>
    </div>
  );
}
