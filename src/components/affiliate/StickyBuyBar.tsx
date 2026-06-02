"use client";

import { useEffect, useState } from "react";
import { BuyButton } from "./BuyButton";

interface StickyBuyBarProps {
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
export function StickyBuyBar({ productName, url, tag, safetyScore }: StickyBuyBarProps) {
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
      className={`fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-border bg-background/95 backdrop-blur transition-transform duration-300 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      role="region"
      aria-label="Buy this product"
    >
      <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{productName}</p>
          <p className="text-xs text-secondary-600 font-medium">
            Safety Score {safetyScore}/100
          </p>
        </div>
        <BuyButton url={url} tag={tag} size="md" label="Buy" className="shrink-0" />
      </div>
    </div>
  );
}
