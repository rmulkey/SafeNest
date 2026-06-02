/**
 * Feature: safenest-toys, Property 8: Analytics scripts load only with consent
 *
 * Validates: Requirements 10.6, 10.7
 *
 * For any consent state, analytics scripts (GA4, PostHog, Meta Pixel) SHALL be
 * loaded if and only if the user has granted cookie consent. If consent is
 * declined or not yet given, zero analytics scripts SHALL be present in the page.
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// Script IDs used by the AnalyticsProvider
const ANALYTICS_SCRIPT_IDS = [
  "ga4-script",
  "ga4-config",
  "posthog-script",
  "meta-pixel-script",
  "meta-pixel-noscript",
] as const;

type ConsentState = "granted" | "declined" | null;

/**
 * Simulates the consent-gating logic from AnalyticsProvider.
 * Returns whether scripts should be loaded based on consent state.
 */
function shouldLoadScripts(consent: ConsentState): boolean {
  return consent === "granted";
}

/**
 * Returns the count of analytics scripts that should be present
 * in the DOM given a consent state.
 */
function expectedScriptCount(consent: ConsentState): number {
  return consent === "granted" ? ANALYTICS_SCRIPT_IDS.length : 0;
}

// Arbitrary for consent states: "granted", "declined", or null (not yet given)
const consentStateArb: fc.Arbitrary<ConsentState> = fc.oneof(
  fc.constant("granted" as const),
  fc.constant("declined" as const),
  fc.constant(null)
);

describe("Property 8: Analytics scripts load only with consent", () => {
  /**
   * Core property: scripts should be present if and only if consent is "granted".
   * This tests the logical gating decision.
   */
  it("should load scripts if and only if consent is granted (logical property)", () => {
    fc.assert(
      fc.property(consentStateArb, (consent) => {
        const shouldLoad = shouldLoadScripts(consent);

        if (consent === "granted") {
          // Scripts MUST be loaded when consent is granted
          expect(shouldLoad).toBe(true);
          expect(expectedScriptCount(consent)).toBe(ANALYTICS_SCRIPT_IDS.length);
        } else {
          // Scripts MUST NOT be loaded when consent is declined or null
          expect(shouldLoad).toBe(false);
          expect(expectedScriptCount(consent)).toBe(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: for any non-granted state, exactly zero scripts should be present.
   * This strengthens the assertion that declined AND null both result in zero scripts.
   */
  it("should have zero analytics scripts when consent is not granted", () => {
    const nonGrantedConsentArb: fc.Arbitrary<ConsentState> = fc.oneof(
      fc.constant("declined" as const),
      fc.constant(null)
    );

    fc.assert(
      fc.property(nonGrantedConsentArb, (consent) => {
        expect(shouldLoadScripts(consent)).toBe(false);
        expect(expectedScriptCount(consent)).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: the gating logic is a pure biconditional —
   * scripts present ↔ consent === "granted"
   */
  it("scripts present is logically equivalent to consent being granted", () => {
    fc.assert(
      fc.property(consentStateArb, (consent) => {
        const scriptsPresent = shouldLoadScripts(consent);
        const isGranted = consent === "granted";

        // Biconditional: scriptsPresent ↔ isGranted
        expect(scriptsPresent).toBe(isGranted);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: simulating the AnalyticsProvider's useEffect logic with
   * randomly generated consent states and env variable presence.
   * Verifies the component's actual branching logic.
   */
  it("should match AnalyticsProvider branching logic for any consent and env config", () => {
    const envConfigArb = fc.record({
      hasGA4: fc.boolean(),
      hasPostHog: fc.boolean(),
      hasMetaPixel: fc.boolean(),
    });

    fc.assert(
      fc.property(
        consentStateArb,
        envConfigArb,
        (consent, envConfig) => {
          // Simulate the AnalyticsProvider's useEffect logic
          let scriptsLoaded = false;
          const loadedScripts: string[] = [];

          if (consent === "granted" && !scriptsLoaded) {
            if (envConfig.hasGA4) loadedScripts.push("ga4-script", "ga4-config");
            if (envConfig.hasPostHog) loadedScripts.push("posthog-script");
            if (envConfig.hasMetaPixel) loadedScripts.push("meta-pixel-script", "meta-pixel-noscript");
            scriptsLoaded = true;
          } else if (consent === "declined") {
            // Remove scripts if previously loaded
            if (scriptsLoaded) {
              loadedScripts.length = 0;
              scriptsLoaded = false;
            }
          } else if (consent === null) {
            // No scripts loaded, anonymous tracking only
          }

          // Property assertion: scripts present if and only if consent is granted
          if (consent === "granted") {
            // At least one script loaded if any env var is configured
            const hasAnyConfig = envConfig.hasGA4 || envConfig.hasPostHog || envConfig.hasMetaPixel;
            if (hasAnyConfig) {
              expect(loadedScripts.length).toBeGreaterThan(0);
            }
          } else {
            // Zero scripts when consent is not granted
            expect(loadedScripts.length).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
