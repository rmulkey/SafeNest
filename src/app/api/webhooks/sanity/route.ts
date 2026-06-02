/**
 * Sanity webhook handler for on-demand ISR revalidation and score recalculation.
 *
 * Accepts POST requests from Sanity webhooks when content is created, updated,
 * or deleted. Verifies webhook signature, triggers ISR revalidation for the
 * affected page, recalculates safety/development scores for toy review mutations,
 * and pings search engines to notify of sitemap changes.
 *
 * Requirements: 2.3, 3.3, 4.5
 */

import { createHmac, timingSafeEqual } from "crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { sanityClient, sanityWriteClient } from "@/lib/sanity/client";
import { computeSafetyScore } from "@/lib/scoring/safety-score";
import { computeDevelopmentScore } from "@/lib/scoring/development-score";
import { pingSearchEngines } from "@/lib/seo/sitemap";
import { groq } from "next-sanity";

/**
 * Sanity webhook payload shape.
 */
interface SanityWebhookPayload {
  _type: string;
  _id: string;
  _rev?: string;
  operation: "create" | "update" | "delete";
}

/**
 * GROQ query to fetch scoring factors for a toy review.
 */
const reviewScoringFactorsQuery = groq`
  *[_type == "toyReview" && _id == $id][0] {
    _id,
    materialSafety,
    chokingRisk,
    recallHistory,
    certificationPresence,
    motorSkills,
    cognitiveSkills,
    sensoryEngagement,
    slug
  }
`;

interface ReviewScoringFactors {
  _id: string;
  materialSafety: number;
  chokingRisk: number;
  recallHistory: number;
  certificationPresence: number;
  motorSkills: number;
  cognitiveSkills: number;
  sensoryEngagement: number;
  slug: { current: string };
}

/**
 * Map of content types to their public URL path prefixes.
 */
const typeToPathMap: Record<string, string> = {
  toyReview: "/reviews",
  buyingGuide: "/guides",
  blogPost: "/blog",
  safetyArticle: "/articles",
  category: "/categories",
  ageBasedGuide: "/guides/age",
  recallAlert: "/recalls",
};

/**
 * Verifies the webhook signature using HMAC SHA-256.
 * Returns true if the signature is valid, false otherwise.
 */
function verifyWebhookSignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) {
    return false;
  }

  const hmac = createHmac("sha256", secret);
  hmac.update(body);
  const expectedSignature = hmac.digest("base64");

  try {
    const sigBuffer = Buffer.from(signature, "base64");
    const expectedBuffer = Buffer.from(expectedSignature, "base64");

    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * Recalculates safety and development scores for a toy review
 * and patches the document in Sanity.
 */
async function recalculateScores(documentId: string): Promise<void> {
  const review = await sanityClient.fetch<ReviewScoringFactors | null>(
    reviewScoringFactorsQuery,
    { id: documentId }
  );

  if (!review) {
    console.warn(`[Webhook] Toy review ${documentId} not found for score recalculation`);
    return;
  }

  try {
    const safetyScore = computeSafetyScore({
      materialSafety: review.materialSafety,
      chokingRisk: review.chokingRisk,
      recallHistory: review.recallHistory,
      certificationPresence: review.certificationPresence,
    });

    const developmentScore = computeDevelopmentScore({
      motorSkills: review.motorSkills,
      cognitiveSkills: review.cognitiveSkills,
      sensoryEngagement: review.sensoryEngagement,
    });

    await sanityWriteClient
      .patch(documentId)
      .set({ safetyScore, developmentScore })
      .commit();

    console.log(
      `[Webhook] Recalculated scores for ${documentId}: safety=${safetyScore}, development=${developmentScore}`
    );
  } catch (error) {
    console.error(`[Webhook] Failed to recalculate scores for ${documentId}:`, error);
  }
}

/**
 * Revalidates the appropriate paths for a content change.
 */
function revalidateForContentChange(type: string, slug?: string): void {
  const pathPrefix = typeToPathMap[type];

  if (pathPrefix && slug) {
    // Revalidate the specific page
    revalidatePath(`${pathPrefix}/${slug}`);
  }

  // Revalidate the listing page / homepage as content lists may have changed
  revalidatePath("/");

  if (pathPrefix) {
    // Revalidate the listing page for this content type
    revalidatePath(pathPrefix);
  }

  // Revalidate sitemap so it regenerates with fresh content
  revalidatePath("/sitemap.xml");
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    // Read raw body for signature verification
    const rawBody = await request.text();

    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.SANITY_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = request.headers.get("sanity-webhook-signature");
      const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);

      if (!isValid) {
        console.warn("[Webhook] Invalid webhook signature");
        return NextResponse.json(
          { message: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    const payload = JSON.parse(rawBody) as SanityWebhookPayload;
    const { _type, _id, operation } = payload;

    if (!_type || !_id || !operation) {
      return NextResponse.json(
        { message: "Invalid webhook payload" },
        { status: 400 }
      );
    }

    console.log(`[Webhook] Received: ${operation} on ${_type} (${_id})`);

    // For toy review create/update, recalculate scores
    if (_type === "toyReview" && (operation === "create" || operation === "update")) {
      await recalculateScores(_id);
    }

    // Fetch the slug for revalidation path construction
    let slug: string | undefined;
    if (operation !== "delete") {
      try {
        const doc = await sanityClient.fetch<{ slug?: { current: string } } | null>(
          groq`*[_id == $id][0] { slug }`,
          { id: _id }
        );
        slug = doc?.slug?.current;
      } catch {
        // If we can't fetch the slug, still revalidate general paths
        console.warn(`[Webhook] Could not fetch slug for ${_id}`);
      }
    }

    // Trigger ISR revalidation for affected pages
    revalidateForContentChange(_type, slug);

    // Ping search engines to notify of sitemap update (fire-and-forget)
    // This ensures sitemap changes are picked up within 5 minutes
    pingSearchEngines().catch((error) => {
      console.warn("[Webhook] Search engine ping failed:", error);
    });

    return NextResponse.json({ message: "OK", revalidated: true });
  } catch (error) {
    // Log error but don't crash — content remains at previous cached version
    console.error("[Webhook] Processing error:", error);
    return NextResponse.json(
      { message: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
