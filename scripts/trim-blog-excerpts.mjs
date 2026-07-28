/**
 * Rewrite over-long blog excerpts so they fit as meta descriptions (<=160 chars).
 *
 * The excerpt is used verbatim as the page meta description. Anything past ~160
 * characters is truncated in search results, so the closing value proposition
 * gets cut. These are rewritten (not machine-truncated) to keep them readable
 * and to preserve meaning.
 *
 * Also removes a residual claim of credentialed authorship from the
 * "choosing-safe-first-toys" excerpt: that post previously carried a fabricated
 * "Dr. Maya Ellsworth, Child Product Safety Specialist" byline which has since
 * been corrected to the real site owners. The excerpt still described itself as
 * "a child-safety specialist's framework", which keeps implying an expert author
 * the site does not actually have.
 *
 * Run: SANITY_API_TOKEN="..." node scripts/trim-blog-excerpts.mjs
 */
import { createClient } from "@sanity/client";

const client = createClient({
  projectId: "ofvgjgsi",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

const MAX = 160;

const REWRITES = {
  "button-batteries-and-magnets-toy-safety":
    "Button batteries and high-powered magnets are two of the most serious hazards in a home with small kids — how they cause harm, where they hide, what to do.",
  "choosing-safe-first-toys":
    "A practical framework for choosing safe, developmentally appropriate first toys — age grading, certifications, and the small-parts test every parent needs.",
  "how-to-read-toy-safety-labels":
    "Which toy-box symbols actually keep your child safe? A plain-English guide to certifications, age grading, choking hazards, materials, and recalls.",
  "top-7-child-safe-toys-2026":
    "The seven toys with the highest safety scores in our 2026 catalog — vetted by parents, scored out of 100, and checked against current recall data.",
  "top-7-toys-safe-fourth-of-july":
    "Seven outdoor and water toys to keep little ones cool, busy, and safe this Fourth of July — every pick independently safety-scored and recall-checked.",
};

async function main() {
  // Guard: never write an excerpt that would itself be too long.
  for (const [slug, text] of Object.entries(REWRITES)) {
    if (text.length > MAX) {
      console.error(`✗ refusing: rewrite for ${slug} is ${text.length} chars (> ${MAX})`);
      process.exit(1);
    }
  }

  for (const [slug, excerpt] of Object.entries(REWRITES)) {
    const doc = await client.fetch(
      `*[_type=="blogPost" && slug.current==$slug][0]{_id, excerpt}`,
      { slug }
    );
    if (!doc) {
      console.error(`✗ no post for slug "${slug}" — skipping`);
      process.exitCode = 1;
      continue;
    }
    if (doc.excerpt === excerpt) {
      console.log(`• ${slug}: already updated`);
      continue;
    }
    await client.patch(doc._id).set({ excerpt }).commit();
    console.log(`✓ ${slug}: ${doc.excerpt.length} -> ${excerpt.length} chars`);
  }

  const remaining = await client.fetch(
    `*[_type=="blogPost" && defined(excerpt) && length(excerpt) > ${MAX}]{"slug":slug.current,"len":length(excerpt)}`
  );
  console.log(
    remaining.length
      ? `\n⚠ still over ${MAX}: ${JSON.stringify(remaining)}`
      : `\n✅ all blog excerpts are <= ${MAX} chars`
  );
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
