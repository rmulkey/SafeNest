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

/**
 * slug -> { startMonthDay, endMonthDay } (MM-DD, inclusive, recurs yearly)
 *
 * The holiday windows below all end on a fixed date rather than on the holiday,
 * because the holidays themselves move: US Thanksgiving is the fourth Thursday
 * of November and so falls anywhere from the 22nd to the 28th, which drags Black
 * Friday across the 23rd to the 29th and Cyber Monday across the 26th to
 * December 2nd. Each end date is the latest the occasion can reach, so the
 * window is correct in every year without being re-tagged.
 */
const WINDOWS = {
  // Ramps up mid-June, ends the day after the holiday.
  "top-7-toys-safe-fourth-of-july": {
    startMonthDay: "06-15",
    endMonthDay: "07-05",
  },
  // Deal season now starts well before the weekend itself. Ends 12-02, the
  // latest Cyber Monday (Thanksgiving on the 28th -> Friday 29th, Monday 2nd).
  "black-friday-toy-deals-recall-check": {
    startMonthDay: "11-01",
    endMonthDay: "12-02",
  },
  // Two or three weeks of travel planning, through the weekend after the latest
  // possible Thanksgiving.
  "thanksgiving-toy-safety-family-gatherings": {
    startMonthDay: "11-05",
    endMonthDay: "11-30",
  },
  // Opens with the gift-buying run-up and stays open through the week after
  // Christmas, when the new toys are in the house and the boxes are still around.
  "christmas-toy-safety-unwrapping-day": {
    startMonthDay: "11-15",
    endMonthDay: "12-28",
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
