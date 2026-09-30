"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

const CONSENT_COOKIE_KEY = "safenest_cookie_consent";
const CONSENT_META_KEY = `${CONSENT_COOKIE_KEY}_meta`;
const CONSENT_EXPIRY_DAYS = 365;

/** A resolved choice. `null` means the visitor has not answered the prompt yet. */
export type ConsentState = "granted" | "declined" | null;

/* -------------------------------------------------------------------------- */
/* Storage access                                                             */
/* -------------------------------------------------------------------------- */

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    // localStorage throws outright when storage is blocked (Safari private
    // browsing, hardened profiles). Treat that as "no stored choice" instead of
    // letting it throw out of a component that renders on every page.
    return null;
  }
}

function hasExpired(): boolean {
  const meta = readRaw(CONSENT_META_KEY);
  if (!meta) return false;
  try {
    const { expires } = JSON.parse(meta) as { expires?: number };
    return typeof expires === "number" && Date.now() > expires;
  } catch {
    // Corrupt meta record: keep the stored choice rather than re-prompting.
    return false;
  }
}

function readStoredConsent(): ConsentState {
  const value = readRaw(CONSENT_COOKIE_KEY);
  if (value !== "granted" && value !== "declined") return null;
  return hasExpired() ? null : value;
}

/**
 * Drop a choice that has aged past its 365 days so the record does not sit in
 * storage indefinitely. Called once per page load from `subscribe`, never during
 * render — reading storage is safe in render, writing to it is not.
 */
function pruneExpiredConsent() {
  if (!hasExpired()) return;
  try {
    localStorage.removeItem(CONSENT_COOKIE_KEY);
    localStorage.removeItem(CONSENT_META_KEY);
  } catch {
    // Nothing to do: readStoredConsent already reports expired records as null.
  }
}

/* -------------------------------------------------------------------------- */
/* Consent store                                                              */
/* -------------------------------------------------------------------------- */

/*
 * Consent lives in one module-level store that every `useConsentState` caller
 * subscribes to, rather than in per-component `useState`.
 *
 * Two components call the hook: AnalyticsProvider and CookieConsentBanner. With
 * local state they each held a private copy, so clicking Accept updated only the
 * banner's copy — the provider went on believing consent was still unanswered
 * and did not load GA4, PostHog or the Meta Pixel until the visitor happened to
 * navigate or reload. A shared store means one write notifies both.
 */

const listeners = new Set<() => void>();

/*
 * Cached snapshot. React calls getSnapshot on every render and compares results
 * with Object.is, so caching turns one storage read per render into one per
 * actual change, and guarantees a stable value within a render pass.
 * `null` here means "not read yet", which is why the value is boxed — the
 * consent value itself can legitimately be `null`.
 */
let cache: { value: ConsentState } | null = null;

function getConsentSnapshot(): ConsentState {
  if (cache === null) cache = { value: readStoredConsent() };
  return cache.value;
}

/*
 * HYDRATION
 * The server cannot read localStorage, so it does not know the answer, and
 * `undefined` says exactly that. `null` cannot carry the meaning because it
 * already means "prompt unanswered" — the one state that renders the banner.
 *
 * This is what fixes React error #418, which this component was triggering on
 * every page of the site. The previous version seeded state with a value that
 * was knowingly wrong on the client (`useState(false)`, corrected to `true` in
 * an effect) so the server sent no banner while the client's first render
 * produced one; React reported the mismatch, threw away the server tree and
 * rebuilt it client-side, which is the work SSR exists to avoid. The effect that
 * patched it up afterwards is also what `react-hooks/set-state-in-effect`
 * flagged.
 *
 * React uses getServerSnapshot for the server render and for hydration, then
 * checks getSnapshot once hydration has committed and re-renders only if the two
 * differ. The markup matches, no mismatch is reported, and the banner still
 * appears on the first frame after hydration.
 */
function getServerConsentSnapshot(): undefined {
  return undefined;
}

function emit() {
  for (const listener of listeners) listener();
}

function handleStorageEvent(event: StorageEvent) {
  // `key` is null when a tab clears storage wholesale.
  if (
    event.key !== null &&
    event.key !== CONSENT_COOKIE_KEY &&
    event.key !== CONSENT_META_KEY
  ) {
    return;
  }
  cache = null;
  emit();
}

function subscribeToConsent(onStoreChange: () => void): () => void {
  if (listeners.size === 0) {
    pruneExpiredConsent();
    // Answering the prompt in one tab dismisses it in the others.
    window.addEventListener("storage", handleStorageEvent);
  }
  listeners.add(onStoreChange);

  return () => {
    listeners.delete(onStoreChange);
    if (listeners.size === 0) {
      window.removeEventListener("storage", handleStorageEvent);
    }
  };
}

function persistConsent(state: "granted" | "declined") {
  const expires = Date.now() + CONSENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  try {
    localStorage.setItem(CONSENT_COOKIE_KEY, state);
    localStorage.setItem(CONSENT_META_KEY, JSON.stringify({ state, expires }));
  } catch {
    // Storage unavailable: honour the choice for this page view at least.
  }
  cache = { value: state };
  emit();
}

// Module-level so the identities stay stable without useCallback.
function grantConsent() {
  persistConsent("granted");
}

function declineConsent() {
  persistConsent("declined");
}

/**
 * Current consent choice, plus the two writers.
 *
 * `consent` is `undefined` until hydration has committed, then `null`,
 * `"granted"` or `"declined"`. Callers that act on a choice should test for the
 * specific value they care about rather than truthiness.
 */
export function useConsentState() {
  const consent = useSyncExternalStore<ConsentState | undefined>(
    subscribeToConsent,
    getConsentSnapshot,
    getServerConsentSnapshot
  );

  return { consent, grant: grantConsent, decline: declineConsent };
}

/* -------------------------------------------------------------------------- */
/* Banner                                                                     */
/* -------------------------------------------------------------------------- */

export function CookieConsentBanner() {
  const { consent, grant, decline } = useConsentState();
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
  }, [consent]);

  // `undefined` is pre-hydration, so the server and the client's first render
  // agree on rendering nothing; "granted"/"declined" means the choice is made.
  if (consent !== null) return null;

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
