/**
 * Re-run the recall matcher over the live catalogue and resolve the review queue.
 *
 * WHY THIS EXISTS
 * 192 candidates were sitting in `pending`, and almost none of them were leads.
 * The matcher treated any shared word as a "distinctive shared term", so
 * "Dresbe LED Christmas Headbands" was queued against "B. toys One Two Squeeze
 * Blocks" on the strength of "one" and "two", and 33 candidates rested on
 * "black" and "white". A queue that size does not get triaged, which is worse
 * than a smaller honest one: a real match sits in it unread.
 *
 * WHAT THIS DOES
 * Loads every review and every stored recall, re-runs the real matcher
 * (src/lib/recalls/match.ts, so there is one implementation and not a copy), and
 * compares the result against each pending candidate:
 *
 *   still matches        -> left pending, a human still decides
 *   no longer matches    -> dismissed, recording why and what it had rested on
 *   now confirmed        -> left pending and reported loudly; this script will
 *                           not publish a recall against a product by itself
 *
 * WHAT IT WILL NOT DO
 * It never sets hasActiveRecall and never publishes a match. Dismissal is only
 * ever applied to a pair the matcher no longer considers related at all — the
 * recall itself stays in the catalogue and on /recalls, so nothing is hidden
 * from readers. Confirming a match and dismissing a real one are both unsafe to
 * automate, so neither is automated here.
 *
 * Usage:
 *   node --import tsx scripts/retriage-recall-candidates.mjs --dry-run
 *   SANITY_API_TOKEN="..." node --import tsx scripts/retriage-recall-candidates.mjs
 */
import { createClient } from "@sanity/client";

const DRY_RUN = process.argv.includes("--dry-run");
if (!DRY_RUN && !process.env.SANITY_API_TOKEN) {
  console.error("SANITY_API_TOKEN is required for a write run.");
  process.exit(1);
}

const client = createClient({
  projectId: "ofvgjgsi",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

const { matchProductToRecall } = await import("../src/lib/recalls/match.ts");

const [reviews, recalls, pending] = await Promise.all([
  client.fetch(`*[_type == "toyReview"]{ _id, productName, brand }`),
  // recallAlert stores the CPSC record normalised, and has no `title` field —
  // the product is in `affectedProduct` and the narrative in `recallReason`.
  // Projecting a non-existent `title` produced an almost-empty haystack and made
  // every single candidate look like a no-match, which is a convincing way to
  // delete a real lead. The full CPSC title survives on the candidate itself as
  // `recallTitle`, so the haystack is rebuilt from both records.
  client.fetch(
    `*[_type == "recallAlert"]{
       "recallNumber": cpscRecallNumber,
       affectedProduct, recallReason, recommendedAction, hazards,
       manufacturers, affectedModels
     }`
  ),
  client.fetch(
    `*[_type == "recallMatchCandidate" && status == "pending"]{
       _id, recallNumber, recallTitle, matchScore, matchEvidence,
       "reviewId": review._ref
     }`
  ),
]);

console.log(
  `${reviews.length} reviews · ${recalls.length} stored recalls · ${pending.length} pending candidates\n`
);

const reviewById = new Map(reviews.map((r) => [r._id, r]));
const recallByNumber = new Map(
  recalls.filter((r) => r.recallNumber).map((r) => [String(r.recallNumber), r])
);

const keep = [];
const dismiss = [];
const promoted = [];
const orphaned = [];

for (const c of pending) {
  const review = reviewById.get(c.reviewId);
  const recall = recallByNumber.get(String(c.recallNumber));

  if (!review) {
    orphaned.push({ ...c, why: "the review it points at no longer exists" });
    continue;
  }
  if (!recall) {
    // Cannot re-evaluate without the recall record; leave it alone rather than
    // dismiss something on missing data.
    keep.push({ ...c, why: "recall record not found; left pending untouched" });
    continue;
  }

  const result = matchProductToRecall(
    { _id: review._id, productName: review.productName, brand: review.brand },
    {
      recallNumber: String(recall.recallNumber),
      // The candidate preserved the original CPSC title; the alert did not.
      title: c.recallTitle ?? recall.affectedProduct ?? "",
      description: [recall.recallReason, recall.recommendedAction, ...(recall.hazards ?? [])]
        .filter(Boolean)
        .join(" "),
      productNames: [recall.affectedProduct].filter(Boolean),
      manufacturers: recall.manufacturers ?? [],
      models: recall.affectedModels ?? [],
    }
  );

  if (result.confidence === "confirmed") {
    promoted.push({ ...c, review, result });
  } else if (result.confidence === "needs-review") {
    keep.push({ ...c, review, result, why: "still a lead" });
  } else {
    dismiss.push({ ...c, review, result });
  }
}

console.log(`still a lead (left pending) : ${keep.length}`);
console.log(`no longer a match (dismiss) : ${dismiss.length}`);
console.log(`now CONFIRMED (needs you)   : ${promoted.length}`);
console.log(`orphaned (review gone)      : ${orphaned.length}\n`);

if (promoted.length) {
  console.log("CONFIRMED — not published automatically, review these first:");
  for (const p of promoted) {
    console.log(`  ${p.review.productName}  <-  ${p.recallTitle?.slice(0, 80)}`);
    p.result.evidence.forEach((e) => console.log(`      ${e}`));
  }
  console.log();
}

if (keep.length) {
  console.log(`remaining leads for human triage (${keep.length}):`);
  for (const k of keep.slice(0, 15)) {
    const name = k.review?.productName ?? k.reviewId;
    console.log(`  ${name?.slice(0, 44).padEnd(44)} <- ${k.recallTitle?.slice(0, 62)}`);
  }
  if (keep.length > 15) console.log(`  ... and ${keep.length - 15} more`);
  console.log();
}

console.log(`sample of what gets dismissed (${Math.min(8, dismiss.length)} of ${dismiss.length}):`);
for (const d of dismiss.slice(0, 8)) {
  console.log(`  ${d.review.productName.slice(0, 40).padEnd(40)} <- ${d.recallTitle?.slice(0, 58)}`);
  console.log(`      was: ${(d.matchEvidence || []).join(" ").slice(0, 110)}`);
}

if (DRY_RUN) {
  console.log("\nDRY RUN — nothing written.");
  process.exit(0);
}

if (!dismiss.length && !orphaned.length) {
  console.log("\nnothing to write.");
  process.exit(0);
}

const now = new Date().toISOString();
let tx = client.transaction();
for (const d of dismiss) {
  tx = tx.patch(d._id, {
    set: {
      status: "dismissed",
      resolvedAt: now,
      resolutionNote:
        "Dismissed by scripts/retriage-recall-candidates.mjs: re-running the " +
        "matcher after generic words (numbers, colours, and vocabulary common " +
        "across this catalogue) stopped counting as distinctive terms left no " +
        "shared signal and no brand or model hit. Previous evidence was: " +
        (d.matchEvidence || []).join(" "),
    },
  });
}
for (const o of orphaned) {
  tx = tx.patch(o._id, {
    set: { status: "dismissed", resolvedAt: now, resolutionNote: o.why },
  });
}
await tx.commit();
console.log(`\ndismissed ${dismiss.length + orphaned.length}; ${keep.length} left pending.`);
