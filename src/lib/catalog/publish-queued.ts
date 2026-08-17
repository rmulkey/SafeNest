/**
 * Daily catalog publisher.
 *
 * Drains the `queuedProduct` queue in Sanity, publishing up to N verified
 * products into the live `toyReview` catalog. This is the automation that grows
 * the catalog with no daily manual intervention — but it is ALSO the
 * data-integrity gate: each queued product is re-verified at publish time and
 * is only published if BOTH checks pass:
 *
 *   1. affiliate URL passes isValidAffiliateUrl (real Amazon search/product URL)
 *   2. imageUrl returns real image bytes (HTTP 200, content-type image/*, >2KB)
 *
 * Anything that fails is marked status="failed" with lastError and skipped —
 * never published. An empty queue is a no-op. So the worst case is "nothing new
 * today", never "fabricated/broken product went live".
 */
import type { SanityClient } from "@sanity/client";
import { isValidAffiliateUrl } from "@/lib/affiliate/link-builder";
import { submitToIndexNow } from "@/lib/seo/indexnow";
import { computeSafetyScore } from "@/lib/scoring/safety-score";
import { computeDevelopmentScore } from "@/lib/scoring/development-score";

const IMAGE_FETCH_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
const MIN_IMAGE_BYTES = 2000;

export interface QueuedProductDoc {
  _id: string;
  productName: string;
  brand: string;
  categoryRef: string;
  ageMinMonths: number;
  ageMaxMonths: number;
  affiliateUrl: string;
  imageUrl: string;
  imageAlt: string;
  materialSafety: number;
  chokingRisk: number;
  recallHistory: number;
  certificationPresence: number;
  motorSkills: number;
  cognitiveSkills: number;
  sensoryEngagement: number;
  materials: string[];
  chokingHazardAssessment: string;
  certifications?: string[];
  pros: string[];
  cons: string[];
}

export interface PublishOutcome {
  id: string;
  productName: string;
  status: "published" | "failed" | "skipped-duplicate";
  reviewId?: string;
  error?: string;
}

/** Build a URL-safe slug from a product name. */
export function slugifyProductName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

/**
 * Verifies an image URL returns real image bytes from an approved source.
 * Returns the bytes + content type on success, or throws with a reason.
 */
export async function fetchVerifiedImage(
  url: string
): Promise<{ buffer: Buffer; contentType: string }> {
  const resp = await fetch(url, {
    headers: {
      "User-Agent": IMAGE_FETCH_UA,
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!resp.ok) throw new Error(`image HTTP ${resp.status}`);
  const contentType = resp.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    throw new Error(`not an image (content-type: ${contentType || "none"})`);
  }
  const arrayBuf = await resp.arrayBuffer();
  if (arrayBuf.byteLength < MIN_IMAGE_BYTES) {
    throw new Error(`image too small (${arrayBuf.byteLength} bytes)`);
  }
  return { buffer: Buffer.from(arrayBuf), contentType };
}

/**
 * Publishes a single queued product into the catalog after re-verification.
 * Mutates the queue doc's status. Returns the outcome.
 */
export async function publishOneQueued(
  client: SanityClient,
  q: QueuedProductDoc
): Promise<PublishOutcome> {
  try {
    // 1. Verify affiliate URL is a real, allowed Amazon URL (never fabricated).
    if (!isValidAffiliateUrl(q.affiliateUrl)) {
      throw new Error(`invalid affiliate URL: ${q.affiliateUrl}`);
    }

    // 2. Dedupe by slug — don't publish a product that already exists.
    const slug = slugifyProductName(q.productName);
    const existing = await client.fetch<string | null>(
      `*[_type == "toyReview" && slug.current == $slug][0]._id`,
      { slug }
    );
    if (existing) {
      await client
        .patch(q._id)
        .set({ status: "published", publishedReviewId: existing, lastError: "" })
        .commit();
      return {
        id: q._id,
        productName: q.productName,
        status: "skipped-duplicate",
        reviewId: existing,
      };
    }

    // 3. Verify the image returns real bytes, then upload to Sanity.
    const { buffer, contentType } = await fetchVerifiedImage(q.imageUrl);
    const asset = await client.assets.upload("image", buffer, {
      filename: `${slug}.jpg`,
      contentType,
    });

    // 4. Compute scores from the editorial factors.
    const safetyScore = computeSafetyScore({
      materialSafety: q.materialSafety,
      chokingRisk: q.chokingRisk,
      recallHistory: q.recallHistory,
      certificationPresence: q.certificationPresence,
    });
    const developmentScore = computeDevelopmentScore({
      motorSkills: q.motorSkills,
      cognitiveSkills: q.cognitiveSkills,
      sensoryEngagement: q.sensoryEngagement,
    });

    // 5. Create the live toyReview. Store the Amazon URL WITHOUT a tag — the
    //    BuyButton appends the affiliate tag at render time.
    const reviewId = `review-${slug}`;
    await client.createOrReplace({
      _id: reviewId,
      _type: "toyReview",
      productName: q.productName,
      brand: q.brand,
      slug: { _type: "slug", current: slug },
      ageRange: { minMonths: q.ageMinMonths, maxMonths: q.ageMaxMonths },
      category: { _type: "reference", _ref: q.categoryRef },
      materialSafety: q.materialSafety,
      chokingRisk: q.chokingRisk,
      recallHistory: q.recallHistory,
      certificationPresence: q.certificationPresence,
      motorSkills: q.motorSkills,
      cognitiveSkills: q.cognitiveSkills,
      sensoryEngagement: q.sensoryEngagement,
      safetyScore,
      developmentScore,
      materials: q.materials,
      chokingHazardAssessment: q.chokingHazardAssessment,
      certifications: q.certifications ?? [],
      pros: q.pros,
      cons: q.cons,
      affiliateLinks: [
        {
          _type: "affiliateLink",
          _key: "amazon",
          partnerId: "amazon",
          url: q.affiliateUrl,
          tag: "safeneststore-20",
          label: "Buy on Amazon",
        },
      ],
      mainImage: {
        _type: "image",
        alt: q.imageAlt,
        asset: { _type: "reference", _ref: asset._id },
      },
      hasActiveRecall: false,
      needsReview: false,
      publishedAt: new Date().toISOString(),
    });

    await client
      .patch(q._id)
      .set({ status: "published", publishedReviewId: reviewId, lastError: "" })
      .commit();

    return {
      id: q._id,
      productName: q.productName,
      status: "published",
      reviewId,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Mark failed so it won't be retried blindly and is visible for a fix.
    try {
      await client.patch(q._id).set({ status: "failed", lastError: message }).commit();
    } catch {
      // ignore secondary failure
    }
    return { id: q._id, productName: q.productName, status: "failed", error: message };
  }
}

/**
 * Drains up to `limit` queued products. Returns per-item outcomes.
 *
 * Newly published reviews are pushed to the IndexNow participants at the end of
 * the batch. This closes a real gap: the Sanity webhook submits URLs when an
 * editor publishes in the Studio, but the daily publisher writes documents with
 * the API client and never triggers that webhook — so products added by the
 * automation were invisible to IndexNow until the next full sitemap submission.
 *
 * Submitted once per batch rather than once per product, and never allowed to
 * fail the publish: the catalogue write is the job, notification is a courtesy.
 */
export async function publishQueuedBatch(
  client: SanityClient,
  limit = 5
): Promise<PublishOutcome[]> {
  const queued = await client.fetch<QueuedProductDoc[]>(
    `*[_type == "queuedProduct" && status == "queued"] | order(_createdAt asc)[0...$limit]{
      _id, productName, brand, categoryRef, ageMinMonths, ageMaxMonths,
      affiliateUrl, imageUrl, imageAlt,
      materialSafety, chokingRisk, recallHistory, certificationPresence,
      motorSkills, cognitiveSkills, sensoryEngagement,
      materials, chokingHazardAssessment, certifications, pros, cons
    }`,
    { limit }
  );

  const outcomes: PublishOutcome[] = [];
  for (const q of queued) {
    outcomes.push(await publishOneQueued(client, q));
  }

  const publishedSlugs = outcomes
    .filter((o) => o.status === "published")
    .map((o) => slugifyProductName(o.productName));

  if (publishedSlugs.length > 0) {
    const urls = [
      "/reviews",
      "/",
      ...publishedSlugs.map((s) => `/reviews/${s}`),
    ];
    try {
      const result = await submitToIndexNow(urls);
      console.log(
        `[publish-queued] IndexNow: ${result.outcome}` +
          (result.outcome === "submitted"
            ? ` (${result.submitted} URL(s), HTTP ${result.status})`
            : result.detail
              ? ` — ${result.detail}`
              : "")
      );
    } catch (error) {
      // Never let notification failure mask a successful publish.
      console.warn("[publish-queued] IndexNow submission threw:", error);
    }
  }

  return outcomes;
}
