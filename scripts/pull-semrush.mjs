#!/usr/bin/env node
/**
 * Pull every relevant Semrush report and save the raw response under seo/data/.
 *
 * Raw, not summarised: the point of the baseline is that a later reader can
 * re-derive every number rather than trust a paraphrase. Each file gets a header
 * recording the report name, parameters and fetch time, because a CSV of
 * positions is meaningless without knowing which database and date produced it.
 *
 * Everything goes through the MCP server. The REST APIs are not an option for
 * this key: v4 answers 403 and v3 answers ERROR 120 WRONG KEY - ID PAIR, while
 * the same key authenticates at mcp.semrush.com with an `Authorization: Apikey`
 * header. MCP also carries read-only Projects API v3, which is the only channel
 * exposing Site Audit and Position Tracking.
 *
 * Reports answer in semicolon-delimited CSV or JSON depending on the toolkit;
 * both are written through untouched.
 *
 * Usage:
 *   set -a; . ./.env.local; set +a
 *   node scripts/pull-semrush.mjs
 *   node scripts/pull-semrush.mjs --only=site_audit,organic
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { callTool } from "./semrush-mcp.mjs";

const OUT = "seo/data";
const DOMAIN = "safenesttoys.com";
const DB = "us";
const PROJECT_ID = Number(process.env.SEMRUSH_PROJECT_ID || 30424632);
const STAMP = new Date().toISOString();

const only = (process.argv.find((a) => a.startsWith("--only=")) || "")
  .replace("--only=", "")
  .split(",")
  .filter(Boolean);

mkdirSync(OUT, { recursive: true });

/**
 * Each entry: [group, filename, report, params].
 * Grouped so --only can skip a whole family when iterating.
 */
const PULLS = [
  // ─── Domain-level ─────────────────────────────────────────────────────────
  // export_columns must be an array; a comma string is rejected with
  // "cannot unmarshal string into Go struct field .alias.export_columns".
  // `target` (not `domain`) and long-form column names; the short Semrush v3
  // codes (Db, Dn, Rk...) are rejected by this endpoint.
  ["overview", "domain-overview.csv", "domain_ranks", {
    target: DOMAIN, database: DB,
    export_columns: [
      "database", "domain", "rank", "organic_keywords", "organic_traffic",
      "organic_traffic_cost", "paid_keywords", "paid_traffic",
    ],
  }],

  // ─── Organic ──────────────────────────────────────────────────────────────
  ["organic", "organic-positions.csv", "resource_organic", {
    target: DOMAIN, database: DB, display_limit: 500, display_sort: "position_asc",
  }],
  ["organic", "organic-pages.csv", "resource_organic_unique", {
    target: DOMAIN, database: DB, display_limit: 200, display_sort: "traffic_desc",
  }],
  ["organic", "organic-positions-new.csv", "resource_organic", {
    target: DOMAIN, database: DB, display_limit: 200,
    display_positions: "new", display_sort: "position_asc",
  }],
  ["organic", "organic-positions-lost.csv", "resource_organic", {
    target: DOMAIN, database: DB, display_limit: 200,
    display_positions: "lost", display_sort: "position_asc",
  }],

  // ─── Competitors ──────────────────────────────────────────────────────────
  // This report takes `domain`, not `target` — passing `target` fails with
  // "parameter 'domain' is required".
  ["competitors", "organic-competitors.csv", "domain_organic_organic", {
    domain: DOMAIN, database: DB, display_limit: 60,
  }],

  // ─── Backlinks ────────────────────────────────────────────────────────────
  ["backlinks", "backlinks-overview.csv", "backlinks_overview", {
    target: DOMAIN, target_type: "root_domain",
  }],
  ["backlinks", "referring-domains.csv", "backlinks_refdomains", {
    target: DOMAIN, target_type: "root_domain", display_limit: 200,
  }],
  ["backlinks", "backlinks.csv", "backlinks", {
    target: DOMAIN, target_type: "root_domain", display_limit: 200,
  }],
  ["backlinks", "backlink-anchors.csv", "backlinks_anchors", {
    target: DOMAIN, target_type: "root_domain", display_limit: 100,
  }],

  // ─── Site Audit (Projects API v3, read-only via MCP) ──────────────────────
  ["site_audit", "site-audit-info.json", "info", { id: PROJECT_ID }],
  ["site_audit", "site-audit-snapshots.json", "snapshots", { id: PROJECT_ID }],
  ["site_audit", "site-audit-meta-issues.json", "meta_issues", { id: PROJECT_ID }],

  // ─── Position Tracking ────────────────────────────────────────────────────
  ["tracking", "tracking-campaigns.json", "campaigns", { project_id: PROJECT_ID }],
  ["tracking", "tracking-positions.csv", "tracking_position_organic", {
    campaign_id: String(PROJECT_ID), url: "www.safenesttoys.com", display_limit: 200,
  }],
  ["tracking", "tracking-visibility.csv", "tracking_visibility_organic", {
    campaign_id: String(PROJECT_ID), url: "www.safenesttoys.com",
  }],
  ["tracking", "tracking-landing-pages.csv", "tracking_landing_pages_organic", {
    campaign_id: String(PROJECT_ID), url: "www.safenesttoys.com", display_limit: 100,
  }],
];

const results = [];

async function pull([group, file, report, params]) {
  if (only.length && !only.includes(group)) return;
  const label = `${group}/${file}`;
  try {
    const out = await callTool("execute_report", { report, params });
    const body = typeof out === "string" ? out : JSON.stringify(out, null, 2);
    const header =
      `# Semrush report: ${report}\n` +
      `# params: ${JSON.stringify(params)}\n` +
      `# fetched: ${STAMP}\n` +
      `# via: mcp.semrush.com/v2/mcp (Authorization: Apikey)\n`;
    // JSON files must stay parseable, so the header goes to a sidecar.
    if (file.endsWith(".json")) {
      writeFileSync(`${OUT}/${file}`, body);
      writeFileSync(`${OUT}/${file}.meta`, header);
    } else {
      writeFileSync(`${OUT}/${file}`, header + body);
    }
    const rows = body.split("\n").filter(Boolean).length;
    results.push({ label, report, ok: true, rows });
    console.log(`  ok    ${label.padEnd(42)} ${rows} line(s)`);
  } catch (err) {
    const msg = String(err.message || err).split("\n")[0].slice(0, 150);
    // ERROR 50 NOTHING FOUND means the query was valid and matched nothing —
    // "no keywords were lost this period" is a real answer worth recording, not
    // a broken call.
    if (/NOTHING FOUND/i.test(msg)) {
      writeFileSync(`${OUT}/${file}`, `# Semrush report: ${report}\n# params: ${JSON.stringify(params)}\n# fetched: ${STAMP}\n# result: empty (ERROR 50 NOTHING FOUND)\n`);
      results.push({ label, report, ok: true, rows: 0, empty: true });
      console.log(`  ok    ${label.padEnd(42)} empty result set`);
      return;
    }
    results.push({ label, report, ok: false, error: msg });
    console.log(`  FAIL  ${label.padEnd(42)} ${msg}`);
  }
}

console.log(`pulling Semrush data for ${DOMAIN} (database=${DB}, project=${PROJECT_ID})`);
console.log(`fetched at ${STAMP}\n`);

for (const p of PULLS) {
  await pull(p);
}

const manifest = {
  domain: DOMAIN,
  database: DB,
  projectId: PROJECT_ID,
  fetchedAt: STAMP,
  endpoint: "https://mcp.semrush.com/v2/mcp",
  auth: "Authorization: Apikey (SEMRUSH_API_KEY)",
  note:
    "Semrush organic traffic and volume figures are modelled estimates, not " +
    "measured. No Google Search Console or GA4 data is available in this repo " +
    "or environment (NEXT_PUBLIC_GA4_MEASUREMENT_ID and NEXT_PUBLIC_POSTHOG_KEY " +
    "are both empty), so nothing first-party overrides them.",
  pulls: results,
};
writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 2));

const ok = results.filter((r) => r.ok).length;
console.log(`\n${ok}/${results.length} report(s) saved to ${OUT}/`);
console.log(`manifest: ${OUT}/manifest.json`);
process.exit(results.some((r) => !r.ok) ? 1 : 0);
