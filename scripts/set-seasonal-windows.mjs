/**
 * Tag seasonal posts with their annually recurring relevance window.
 *
 * Seasonal posts keep their URL, publish date, and sitemap entry permanently —
 * the window only controls whether they get FEATURED at the top of /blog. Each
 * window recurs every year, so these posts resurface automatically each season
 * with no further intervention.
 *
 * Run: SANITY_API_TOKEN="..." node scripts/set-seasonal-windows.mjs
 */
import { createClient } from "@sanity/client";

const client = createClient({
  projectId: "ofvgjgsi",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

/** slug -> { startMonthDay, endMonthDay } (MM-DD, inclusive, recurs yearly) */
const WINDOWS = {
  // Ramps up mid-June, ends the day after the holiday.
  "top-7-toys-safe-fourth-of-july": {
    startMonthDay: "06-15",
    endMonthDay: "07-05",
  },
};

async function main() {
  for (const [slug, seasonal] of Object.entries(WINDOWS)) {
    const doc = await client.fetch(
      `*[_type=="blogPost" && slug.current==$slug][0]{_id, title}`,
      { slug }
    );
    if (!doc) {
      console.error(`✗ no post found for slug "${slug}" — skipping (not inventing one)`);
      process.exitCode = 1;
      continue;
    }
    await client.patch(doc._id).set({ seasonal }).commit();
    console.log(
      `✓ ${slug}\n    window ${seasonal.startMonthDay} → ${seasonal.endMonthDay}  (${doc.title})`
    );
  }

  const tagged = await client.fetch(
    `*[_type=="blogPost" && defined(seasonal.startMonthDay)]{"slug":slug.current, seasonal}`
  );
  console.log(`\nSeasonal posts now tagged: ${tagged.length}`);
  tagged.forEach((t) =>
    console.log(`  ${t.slug}: ${t.seasonal.startMonthDay} → ${t.seasonal.endMonthDay}`)
  );
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
