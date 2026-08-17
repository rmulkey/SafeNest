#!/usr/bin/env node
/**
 * Check Amazon Creators API access.
 *
 * Two independent things can be wrong, and the failure modes look similar from
 * the outside, so this separates them:
 *
 *   1. Are the credentials valid?   -> can we mint a Login with Amazon token?
 *   2. Is the account entitled?     -> does a real catalog call return data?
 *
 * A credential can be perfectly correct and still get HTTP 403
 * AssociateNotEligible on every catalog call, because Amazon gates catalog
 * access on Associates sales volume rather than on the credential. Amazon's
 * Creators API docs state the requirement as at least 10 qualifying sales in the
 * past 30 days, and note that access is lost after a consecutive 30-day period
 * with no qualified referring sales. So this is worth re-running periodically
 * rather than assuming a one-time setup holds.
 *
 * Prints status and shapes only. Never prints the client secret or the access
 * token, so the output is safe to paste into an issue.
 *
 * Usage:
 *   set -a; . ./.env.local; set +a
 *   node scripts/check-amazon-creators.mjs
 *   node scripts/check-amazon-creators.mjs B00BWQMFHE B003BKCLUB   # specific ASINs
 */

const CLIENT_ID = process.env.AMAZON_CREATORS_CLIENT_ID;
const CLIENT_SECRET = process.env.AMAZON_CREATORS_CLIENT_SECRET;
const VERSION = process.env.AMAZON_CREATORS_CREDENTIAL_VERSION || "3.1";
const PARTNER_TAG = process.env.AMAZON_CREATORS_PARTNER_TAG;
const MARKETPLACE = process.env.AMAZON_CREATORS_MARKETPLACE || "www.amazon.com";

/** Token endpoint is selected by credential version, not by target marketplace. */
const TOKEN_ENDPOINTS = {
  "3.1": "https://api.amazon.com/auth/o2/token",
  "3.2": "https://api.amazon.co.uk/auth/o2/token",
  "3.3": "https://api.amazon.co.jp/auth/o2/token",
};

const API_BASE = "https://creatorsapi.amazon";

function requireEnv() {
  const missing = [];
  if (!CLIENT_ID) missing.push("AMAZON_CREATORS_CLIENT_ID");
  if (!CLIENT_SECRET) missing.push("AMAZON_CREATORS_CLIENT_SECRET");
  if (!PARTNER_TAG) missing.push("AMAZON_CREATORS_PARTNER_TAG");
  if (missing.length) {
    console.error(`Missing env: ${missing.join(", ")}`);
    console.error("Load them first:  set -a; . ./.env.local; set +a");
    process.exit(1);
  }
  const tokenUrl = TOKEN_ENDPOINTS[VERSION];
  if (!tokenUrl) {
    console.error(
      `Unknown AMAZON_CREATORS_CREDENTIAL_VERSION "${VERSION}". Expected 3.1, 3.2 or 3.3.`
    );
    process.exit(1);
  }
  return tokenUrl;
}

const tokenUrl = requireEnv();

// ── 1. Credentials ───────────────────────────────────────────────────────────
console.log("credentials");
console.log(`  version ${VERSION} -> ${tokenUrl}`);

const tokenRes = await fetch(tokenUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    grant_type: "client_credentials",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: "creatorsapi::default",
  }),
});

const rawToken = await tokenRes.text();
let token = null;
let parsed = null;
try {
  parsed = JSON.parse(rawToken);
} catch {
  /* handled below */
}

if (parsed?.access_token) {
  token = parsed.access_token;
  console.log(`  ok    token minted (HTTP ${tokenRes.status})`);
  console.log(`        scope ${parsed.scope}, type ${parsed.token_type}, expires in ${parsed.expires_in}s`);
  console.log("        cache and reuse this until it expires; do not re-fetch per call");
} else {
  // Error bodies from LwA contain no secret material.
  console.log(`  FAIL  HTTP ${tokenRes.status}`);
  console.log(`        ${rawToken.slice(0, 300)}`);
  console.log(
    "\nCredentials are wrong or revoked. Regenerate them in Associates Central\n" +
      "(Tools > Creators API) and update AMAZON_CREATORS_CLIENT_ID / _CLIENT_SECRET."
  );
  process.exit(1);
}

// ── 2. Entitlement ───────────────────────────────────────────────────────────
const asins = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["B00BWQMFHE", "B003BKCLUB"];

console.log("\ncatalog access");
console.log(`  partnerTag ${PARTNER_TAG} · marketplace ${MARKETPLACE}`);
console.log(`  getItems ${asins.join(", ")}`);

const apiRes = await fetch(`${API_BASE}/catalog/v1/getItems`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "x-marketplace": MARKETPLACE,
  },
  body: JSON.stringify({
    itemIds: asins,
    itemIdType: "ASIN",
    marketplace: MARKETPLACE,
    partnerTag: PARTNER_TAG,
    resources: [
      "images.primary.large",
      "itemInfo.title",
      "itemInfo.byLineInfo",
      "parentASIN",
    ],
  }),
});

const rawApi = await apiRes.text();
let api = null;
try {
  api = JSON.parse(rawApi);
} catch {
  /* handled below */
}

if (apiRes.status === 403 && api?.reason === "AssociateNotEligible") {
  console.log(`  BLOCKED  HTTP 403 AssociateNotEligible`);
  console.log(`           "${api.message}"`);
  console.log(
    "\nThe credentials are fine — the Associates account is not yet entitled to\n" +
      "catalog data. Amazon's Creators API docs put the bar at 10 qualifying sales\n" +
      "in the past 30 days, and access lapses after 30 consecutive days with no\n" +
      "qualified referring sales.\n\n" +
      "Until this clears, keep using the existing pipeline: Target's canonical\n" +
      "primary_image for photos and Amazon SEARCH urls for links. Do not switch\n" +
      "build-verified-queue.mjs over — the API returns no product data yet."
  );
  process.exit(2);
}

const items = api?.itemsResult?.items ?? [];
if (apiRes.ok && items.length > 0) {
  console.log(`  ok    HTTP ${apiRes.status}, ${items.length} item(s) returned`);
  for (const it of items) {
    console.log(`\n  ASIN ${it.asin}`);
    console.log(`    brand : ${it?.itemInfo?.byLineInfo?.brand?.displayValue ?? "—"}`);
    console.log(`    title : ${String(it?.itemInfo?.title?.displayValue ?? "—").slice(0, 90)}`);
    console.log(`    image : ${it?.images?.primary?.large?.url ?? "—"}`);
    console.log(`    link  : ${String(it.detailPageURL ?? "—").slice(0, 110)}`);
  }
  console.log(
    "\nCatalog access is live. The product pipeline can now source verified ASINs,\n" +
      "canonical titles and m.media-amazon.com images instead of scraping Target."
  );
  process.exit(0);
}

console.log(`  FAIL  HTTP ${apiRes.status}`);
console.log(`        ${rawApi.slice(0, 400)}`);
process.exit(1);
