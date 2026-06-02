/**
 * Affiliate link health validation utilities.
 * Checks URL reachability with a 10-second timeout.
 */

export interface LinkHealthResult {
  isHealthy: boolean;
  httpStatus: number | null;
}

/**
 * Checks whether a given URL is reachable and returns a healthy HTTP status.
 *
 * @param url - The URL to check
 * @returns An object indicating health status and HTTP status code
 */
export async function checkLinkHealth(url: string): Promise<LinkHealthResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeoutId);

    const httpStatus = response.status;
    const isHealthy = httpStatus >= 200 && httpStatus < 400;

    return { isHealthy, httpStatus };
  } catch {
    // Network error, timeout, or other fetch failure
    return { isHealthy: false, httpStatus: null };
  }
}
