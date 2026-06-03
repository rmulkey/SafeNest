/**
 * One-off manual runner to exercise the publisher pipeline against the real
 * dataset (same logic the daily cron uses). Publishes up to N queued products.
 *
 * Run: SANITY_API_TOKEN="..." node scripts/run-publish-once.mjs [limit]
 *
 * Mirrors src/lib/catalog/publish-queued.ts but in plain JS so it runs without
 * a build step. Keep behavior in sync if the TS source changes.
 */
import { createClient } from "@sanity/client";

const client = createClient({
  projectId: "ofvgjgsi",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

const LIMIT = Number(process.argv[2] || 5);
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
const AMAZON_SUFFIXES = ["com", "ca", "co.uk", "de", "fr", "es", "it", "co.jp", "in", "com.au", "com.br", "com.mx"];

function isAmazonHost(host) {
  if (host === "amzn.to" || host.endsWith(".amzn.to")) return true;
  return AMAZON_SUFFIXES.some((s) => host === `amazon.${s}` || host.endsWith(`.amazon.${s}`));
}
function isValidAffiliateUrl(url) {
  let p;
  try { p = new URL(url); } catch { return false; }
  if (p.protocol !== "http:" && p.protocol !== "https:") return false;
  if (!isAmazonHost(p.hostname.toLowerCase())) return false;
  const isSearch = p.pathname === "/s" && p.searchParams.has("k");
  const isProduct = p.pathname.includes("/dp/") || p.pathname.includes("/gp/");
  return isSearch || isProduct;
}
function slugify(name) {
  return name.toLowerCase().replace(/['’]/g, "").replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 96);
}
const safetyScore = (ms, cr, rh, cp) => Math.round(ms * 0.3 + cr * 0.3 + rh * 0.2 + cp * 0.2);
const devScore = (mo, co, se) => Math.round(mo * 0.4 + co * 0.35 + se * 0.25);

async function fetchVerifiedImage(url) {
  const resp = await fetch(url, { headers: { "User-Agent": UA, Accept: "image/*,*/*;q=0.8" }, signal: AbortSignal.timeout(10000) });
  if (!resp.ok) throw new Error(`image HTTP ${resp.status}`);
  const ct = resp.headers.get("content-type") || "";
  if (!ct.startsWith("image/")) throw new Error(`not an image (${ct || "none"})`);
  const buf = await resp.arrayBuffer();
  if (buf.byteLength < 2000) throw new Error(`image too small (${buf.byteLength}b)`);
  return { buffer: Buffer.from(buf), contentType: ct };
}

async function publishOne(q) {
  try {
    if (!isValidAffiliateUrl(q.affiliateUrl)) throw new Error(`invalid affiliate URL: ${q.affiliateUrl}`);
    const slug = slugify(q.productName);
    const existing = await client.fetch(`*[_type=="toyReview" && slug.current==$slug][0]._id`, { slug });
    if (existing) {
      await client.patch(q._id).set({ status: "published", publishedReviewId: existing, lastError: "" }).commit();
      return { productName: q.productName, status: "skipped-duplicate", reviewId: existing };
    }
    const { buffer, contentType } = await fetchVerifiedImage(q.imageUrl);
    const asset = await client.assets.upload("image", buffer, { filename: `${slug}.jpg`, contentType });
    const reviewId = `review-${slug}`;
    await client.createOrReplace({
      _id: reviewId, _type: "toyReview",
      productName: q.productName, brand: q.brand,
      slug: { _type: "slug", current: slug },
      ageRange: { minMonths: q.ageMinMonths, maxMonths: q.ageMaxMonths },
      category: { _type: "reference", _ref: q.categoryRef },
      materialSafety: q.materialSafety, chokingRisk: q.chokingRisk, recallHistory: q.recallHistory, certificationPresence: q.certificationPresence,
      motorSkills: q.motorSkills, cognitiveSkills: q.cognitiveSkills, sensoryEngagement: q.sensoryEngagement,
      safetyScore: safetyScore(q.materialSafety, q.chokingRisk, q.recallHistory, q.certificationPresence),
      developmentScore: devScore(q.motorSkills, q.cognitiveSkills, q.sensoryEngagement),
      materials: q.materials, chokingHazardAssessment: q.chokingHazardAssessment,
      certifications: q.certifications ?? [], pros: q.pros, cons: q.cons,
      affiliateLinks: [{ _type: "affiliateLink", _key: "amazon", partnerId: "amazon", url: q.affiliateUrl, tag: "safeneststore-20", label: "Buy on Amazon" }],
      mainImage: { _type: "image", alt: q.imageAlt, asset: { _type: "reference", _ref: asset._id } },
      hasActiveRecall: false, needsReview: false, publishedAt: new Date().toISOString(),
    });
    await client.patch(q._id).set({ status: "published", publishedReviewId: reviewId, lastError: "" }).commit();
    return { productName: q.productName, status: "published", reviewId };
  } catch (e) {
    await client.patch(q._id).set({ status: "failed", lastError: e.message }).commit().catch(() => {});
    return { productName: q.productName, status: "failed", error: e.message };
  }
}

async function main() {
  const queued = await client.fetch(
    `*[_type=="queuedProduct" && status=="queued"] | order(_createdAt asc)[0...$limit]{
      _id, productName, brand, categoryRef, ageMinMonths, ageMaxMonths, affiliateUrl, imageUrl, imageAlt,
      materialSafety, chokingRisk, recallHistory, certificationPresence, motorSkills, cognitiveSkills, sensoryEngagement,
      materials, chokingHazardAssessment, certifications, pros, cons
    }`, { limit: LIMIT }
  );
  console.log(`Publishing ${queued.length} of queued...\n`);
  for (const q of queued) {
    const r = await publishOne(q);
    console.log(`  ${r.status.toUpperCase()}: ${r.productName}${r.error ? " — " + r.error : r.reviewId ? " → " + r.reviewId : ""}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
