/**
 * Run the CPSC recall sync once from the command line.
 *
 * Mirrors what /api/cron/sync-recalls does, for local verification and for
 * operators without the cron secret handy.
 *
 * Usage:
 *   SANITY_API_TOKEN="..." node scripts/sync-recalls-once.mjs --dry-run
 *   SANITY_API_TOKEN="..." node scripts/sync-recalls-once.mjs
 *   SANITY_API_TOKEN="..." node scripts/sync-recalls-once.mjs --lookback 365
 */
import { createClient } from "@sanity/client";
// Requires the tsx loader so the TypeScript sync module can be imported:
//   node --import tsx scripts/sync-recalls-once.mjs --dry-run
const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const lookbackIdx = argv.indexOf("--lookback");
const lookbackDays =
  lookbackIdx !== -1 ? Number(argv[lookbackIdx + 1]) : undefined;
const all = argv.includes("--all");

if (!dryRun && !process.env.SANITY_API_TOKEN) {
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

const { syncRecalls } = await import("../src/lib/recalls/sync.ts");

console.log(
  `Running CPSC recall sync${dryRun ? " (DRY RUN — no writes)" : ""}` +
    `${lookbackDays ? `, lookback ${lookbackDays}d` : ""}` +
    `${all ? ", including non-child products" : ""}...\n`
);

const outcome = await syncRecalls(client, {
  dryRun,
  childProductsOnly: !all,
  ...(Number.isFinite(lookbackDays) && lookbackDays > 0 ? { lookbackDays } : {}),
});

console.log(JSON.stringify(outcome, null, 2));
console.log(
  outcome.ok
    ? "\n✅ sync completed with no failed windows"
    : "\n❌ sync did NOT fully succeed — freshness timestamp not advanced"
);
process.exit(outcome.ok ? 0 : 1);
