import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { syncSubscriber } from "@/lib/newsletter/klaviyo";

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

    // Check for existing subscription
    const existing = await prisma.newsletterSubscription.findUnique({
      where: { email: email.toLowerCase() },
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

    // Sync to Klaviyo
    const klaviyoResult = await syncSubscriber(email.toLowerCase(), ageRange);

    if (!klaviyoResult.success) {
      // If the error is a timeout, return specific message
      if (klaviyoResult.error?.includes("timed out")) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Subscription could not be completed due to a timeout. Please try again.",
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message:
            "Subscription could not be completed. Please try again later.",
        },
        { status: 500 }
      );
    }

    // Store in PostgreSQL
    await prisma.newsletterSubscription.create({
      data: {
        email: email.toLowerCase(),
        ageRange,
        klaviyoId: klaviyoResult.klaviyoId ?? null,
        syncedAt: new Date(),
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
