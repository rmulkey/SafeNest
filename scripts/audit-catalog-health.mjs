#!/usr/bin/env node
/**
 * Read-only health audit of the catalog and the recall pipeline.
 *
 * Answers the questions that silently rot: is the CPSC sync still running, do
 * affiliate links still resolve, do product images still return image bytes, and
 * how many reviews are missing the provenance fields the review page promises to
 * show. Writes nothing.
 *
 * Usage:
 *   node scripts/audit-catalog-health.mjs
 *   SAMPLE=40 node scripts/audit-catalog-health.mjs   # widen the link/image check
 */

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const TOKEN = process.env.SANITY_API_TOKEN;
const SAMPLE = Number(process.env.SAMPLE || 20);

if (!PROJECT_ID || !TOKEN) {
  console.error("Missing NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_API_TOKEN.");
  process.exit(1);
}

async function q(groq) {
  const url = `https://${PROJECT_ID}.api.sanity.io/v2024-01-01/data/query/${DATASET}?query=${encodeURIComponent(groq)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const json = await res.json();
  if (json.error) throw new Error(JSON.stringify(json.error));
  return json.result;
}

const findings = [];
const note = (severity, msg) => {
  findings.push({ severity, msg });
  console.log(`  ${severity.padEnd(5)} ${msg}`);
};

// ── Recall pipeline freshness ────────────────────────────────────────────────
console.log("\nrecall sync");
const sync = await q(
  `*[_type=="recallSyncStatus"][0]{lastSuccessfulSyncAt,lastAttemptAt,lastAttemptOk,lastError,consecutiveFailures,recallsFetched,recallsUpserted,matchCandidatesQueued}`
);
if (!sync) {
  note("BUG", "no recallSyncStatus document — the sync has never recorded a run");
} else {
  const hours = sync.lastSuccessfulSyncAt
    ? (Date.now() - new Date(sync.lastSuccessfulSyncAt).getTime()) / 36e5
    : Infinity;
  console.log(`  info  last successful sync: ${Number.isFinite(hours) ? hours.toFixed(1) + "h ago" : "never"}`);
  console.log(`  info  last attempt: ${sync.lastAttemptAt ?? "never"} (ok=${sync.lastAttemptOk})`);
  if (!Number.isFinite(hours)) {
    note("BUG", "the CPSC sync has never completed successfully");
  } else if (hours > 48) {
    note(
      "BUG",
      `recall data is ${hours.toFixed(0)}h stale; the daily cron is not running (check CRON_SECRET in Vercel)`
    );
  } else if (hours > 26) {
    note("WARN", `recall data is ${hours.toFixed(0)}h old; expected under 26h for a daily cron`);
  }
  if (sync.consecutiveFailures > 0) {
    note("WARN", `${sync.consecutiveFailures} consecutive sync failure(s); lastError=${sync.lastError ?? "none"}`);
  }
}

// ── Catalog completeness ─────────────────────────────────────────────────────
console.log("\ncatalog");
const counts = await q(`{
  "recalls": count(*[_type=="recallAlert"]),
  "reviews": count(*[_type=="toyReview"]),
  "needsReview": count(*[_type=="toyReview" && needsReview==true]),
  "noRecallCheck": count(*[_type=="toyReview" && !defined(recallCheckedAt)]),
  "activeRecall": count(*[_type=="toyReview" && hasActiveRecall==true]),
  "pendingCandidates": count(*[_type=="recallMatchCandidate" && status=="pending"]),
  "noImage": count(*[_type=="toyReview" && !defined(mainImage)]),
  "noAffiliate": count(*[_type=="toyReview" && !defined(affiliateLinks)]),
  "noReviewedBy": count(*[_type=="toyReview" && !defined(reviewedBy)]),
  "noPublishedAt": count(*[_type=="toyReview" && !defined(publishedAt)]),
  "noLastReviewed": count(*[_type=="toyReview" && !defined(lastReviewedAt)]),
  "noCerts": count(*[_type=="toyReview" && count(certifications)==0]),
  "noPros": count(*[_type=="toyReview" && count(pros)==0]),
  "noCons": count(*[_type=="toyReview" && count(cons)==0]),
  "noCategory": count(*[_type=="toyReview" && !defined(category)]),
  "badAgeRange": count(*[_type=="toyReview" && (!defined(ageRange.minMonths) || !defined(ageRange.maxMonths) || ageRange.minMonths > ageRange.maxMonths)])
}`);
for (const [k, v] of Object.entries(counts)) {
  console.log(`  info  ${String(v).padStart(4)}  ${k}`);
}
if (counts.noRecallCheck > 0) {
  note("BUG", `${counts.noRecallCheck} review(s) have no recallCheckedAt, so their recall factor reports "Not found"`);
}
if (counts.badAgeRange > 0) {
  note("BUG", `${counts.badAgeRange} review(s) have a missing or inverted ageRange`);
}
if (counts.noCategory > 0) {
  note("WARN", `${counts.noCategory} review(s) have no category, so they are absent from category pages`);
}
if (counts.noImage > 0) {
  note("WARN", `${counts.noImage} review(s) have no image`);
}
if (counts.noAffiliate > 0) {
  note("WARN", `${counts.noAffiliate} review(s) have no affiliate link, so no purchase panel renders`);
}
if (counts.noLastReviewed > 0) {
  note(
    "WARN",
    `${counts.noLastReviewed} review(s) have no lastReviewedAt; the page tells readers details "may be out of date"`
  );
}
if (counts.pendingCandidates > 0) {
  note("WARN", `${counts.pendingCandidates} recall match candidate(s) awaiting human triage`);
}

// ── Affiliate link + image resolution ────────────────────────────────────────
console.log(`\nlink and image resolution (sample of ${SAMPLE})`);
const sampled = await q(
  `*[_type=="toyReview"] | order(_id)[0...${SAMPLE}]{"slug":slug.current, affiliateLinks, mainImage}`
);

const imageUrl = (ref) => {
  // asset._ref looks like image-<hash>-<w>x<h>-<ext>
  const m = /^image-([a-f0-9]+)-(\d+x\d+)-(\w+)$/.exec(ref || "");
  if (!m) return null;
  return `https://cdn.sanity.io/images/${PROJECT_ID}/${DATASET}/${m[1]}-${m[2]}.${m[3]}`;
};

let linkBad = 0;
let imgBad = 0;
for (const r of sampled) {
  for (const link of r.affiliateLinks ?? []) {
    try {
      const res = await fetch(link.url, {
        method: "GET",
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SafeNest-audit)" },
      });
      // Amazon answers bots with 503/captcha; only a hard 404 is conclusive.
      if (res.status === 404) {
        note("BUG", `affiliate 404: ${r.slug} -> ${link.url}`);
        linkBad++;
      }
    } catch (e) {
      note("WARN", `affiliate unreachable: ${r.slug} -> ${link.url} (${e.message})`);
    }
  }
  const url = imageUrl(r.mainImage?.asset?._ref);
  if (r.mainImage && !url) {
    note("WARN", `unparseable image ref: ${r.slug}`);
    continue;
  }
  if (url) {
    const res = await fetch(url, { method: "HEAD" });
    const type = res.headers.get("content-type") || "";
    const len = Number(res.headers.get("content-length") || 0);
    if (!res.ok || !type.startsWith("image/") || len < 1000) {
      note("BUG", `image not real bytes: ${r.slug} -> ${res.status} ${type} ${len}B`);
      imgBad++;
    }
  }
}
if (linkBad === 0) console.log("  ok    no affiliate link returned a hard 404");
if (imgBad === 0) console.log("  ok    every sampled image returned real image bytes");

// ── Summary ──────────────────────────────────────────────────────────────────
const bugs = findings.filter((f) => f.severity === "BUG").length;
const warns = findings.filter((f) => f.severity === "WARN").length;
console.log(`\n${bugs === 0 ? "no bugs found" : bugs + " bug(s)"}, ${warns} warning(s)`);
process.exit(bugs === 0 ? 0 : 1);
