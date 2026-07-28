/**
 * Repair blog post metadata.
 *
 * 1. FABRICATED BYLINE. "choosing-safe-first-toys" was published under
 *    "Dr. Maya Ellsworth, Child Product Safety Specialist" — an invented
 *    credentialed expert. Presenting a fabricated author as real violates this
 *    project's data-integrity rules and is a genuine E-E-A-T/liability risk on
 *    health-adjacent content. Reassigned to the real site owners. The article's
 *    editorial content is unchanged; only the false attribution is removed.
 *
 * 2. MISSING AUTHORS. The four auto-generated roundups had no author at all.
 *    Set to the real site byline.
 *
 * 3. DUPLICATE TITLES. A topic-rotation bug (see pickTopic in
 *    src/lib/catalog/generate-blog-post.ts) meant only Building and Educational
 *    roundups ever generated, producing pairs of posts with byte-identical
 *    titles that compete with each other in search. The generator is fixed
 *    going forward; this backfills the existing four with month-stamped titles
 *    so each is distinct.
 *
 * Run: SANITY_API_TOKEN="..." node scripts/fix-blog-metadata.mjs
 */
import { createClient } from "@sanity/client";

const client = createClient({
  projectId: "ofvgjgsi",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

const REAL_AUTHOR = "Rodrigo & Vanessa Mulkey";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

async function main() {
  // ── 1. Remove the fabricated credentialed byline ────────────────────────────
  const fabricated = await client.fetch(
    `*[_type=="blogPost" && slug.current=="choosing-safe-first-toys"][0]{_id, title, author}`
  );
  if (fabricated) {
    if (fabricated.author === REAL_AUTHOR) {
      console.log("• byline already corrected, skipping");
    } else {
      console.log(`• replacing fabricated byline: "${fabricated.author}"`);
      await client.patch(fabricated._id).set({ author: REAL_AUTHOR }).commit();
      console.log(`  -> "${REAL_AUTHOR}"`);
    }
  }

  // ── 2 & 3. Author + distinct titles for the auto-generated roundups ─────────
  const autos = await client.fetch(
    `*[_type=="blogPost" && slug.current match "top-child-safe-*"]{_id, title, "slug": slug.current, author, publishedAt}
     | order(publishedAt asc)`
  );

  for (const p of autos) {
    const patch = {};
    if (!p.author) patch.author = REAL_AUTHOR;

    // Month-stamp the title if it still uses the old "... in YYYY" form.
    const m = p.title.match(/^Top (\d+) Child-Safe (.+) in (\d{4})$/);
    if (m && p.publishedAt) {
      const [, count, label, year] = m;
      const d = new Date(p.publishedAt);
      patch.title = `Top ${count} Child-Safe ${label} (${MONTHS[d.getMonth()]} ${year})`;
    }

    if (Object.keys(patch).length === 0) {
      console.log(`• ${p.slug}: nothing to change`);
      continue;
    }
    await client.patch(p._id).set(patch).commit();
    console.log(`• ${p.slug}`);
    if (patch.author) console.log(`    author -> ${patch.author}`);
    if (patch.title) console.log(`    title  -> ${patch.title}`);
  }

  // ── Verify no duplicate titles remain ───────────────────────────────────────
  const all = await client.fetch(`*[_type=="blogPost"]{title}`);
  const counts = {};
  all.forEach((p) => (counts[p.title] = (counts[p.title] || 0) + 1));
  const dups = Object.entries(counts).filter(([, n]) => n > 1);
  console.log(
    dups.length
      ? `\n⚠ remaining duplicate titles: ${JSON.stringify(dups)}`
      : "\n✅ no duplicate blog titles remain"
  );

  const noAuthor = await client.fetch(
    `count(*[_type=="blogPost" && !defined(author)])`
  );
  console.log(`✅ posts missing an author: ${noAuthor}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
