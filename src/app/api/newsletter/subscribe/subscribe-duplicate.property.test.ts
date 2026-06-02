/**
 * Feature: safenest-toys, Property 9: Duplicate email subscription prevention
 *
 * Validates: Requirements 6.9
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

// Mock Prisma
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    newsletterSubscription: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock Klaviyo
vi.mock("@/lib/newsletter/klaviyo", () => ({
  syncSubscriber: vi.fn(),
}));

import { POST } from "./route";
import { prisma } from "@/lib/db/prisma";
import { syncSubscriber } from "@/lib/newsletter/klaviyo";

const mockedPrisma = vi.mocked(prisma);
const mockedSyncSubscriber = vi.mocked(syncSubscriber);

/**
 * Generates a random valid email address.
 */
const validEmailArb = fc
  .tuple(
    fc.stringMatching(/^[a-z][a-z0-9]{1,10}$/),
    fc.stringMatching(/^[a-z][a-z0-9]{1,8}$/),
    fc.constantFrom("com", "net", "org", "io", "dev")
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

const ageRangeArb = fc.constantFrom("0-2", "3-5", "6-8", "9-12");

describe("Property 9: Duplicate email subscription prevention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("subscribing twice with the same email does not create a duplicate record", async () => {
    await fc.assert(
      fc.asyncProperty(validEmailArb, ageRangeArb, async (email, ageRange) => {
        vi.clearAllMocks();

        // Track how many times create is called
        let createCallCount = 0;

        // First call: email does not exist yet
        (mockedPrisma.newsletterSubscription.findUnique as ReturnType<typeof vi.fn>)
          .mockResolvedValueOnce(null) // first subscribe: not found
          .mockResolvedValueOnce({
            // second subscribe: already exists
            id: "sub_1",
            email: email.toLowerCase(),
            ageRange,
            klaviyoId: "klv_123",
            syncedAt: new Date(),
            createdAt: new Date(),
          });

        mockedSyncSubscriber.mockResolvedValue({
          success: true,
          klaviyoId: "klv_123",
        });

        (mockedPrisma.newsletterSubscription.create as ReturnType<typeof vi.fn>).mockImplementation(
          async () => {
            createCallCount++;
            return {
              id: "sub_1",
              email: email.toLowerCase(),
              ageRange,
              klaviyoId: "klv_123",
              syncedAt: new Date(),
              createdAt: new Date(),
            };
          }
        );

        // First subscription attempt
        const firstRequest = new Request("http://localhost/api/newsletter/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, ageRange }),
        });

        const firstResponse = await POST(firstRequest);
        const firstBody = await firstResponse.json();

        expect(firstResponse.status).toBe(201);
        expect(firstBody.success).toBe(true);
        expect(createCallCount).toBe(1);

        // Second subscription attempt with same email
        const secondRequest = new Request("http://localhost/api/newsletter/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, ageRange }),
        });

        const secondResponse = await POST(secondRequest);
        const secondBody = await secondResponse.json();

        // Should indicate already subscribed, NOT create a new record
        expect(secondResponse.status).toBe(200);
        expect(secondBody.success).toBe(true);
        expect(secondBody.alreadySubscribed).toBe(true);

        // create should still only have been called once (from first request)
        expect(createCallCount).toBe(1);
      }),
      { numRuns: 100 }
    );
  });
});
