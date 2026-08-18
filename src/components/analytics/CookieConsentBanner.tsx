"use client";

import { useState, useCallback, useEffect, useRef } from "react";

const CONSENT_COOKIE_KEY = "safenest_cookie_consent";
const CONSENT_EXPIRY_DAYS = 365;

export type ConsentState = "granted" | "declined" | null;

function getConsentState(): ConsentState {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(CONSENT_COOKIE_KEY);
  if (value === "granted" || value === "declined") return value;
  return null;
}

function setConsentState(state: "granted" | "declined") {
  const expiryMs = CONSENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  const record = JSON.stringify({ state, expires: Date.now() + expiryMs });
  localStorage.setItem(CONSENT_COOKIE_KEY, state);
  localStorage.setItem(`${CONSENT_COOKIE_KEY}_meta`, record);
}

/**
 * Check if consent has expired (older than 365 days).
 * If expired, clear and return null.
 */
function getValidConsentState(): ConsentState {
  if (typeof window === "undefined") return null;
  const state = getConsentState();
  if (!state) return null;

  const meta = localStorage.getItem(`${CONSENT_COOKIE_KEY}_meta`);
  if (meta) {
    try {
      const { expires } = JSON.parse(meta);
      if (Date.now() > expires) {
        localStorage.removeItem(CONSENT_COOKIE_KEY);
        localStorage.removeItem(`${CONSENT_COOKIE_KEY}_meta`);
        return null;
      }
    } catch {
      // If meta is corrupt, treat consent as valid
    }
  }
  return state;
}

export function useConsentState() {
  const [consent, setConsent] = useState<ConsentState>(() =>
    typeof window !== "undefined" ? getValidConsentState() : null
  );

  const grant = useCallback(() => {
    setConsentState("granted");
    setConsent("granted");
  }, []);

  const decline = useCallback(() => {
    setConsentState("declined");
    setConsent("declined");
  }, []);

  return { consent, grant, decline };
}

export function CookieConsentBanner() {
  const { consent, grant, decline } = useConsentState();

  const [mounted] = useState(() => typeof window !== "undefined");
  const bannerRef = useRef<HTMLDivElement>(null);

  /*
   * Publish the banner's height as a custom property on <html>.
   *
   * This banner and StickyBuyBar both occupy `fixed bottom-0 left-0 right-0`.
   * The banner is z-50 and the bar z-40, so on a first mobile visit the banner
   * completely covered the primary affiliate CTA — a visitor who had not yet
   * answered the consent prompt could not see or tap it. Raising the bar instead
   * would bury the consent prompt, which is worse. Publishing the height lets
   * the bar sit directly on top of the banner so both stay usable, and the
   * height is measured rather than hard-coded because the copy wraps to a
   * different number of lines at every width.
   */
  useEffect(() => {
    const el = bannerRef.current;
    const root = document.documentElement;
    if (!el) {
      root.style.removeProperty("--consent-banner-height");
      return;
    }

    const publish = () =>
      root.style.setProperty(
        "--consent-banner-height",
        `${el.getBoundingClientRect().height}px`
      );

    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);

    return () => {
      observer.disconnect();
      root.style.removeProperty("--consent-banner-height");
    };
  }, [mounted, consent]);

  // Don't render on server or if consent already given
  if (!mounted || consent !== null) return null;

  return (
    <div
      ref={bannerRef}
      role="dialog"
      aria-label="Cookie consent"
      aria-describedby="cookie-consent-description"
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg p-4 md:p-6"
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p id="cookie-consent-description" className="text-sm text-gray-700 flex-1">
          We use cookies and analytics tools (Google Analytics, PostHog, Meta Pixel) to
          understand how visitors use our site and improve our content. You can accept or
          decline analytics cookies. Declining means we only track anonymous page view
          counts with no personal data collected.
        </p>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={decline}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            aria-label="Decline analytics cookies"
          >
            Decline
          </button>
          <button
            onClick={grant}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            aria-label="Accept analytics cookies"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
