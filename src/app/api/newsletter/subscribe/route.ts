import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

/**
 * Newsletter subscription endpoint.
 *
 * Stores subscribers in SafeNest's own PostgreSQL database — this is a
 * first-party email list with no third-party email service provider. The
 * `NewsletterSubscription` table is the single source of truth for the audience.
 */

const VALID_AGE_RANGES = ["0-2", "3-5", "6-8", "9-12"] as const;
type AgeRange = (typeof VALID_AGE_RANGES)[number];

// Standard email regex - covers common valid email formats
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: unknown): email is string {
  return typeof email === "string" && EMAIL_REGEX.test(email);
}

function isValidAgeRange(ageRange: unknown): ageRange is AgeRange {
  return (
    typeof ageRange === "string" &&
    VALID_AGE_RANGES.includes(ageRange as AgeRange)
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, ageRange } = body;

    // Validate email format
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, message: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate ageRange
    if (!isValidAgeRange(ageRange)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid or missing age range. Must be one of: 0-2, 3-5, 6-8, 9-12",
        },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase();

    // Dedupe: don't create a second record for an email we already have.
    const existing = await prisma.newsletterSubscription.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: true,
          message: "This email is already subscribed",
          alreadySubscribed: true,
        },
        { status: 200 }
      );
    }

    // Store in our own PostgreSQL database (first-party list).
    await prisma.newsletterSubscription.create({
      data: {
        email: normalizedEmail,
        ageRange,
      },
    });

    return NextResponse.json(
      { success: true, message: "Successfully subscribed to the newsletter" },
      { status: 201 }
    );
  } catch (error) {
    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, message: "Invalid request body" },
        { status: 400 }
      );
    }

    console.error("[Newsletter] Subscription error:", error);
    return NextResponse.json(
      { success: false, message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
