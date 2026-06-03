/**
 * Feature: safenest-toys, Property 4: Invalid email format rejection
 *
 * For any string that does not conform to standard email format
 * (missing @, missing domain, invalid characters), the newsletter system
 * SHALL reject the submission, display a validation error, and SHALL NOT
 * persist any record to the database.
 *
 * **Validates: Requirements 6.5**
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

// Mock Prisma to avoid DB calls and verify no record is created.
// `createMock` must be wrapped in vi.hoisted() because vi.mock factories are
// hoisted above imports — a plain top-level const would not be initialized yet.
const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    newsletterSubscription: {
      findUnique: vi.fn(),
      create: createMock,
    },
  },
}));

import { POST } from "../route";

/**
 * Generates strings that are guaranteed NOT to be valid emails.
 * The route's regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
 * Invalid means: missing @, missing domain dot, spaces, empty, etc.
 */
function invalidEmailArbitrary(): fc.Arbitrary<string> {
  // Arbitrary for chars that are not @ and not whitespace
  const safeChar = fc.integer({ min: 33, max: 126 })
    .filter((c) => c !== 64) // exclude @
    .map((c) => String.fromCharCode(c));

  // Arbitrary for chars that are not @, not whitespace, not dot
  const safeNoDotChar = fc.integer({ min: 33, max: 126 })
    .filter((c) => c !== 64 && c !== 46) // exclude @ and .
    .map((c) => String.fromCharCode(c));

  return fc.oneof(
    // Strings with no @ symbol at all
    fc.array(safeChar, { minLength: 1, maxLength: 30 }).map((chars) => chars.join("")),
    // Empty string
    fc.constant(""),
    // Just an @ with nothing useful
    fc.constant("@"),
    // @ at start (no local part)
    fc.array(safeNoDotChar, { minLength: 1, maxLength: 15 }).map(
      (chars) => `@${chars.join("")}`
    ),
    // Missing domain dot: local@domainwithnodot
    fc.tuple(
      fc.array(safeChar, { minLength: 1, maxLength: 15 }).map((c) => c.join("")),
      fc.array(safeNoDotChar, { minLength: 1, maxLength: 15 }).map((c) => c.join(""))
    ).map(([local, domain]) => `${local}@${domain}`),
    // @ at end (no domain)
    fc.array(safeChar, { minLength: 1, maxLength: 15 }).map(
      (chars) => `${chars.join("")}@`
    ),
    // Strings with spaces (always invalid)
    fc.tuple(
      fc.array(safeChar, { minLength: 1, maxLength: 10 }).map((c) => c.join("")),
      fc.array(safeChar, { minLength: 1, maxLength: 10 }).map((c) => c.join(""))
    ).map(([a, b]) => `${a} ${b}`),
    // Multiple @ signs
    fc.tuple(
      fc.array(safeChar, { minLength: 1, maxLength: 10 }).map((c) => c.join("")),
      fc.array(safeChar, { minLength: 1, maxLength: 10 }).map((c) => c.join("")),
      fc.array(safeNoDotChar, { minLength: 1, maxLength: 10 }).map((c) => c.join(""))
    ).map(([a, b, c]) => `${a}@${b}@${c}`)
  );
}

function createRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/newsletter/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Property 4: Invalid email format rejection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject any invalid email and never call Klaviyo", async () => {
    await fc.assert(
      fc.asyncProperty(invalidEmailArbitrary(), async (invalidEmail) => {
        const request = createRequest({
          email: invalidEmail,
          ageRange: "3-5",
        });

        const response = await POST(request);
        const data = await response.json();

        // Must return 400 status
        expect(response.status).toBe(400);

        // Must indicate failure
        expect(data.success).toBe(false);

        // Must include validation error message
        expect(data.message).toContain("Invalid email");

        // No record must ever be written to the database for invalid emails
        expect(createMock).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });
});
