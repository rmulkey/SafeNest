"use client";

import { useEffect, useRef } from "react";
import { useConsentState, CookieConsentBanner } from "./CookieConsentBanner";

const GA4_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

/**
 * Tracks an anonymous page view count without any personal data.
 * Used when consent is declined or not yet given.
 */
function trackAnonymousPageView() {
  if (typeof window === "undefined") return;
  const key = "safenest_anon_pageviews";
  const count = parseInt(localStorage.getItem(key) || "0", 10);
  localStorage.setItem(key, String(count + 1));
}

/**
 * Dynamically loads the GA4 script after consent is granted.
 */
function loadGA4(measurementId: string) {
  if (document.getElementById("ga4-script")) return;

  const script = document.createElement("script");
  script.id = "ga4-script";
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);

  const inlineScript = document.createElement("script");
  inlineScript.id = "ga4-config";
  inlineScript.textContent = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${measurementId}');
  `;
  document.head.appendChild(inlineScript);
}

/**
 * Dynamically loads PostHog after consent is granted.
 */
function loadPostHog(apiKey: string) {
  if (document.getElementById("posthog-script")) return;

  const script = document.createElement("script");
  script.id = "posthog-script";
  script.async = true;
  script.defer = true;
  script.textContent = `
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.defer=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    posthog.init('${apiKey}', {api_host: 'https://us.i.posthog.com', person_profiles: 'identified_only'});
  `;
  document.head.appendChild(script);
}

/**
 * Dynamically loads Meta Pixel after consent is granted.
 */
function loadMetaPixel(pixelId: string) {
  if (document.getElementById("meta-pixel-script")) return;

  const script = document.createElement("script");
  script.id = "meta-pixel-script";
  script.async = true;
  script.defer = true;
  script.textContent = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;t.defer=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${pixelId}');
    fbq('track', 'PageView');
  `;
  document.head.appendChild(script);

  // Add noscript fallback
  const noscript = document.createElement("noscript");
  noscript.id = "meta-pixel-noscript";
  noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/>`;
  document.body.appendChild(noscript);
}

/**
 * Removes all analytics scripts from the DOM.
 * Called when consent is declined after being previously granted.
 */
function removeAnalyticsScripts() {
  const ids = [
    "ga4-script",
    "ga4-config",
    "posthog-script",
    "meta-pixel-script",
    "meta-pixel-noscript",
  ];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
}

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const { consent } = useConsentState();
  const scriptsLoaded = useRef(false);

  useEffect(() => {
    if (consent === "granted" && !scriptsLoaded.current) {
      // Load analytics scripts only after consent is granted
      if (GA4_MEASUREMENT_ID) loadGA4(GA4_MEASUREMENT_ID);
      if (POSTHOG_KEY) loadPostHog(POSTHOG_KEY);
      if (META_PIXEL_ID) loadMetaPixel(META_PIXEL_ID);
      scriptsLoaded.current = true;
    } else if (consent === "declined") {
      // Remove scripts if previously loaded and consent is now declined
      if (scriptsLoaded.current) {
        removeAnalyticsScripts();
        scriptsLoaded.current = false;
      }
      // Track anonymous page view only (no personal data)
      trackAnonymousPageView();
    } else if (consent === null) {
      // Consent not yet given — track anonymous page view only
      trackAnonymousPageView();
    }
  }, [consent]);

  return (
    <>
      {children}
      <CookieConsentBanner />
    </>
  );
}
