/**
 * Klaviyo API client stub
 * Actual Klaviyo API integration will be implemented later.
 * For now, this logs and returns success.
 */

export interface KlaviyoSyncResult {
  success: boolean;
  klaviyoId?: string;
  error?: string;
}

const KLAVIYO_TIMEOUT_MS = 10_000;

/**
 * Syncs a subscriber to Klaviyo.
 * Currently a stub that logs and returns success.
 * Uses KLAVIYO_API_KEY env var (validated but not used in stub).
 */
export async function syncSubscriber(
  email: string,
  ageRange: string
): Promise<KlaviyoSyncResult> {
  const apiKey = process.env.KLAVIYO_API_KEY;

  if (!apiKey) {
    console.warn("[Klaviyo] KLAVIYO_API_KEY not set, skipping sync");
    return { success: false, error: "Klaviyo API key not configured" };
  }

  // Simulate async operation with timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), KLAVIYO_TIMEOUT_MS);

  try {
    // Stub: simulate successful sync
    console.log(
      `[Klaviyo] Syncing subscriber: ${email}, ageRange: ${ageRange}`
    );

    // Simulate a brief async delay (in production, this would be the API call)
    await new Promise((resolve) => setTimeout(resolve, 10));

    const stubKlaviyoId = `klv_${Date.now()}`;

    console.log(
      `[Klaviyo] Successfully synced subscriber: ${email} (id: ${stubKlaviyoId})`
    );

    return { success: true, klaviyoId: stubKlaviyoId };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error(`[Klaviyo] Timeout syncing subscriber: ${email}`);
      return { success: false, error: "Klaviyo sync timed out (>10s)" };
    }

    console.error(`[Klaviyo] Error syncing subscriber: ${email}`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
