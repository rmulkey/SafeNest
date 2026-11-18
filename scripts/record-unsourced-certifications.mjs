/**
 * Record, truthfully, that 132 reviews' certification claims have no source.
 *
 * WHAT IS WRONG
 * The seed scripts wrote certification lists as literals —
 * `certifications: ['ASTM F963', 'CPSIA compliant', 'EN-71']` in
 * scripts/seed-sanity.mjs and its siblings — with nothing recording where any of
 * it came from. 126 reviews assert ASTM F963 and 122 assert CPSIA on that basis.
 * The review page then renders each one as "Manufacturer reports compliance
 * with ASTM F963", which states a fact nobody established: that the
 * manufacturer made the claim.
 *
 * The project's data-integrity rule is explicit that certifications may only be
 * stored when they come from a verifiable source, and that a gap must never be
 * filled silently. This is that gap, already filled, and it has to be either
 * verified or declared.
 *
 * WHAT THIS DOES
 * Declares it. Each claim gets a certificationEvidence entry with status
 * "no_evidence_found" and no sourceUrl, because inventing a source is the
 * original error repeated. factorEvidence.certificationPresence is set to the
 * same, so the evidence breakdown caps that factor at 50 and the page's
 * confidence rating reflects what is actually known. The rendered claim becomes
 * "ASTM F963 (no source on file)".
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 * It does not delete the claims, and it does not touch safetyScore,
 * certificationPresence (the number), or any other factor. Dropping the claims
 * would move the stored score by a mean of -6.5 points across 132 reviews and
 * reorder every roundup and guide on the site; that is a judgement call for the
 * operator, not a side effect of recording provenance. The two reviews with real
 * recorded sources are untouched, as are the 14 with no claims at all.
 *
 * Usage:
 *   node scripts/record-unsourced-certifications.mjs --dry-run
 *   SANITY_API_TOKEN="..." node scripts/record-unsourced-certifications.mjs
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

const slugKey = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

const rows = await client.fetch(
  `*[_type == "toyReview" && count(certifications) > 0]{
     _id, "slug": slug.current, certifications, certificationEvidence,
     factorEvidence, safetyScore, certificationPresence
   } | order(slug asc)`
);

// Only claims with nothing recorded. A review that already names a source — the
// two retailer-reported ones from the 2026-09 batch — is left exactly as it is.
const targets = rows.filter(
  (r) => !r.certificationEvidence || r.certificationEvidence.length === 0
);
const alreadySourced = rows.length - targets.length;

console.log(`${rows.length} reviews carry certification claims`);
console.log(`  already have a recorded source : ${alreadySourced} (untouched)`);
console.log(`  no source recorded             : ${targets.length}\n`);

const claimCounts = {};
for (const r of targets) for (const c of r.certifications) claimCounts[c] = (claimCounts[c] || 0) + 1;
console.log("claims about to be marked as having no source on file:");
for (const [c, n] of Object.entries(claimCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
  console.log(`  ${String(n).padStart(4)}  ${c}`);
}

console.log("\nper-review change (first 6):");
for (const r of targets.slice(0, 6)) {
  const fe = r.factorEvidence || {};
  console.log(`  ${r.slug.slice(0, 50).padEnd(50)} certs=${r.certifications.length}`);
  console.log(
    `      factorEvidence.certificationPresence: ${fe.certificationPresence ?? "(unset)"} -> no_evidence_found`
  );
  console.log(
    `      safetyScore ${r.safetyScore} -> ${r.safetyScore} (unchanged, by design)`
  );
}

if (DRY_RUN) {
  console.log("\nDRY RUN — nothing written.");
  process.exit(0);
}

// Chunked so a large transaction cannot time out mid-run.
const CHUNK = 40;
let written = 0;
for (let i = 0; i < targets.length; i += CHUNK) {
  let tx = client.transaction();
  for (const r of targets.slice(i, i + CHUNK)) {
    tx = tx.patch(r._id, {
      set: {
        certificationEvidence: r.certifications.map((c, n) => ({
          _key: slugKey(c) || `cert-${n}`,
          certification: c,
          status: "no_evidence_found",
          // No sourceUrl. There is no source; inventing one is the original bug.
        })),
        // Merge rather than replace, so a factor recorded elsewhere survives.
        factorEvidence: {
          ...(r.factorEvidence || {}),
          certificationPresence: "no_evidence_found",
        },
      },
    });
  }
  await tx.commit();
  written += Math.min(CHUNK, targets.length - i);
  console.log(`  committed ${written}/${targets.length}`);
}
console.log(`\nrecorded provenance on ${written} review(s). No scores changed.`);
