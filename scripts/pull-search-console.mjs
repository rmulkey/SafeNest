#!/usr/bin/env node
/**
 * Pull Search Console Performance data via the API and save it to gsc/.
 *
 * This replaces the browser approach, which does not work. Driving the user's
 * signed-in Chrome profile is blocked by Chrome itself: since Chrome 136 remote
 * debugging is refused on the default user-data-dir, and that restriction covers
 * the `--remote-debugging-pipe` transport Playwright uses, not just the port.
 * Verified on Chrome 151 — Chrome launches and the CDP handshake never completes,
 * timing out identically at 180s and at 600s.
 *
 * A service account is the durable answer anyway. It needs no OAuth redirect, no
 * browser, no session that expires, and it turns the export into something that
 * can run on a schedule rather than a thing somebody remembers to do.
 *
 * SETUP (once, by the property owner):
 *   1. Google Cloud console -> create or pick a project.
 *   2. Enable the "Google Search Console API".
 *   3. IAM -> Service Accounts -> create one. No project roles are needed; its
 *      access comes from Search Console, not from IAM.
 *   4. On that service account, Keys -> Add key -> JSON. Download it.
 *   5. Search Console -> Settings -> Users and permissions -> Add user. Paste the
 *      service account's email (…iam.gserviceaccount.com). "Restricted" is
 *      enough — this only reads.
 *   6. Save the JSON somewhere gitignored and point GSC_SERVICE_ACCOUNT_KEY at it:
 *        echo 'GSC_SERVICE_ACCOUNT_KEY=./gsc/service-account.json' >> .env.local
 *
 * Then:
 *   set -a; . ./.env.local; set +a
 *   node scripts/pull-search-console.mjs
 *
 * Signs its own JWT with node:crypto, so there are no new dependencies.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createSign } from "node:crypto";

const SITE = process.env.GSC_SITE_URL || "sc-domain:safenesttoys.com";
const KEY_PATH = process.env.GSC_SERVICE_ACCOUNT_KEY;
const OUT = "gsc";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
/** Search Console retains 16 months. Anything less silently truncates the baseline. */
const MONTHS = Number(process.env.GSC_MONTHS || 16);
const ROW_LIMIT = 25000;

if (!KEY_PATH) {
  console.error(
    "GSC_SERVICE_ACCOUNT_KEY is not set.\n\n" +
      "This needs a service account with read access to the Search Console\n" +
      "property. Setup steps are in the header of this file — about five minutes,\n" +
      "once, and then this runs unattended forever.\n\n" +
      "The browser route is not an option: Chrome refuses remote debugging on the\n" +
      "default profile (verified on Chrome 151), so the signed-in session cannot\n" +
      "be driven."
  );
  process.exit(2);
}

const key = JSON.parse(readFileSync(KEY_PATH, "utf8"));
if (!key.client_email || !key.private_key) {
  console.error(`${KEY_PATH} is not a service-account JSON key`);
  process.exit(2);
}

const b64url = (buf) =>
  Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** Mint a signed JWT and exchange it for an access token. */
async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: key.client_email,
      scope: SCOPE,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const assertion = `${header}.${claims}.${b64url(signer.sign(key.private_key))}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`token exchange failed: ${res.status} ${JSON.stringify(body).slice(0, 300)}`);
  }
  return body.access_token;
}

function dateRange() {
  const end = new Date();
  // Search Console data lags roughly two days; asking for today returns zeros
  // and makes the most recent period look like a collapse.
  end.setDate(end.getDate() - 3);
  const start = new Date(end);
  start.setMonth(start.getMonth() - MONTHS);
  const iso = (d) => d.toISOString().slice(0, 10);
  return { startDate: iso(start), endDate: iso(end) };
}

async function query(token, dimensions, extra = {}) {
  const { startDate, endDate } = dateRange();
  const rows = [];
  let startRow = 0;
  // Paginate: a 16-month window on a site with any history exceeds one page.
  for (;;) {
    const res = await fetch(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
        SITE
      )}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions,
          rowLimit: ROW_LIMIT,
          startRow,
          ...extra,
        }),
      }
    );
    const body = await res.json();
    if (!res.ok) {
      throw new Error(
        `${dimensions.join("+")} failed: ${res.status} ${JSON.stringify(body).slice(0, 300)}`
      );
    }
    const batch = body.rows ?? [];
    rows.push(...batch);
    if (batch.length < ROW_LIMIT) break;
    startRow += batch.length;
  }
  return { rows, startDate, endDate };
}

const esc = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function writeCsv(file, dimensions, rows, meta) {
  const header = [...dimensions, "clicks", "impressions", "ctr", "position"];
  const lines = [
    `# Google Search Console searchAnalytics.query`,
    `# site: ${SITE}`,
    `# dimensions: ${dimensions.join(", ")}`,
    `# range: ${meta.startDate} to ${meta.endDate}`,
    `# fetched: ${new Date().toISOString()}`,
    `# rows: ${rows.length}`,
    header.join(","),
    ...rows.map((r) =>
      [
        ...r.keys.map(esc),
        r.clicks,
        r.impressions,
        (r.ctr ?? 0).toFixed(5),
        (r.position ?? 0).toFixed(2),
      ].join(",")
    ),
  ];
  writeFileSync(`${OUT}/${file}`, lines.join("\n") + "\n");
}

mkdirSync(OUT, { recursive: true });

const token = await accessToken();
const { startDate, endDate } = dateRange();
console.log(`Search Console: ${SITE}`);
console.log(`range: ${startDate} to ${endDate} (${MONTHS} months)\n`);

const PULLS = [
  ["queries.csv", ["query"]],
  ["pages.csv", ["page"]],
  ["query-page.csv", ["query", "page"]],
  ["dates.csv", ["date"]],
  ["devices.csv", ["device"]],
  ["countries.csv", ["country"]],
];

const summary = [];
for (const [file, dimensions] of PULLS) {
  try {
    const { rows, ...meta } = await query(token, dimensions);
    writeCsv(file, dimensions, rows, meta);
    const clicks = rows.reduce((s, r) => s + (r.clicks ?? 0), 0);
    const impressions = rows.reduce((s, r) => s + (r.impressions ?? 0), 0);
    summary.push({ file, rows: rows.length, clicks, impressions });
    console.log(
      `  ok    ${file.padEnd(18)} ${String(rows.length).padStart(6)} rows  ` +
        `${clicks} clicks  ${impressions} impressions`
    );
  } catch (err) {
    console.log(`  FAIL  ${file.padEnd(18)} ${String(err.message).slice(0, 140)}`);
  }
}

writeFileSync(
  `${OUT}/manifest.json`,
  JSON.stringify(
    {
      site: SITE,
      startDate,
      endDate,
      months: MONTHS,
      fetchedAt: new Date().toISOString(),
      api: "searchconsole.googleapis.com/webmasters/v3 searchAnalytics.query",
      auth: "service account JWT (GSC_SERVICE_ACCOUNT_KEY)",
      note:
        "First-party and authoritative. Where these figures disagree with the " +
        "modelled Semrush numbers in seo/, these win — see seo/baseline.md §1.",
      pulls: summary,
    },
    null,
    2
  )
);

console.log(`\nwrote ${summary.length} file(s) to ${OUT}/`);
if (summary.length) {
  const totalClicks = Math.max(...summary.map((s) => s.clicks));
  const totalImpr = Math.max(...summary.map((s) => s.impressions));
  console.log(`totals over the window: ${totalClicks} clicks, ${totalImpr} impressions`);
  if (totalImpr === 0) {
    console.log(
      "\nZero impressions across 16 months. That is a discovery problem, not a " +
        "ranking one — check Search Console > Indexing > Pages for how many URLs " +
        "are actually indexed."
    );
  }
}
