/**
 * Backfill month-stamped excerpts on the auto-generated roundup posts.
 *
 * The excerpt becomes the page's meta description. Because the generator used to
 * emit "...in {year}", the two Building roundups and the two Educational
 * roundups shipped byte-identical meta descriptions, which competes with itself
 * in search. The generator now stamps the month (see generate-blog-post.ts);
 * this repairs the four already published.
 *
 * Run: SANITY_API_TOKEN="..." node scripts/fix-roundup-excerpts.mjs
 */
import { createClient } from "@sanity/client";

const client = createClient({
  projectId: "ofvgjgsi",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

async function main() {
  const posts = await client.fetch(
    `*[_type=="blogPost" && slug.current match "top-child-safe-*"]{_id,"slug":slug.current,excerpt,publishedAt}
     | order(publishedAt asc)`
  );

  for (const p of posts) {
    if (!p.excerpt || !p.publishedAt) continue;
    const d = new Date(p.publishedAt);
    const period = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    // Rewrite "...<label> in <year>," -> "...<label> as of <Month Year>,"
    const next = p.excerpt.replace(/\bin \d{4},/, `as of ${period},`);
    if (next === p.excerpt) {
      console.log(`• ${p.slug}: already stamped or pattern absent`);
      continue;
    }
    await client.patch(p._id).set({ excerpt: next }).commit();
    console.log(`✓ ${p.slug}\n    ${next}`);
  }

  // Verify no duplicate excerpts remain across the whole blog.
  const all = await client.fetch(`*[_type=="blogPost" && defined(excerpt)]{excerpt}`);
  const counts = {};
  all.forEach((p) => (counts[p.excerpt] = (counts[p.excerpt] || 0) + 1));
  const dups = Object.entries(counts).filter(([, n]) => n > 1);
  console.log(
    dups.length
      ? `\n⚠ duplicate excerpts remain: ${dups.map(([e, n]) => `x${n} "${e.slice(0, 50)}"`).join("; ")}`
      : "\n✅ no duplicate excerpts (meta descriptions) remain"
  );
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
