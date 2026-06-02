/**
 * Feature: safenest-toys, Property 3: Affiliate click always redirects
 *
 * For any affiliate click event, regardless of whether the database recording
 * succeeds or fails, the system SHALL redirect the user to the affiliate
 * destination URL without delay.
 *
 * **Validates: Requirements 5.2, 5.7**
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";
import { NextRequest } from "next/server";

// Mock Prisma to simulate both success and failure scenarios
const mockCreate = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    affiliateClick: {
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
  handleDatabaseError: (error: unknown) => ({
    message: error instanceof Error ? error.message : "Unknown DB error",
  }),
}));

import { POST } from "../route";

/**
 * Generates a random valid affiliate click request body.
 */
function affiliateClickArbitrary() {
  return fc.record({
    productId: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
    sourcePageUrl: fc.webUrl(),
    partnerId: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
    destinationUrl: fc.webUrl(),
  });
}

/**
 * Generates a random DB outcome: either success or various failure types.
 */
function dbOutcomeArbitrary(): fc.Arbitrary<"success" | "error"> {
  return fc.oneof(fc.constant("success" as const), fc.constant("error" as const));
}

function createNextRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/affiliate/click", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "192.168.1.1",
      "user-agent": "test-agent",
    },
    body: JSON.stringify(body),
  });
}

describe("Property 3: Affiliate click always redirects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should always redirect to destination URL regardless of DB outcome", async () => {
    await fc.assert(
      fc.asyncProperty(
        affiliateClickArbitrary(),
        dbOutcomeArbitrary(),
        async (clickEvent, dbOutcome) => {
          // Configure mock based on DB outcome
          if (dbOutcome === "success") {
            mockCreate.mockResolvedValueOnce({
              id: "test-id",
              ...clickEvent,
              sessionId: "abc123",
              timestamp: new Date(),
            });
          } else {
            mockCreate.mockRejectedValueOnce(
              new Error("Database connection failed")
            );
          }

          const request = createNextRequest(clickEvent);
          const response = await POST(request);

          // Response must always be a redirect (302 or 307)
          expect([302, 307]).toContain(response.status);

          // Redirect location must be the destination URL
          // NextResponse.redirect may normalize URLs (e.g., add trailing slash to bare domains)
          const location = response.headers.get("location");
          expect(location).not.toBeNull();
          const actualUrl = new URL(location!);
          const expectedUrl = new URL(clickEvent.destinationUrl);
          expect(actualUrl.origin).toBe(expectedUrl.origin);
          expect(actualUrl.pathname).toBe(
            expectedUrl.pathname === "" ? "/" : expectedUrl.pathname
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
