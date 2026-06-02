import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Generates an anonymized session ID from request headers.
 */
function generateAnonymizedSessionId(request: NextRequest): string {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  const hash = crypto
    .createHash("sha256")
    .update(`${ip}:${userAgent}`)
    .digest("hex")
    .slice(0, 16);

  return hash;
}

/**
 * POST /api/affiliate/click
 *
 * Records an affiliate click event and redirects to the destination URL.
 * Always redirects (302) even if DB recording fails.
 */
export async function POST(request: NextRequest) {
  let destinationUrl: string | undefined;

  try {
    const body = await request.json();
    const { productId, sourcePageUrl, partnerId, destinationUrl: destUrl } = body;

    destinationUrl = destUrl;

    if (!productId || !sourcePageUrl || !partnerId || !destinationUrl) {
      return NextResponse.json(
        { error: "Missing required fields: productId, sourcePageUrl, partnerId, destinationUrl" },
        { status: 400 }
      );
    }

    const sessionId = generateAnonymizedSessionId(request);

    // Record click — lazy import to avoid crash if DB not configured
    try {
      const { prisma } = await import("@/lib/db/prisma");
      await prisma.affiliateClick.create({
        data: {
          productId,
          sourcePageUrl,
          partnerId,
          sessionId,
          timestamp: new Date(),
        },
      });
    } catch (dbError) {
      console.error(
        `[Affiliate Click] DB recording failed for ${productId}:`,
        dbError instanceof Error ? dbError.message : dbError
      );
    }

    return NextResponse.redirect(destinationUrl, 302);
  } catch (error) {
    if (destinationUrl) {
      console.error("[Affiliate Click] Unexpected error, still redirecting:", error);
      return NextResponse.redirect(destinationUrl, 302);
    }
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
