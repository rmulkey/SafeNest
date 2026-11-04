/**
 * Compare one page's Search Console performance across two adjacent windows.
 *
 * pull-search-console.mjs reports a single 16-month window, which is useless for
 * answering "did that edit help?" — a page's 16-month average is dominated by
 * whatever it was before the edit. This asks the narrower question: how did this
 * URL do in the N days before and after a date.
 *
 * Reuses the same service-account JWT as pull-search-console.mjs.
 *
 * Usage:
 *   node scripts/gsc-page-trend.mjs /guides/best-sensory-toys-babies
 *   node scripts/gsc-page-trend.mjs /guides/best-sensory-toys-babies --split 2026-10-01
 *   node scripts/gsc-page-trend.mjs /guides/best-sensory-toys-babies --days 28
 */
import crypto from "node:crypto";
import { readFileSync } from "node:fs";

const SITE = process.env.GSC_SITE_URL || "sc-domain:safenesttoys.com";
const argv = process.argv.slice(2);
const path = argv.find((a) => a.startsWith("/"));
if (!path) {
  console.error("Usage: node scripts/gsc-page-trend.mjs /some/path [--split YYYY-MM-DD] [--days N]");
  process.exit(1);
}
const splitIdx = argv.indexOf("--split");
const daysIdx = argv.indexOf("--days");
const days = daysIdx !== -1 ? Number(argv[daysIdx + 1]) : 28;

// GSC_SERVICE_ACCOUNT_KEY is a path to the service-account JSON, not the key
// itself — same contract as pull-search-console.mjs.
const KEY_PATH = process.env.GSC_SERVICE_ACCOUNT_KEY;
if (!KEY_PATH) {
  console.error("GSC_SERVICE_ACCOUNT_KEY is not set (path to the service-account JSON).");
  process.exit(1);
}
const sa = JSON.parse(readFileSync(KEY_PATH, "utf8"));
if (!sa.client_email || !sa.private_key) {
  console.error(`${KEY_PATH} is not a service-account key (no client_email/private_key).`);
  process.exit(1);
}

const b64url = (s) =>
  Buffer.from(s).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function token() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    })
  );
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const sig = b64url(signer.sign(sa.private_key));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claim}.${sig}`,
    }),
  });
  const j = await res.json();
  if (!j.access_token) throw new Error(`token: ${JSON.stringify(j)}`);
  return j.access_token;
}

const t = await token();

async function query(startDate, endDate) {
  const res = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ["page"],
        // Matching on the path covers both the apex and the www host, which
        // Search Console still reports separately for older impressions.
        dimensionFilterGroups: [
          { filters: [{ dimension: "page", operator: "contains", expression: path }] },
        ],
        rowLimit: 25,
      }),
    }
  );
  const j = await res.json();
  if (j.error) throw new Error(JSON.stringify(j.error));
  return j.rows || [];
}

function fmt(rows) {
  const clicks = rows.reduce((s, r) => s + r.clicks, 0);
  const impressions = rows.reduce((s, r) => s + r.impressions, 0);
  // Impression-weighted average position; a plain mean over hosts would be wrong.
  const pos = impressions
    ? rows.reduce((s, r) => s + r.position * r.impressions, 0) / impressions
    : 0;
  return { clicks, impressions, pos, hosts: rows.length };
}

const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);

let afterStart, afterEnd, beforeStart, beforeEnd;
if (splitIdx !== -1) {
  const split = new Date(`${argv[splitIdx + 1]}T00:00:00Z`);
  afterStart = split;
  afterEnd = addDays(split, days - 1);
  beforeEnd = addDays(split, -1);
  beforeStart = addDays(beforeEnd, -(days - 1));
} else {
  // Search Console lags ~2 days.
  afterEnd = addDays(new Date(), -2);
  afterStart = addDays(afterEnd, -(days - 1));
  beforeEnd = addDays(afterStart, -1);
  beforeStart = addDays(beforeEnd, -(days - 1));
}

const [before, after] = [
  fmt(await query(iso(beforeStart), iso(beforeEnd))),
  fmt(await query(iso(afterStart), iso(afterEnd))),
];

console.log(`page: ${path}`);
console.log(`site: ${SITE}\n`);
const row = (label, s, e, m) =>
  console.log(
    `  ${label} ${iso(s)}..${iso(e)}  ${String(m.clicks).padStart(4)} clicks  ` +
      `${String(m.impressions).padStart(6)} impr  pos ${m.pos ? m.pos.toFixed(1) : "-"}  (${m.hosts} host/url rows)`
  );
row("before", beforeStart, beforeEnd, before);
row("after ", afterStart, afterEnd, after);

const d = (a, b) => (b === 0 ? (a === 0 ? "0%" : "new") : `${(((a - b) / b) * 100).toFixed(0)}%`);
console.log(
  `\n  impressions ${d(after.impressions, before.impressions)} · clicks ${d(after.clicks, before.clicks)}` +
    (before.pos && after.pos
      ? ` · position ${(before.pos - after.pos).toFixed(1)} ${after.pos < before.pos ? "better" : "worse"}`
      : "")
);
