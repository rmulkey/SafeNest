#!/usr/bin/env node
/**
 * Checks that every review describes its certification claims the same way in
 * all the places it describes them.
 *
 * WHY THIS EXISTS
 * A review states the provenance of its certification claims three times: the
 * safety-score breakdown near the top, the per-factor evidence list, and the
 * "How we assessed this toy" disclosure. Two of those were hardcoded and had
 * drifted from the recorded data, so a page could show "Certification 90" at the
 * top, assert "Manufacturer-reported" in the middle, and say no source was on
 * file at the bottom. All three now derive from the same assessment, and this
 * checks they stay that way.
 *
 * Usage: node scripts/check-cert-attribution.mjs [baseUrl]
 */

const BASE = process.argv[2] || "http://localhost:3000";

const SOURCED = "These are manufacturer or retailer claims";
const NO_SOURCE = "No source is on file for these claims";
const NO_CERTS = "No certification claims recorded";

async function text(url) {
  const res = await fetch(url, { headers: { "user-agent": "safenest-attribution-check" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function strip(html) {
  return html.replace(/<script[^>]*>[\s\S]*?<\/script>/g, "");
}

/** The evidence label the per-factor list shows for certificationPresence. */
function evidenceListLabel(html) {
  const m = html.match(
    /Certification claims<span[^>]*>[\s\S]*?<\/span><\/span><span[^>]*>([^<]*)</
  );
  return m ? m[1].trim() : null;
}

/** The evidence label the score breakdown shows for the same factor. */
function breakdownLabel(html) {
  const m = html.match(
    /aria-label="Certification claims: \d+ out of 100\. Evidence: ([^."]*)\."/
  );
  return m ? m[1].trim() : null;
}

/** The attribution sentence under the body Certifications heading. */
function bodyAttribution(html) {
  const m = html.match(/>Certifications<\/h2>\s*<p[^>]*>([^<]*)</);
  if (!m) return null;
  const s = m[1].replace(/&#x27;/g, "'").trim();
  if (s.startsWith(SOURCED)) return "sourced";
  if (s.startsWith(NO_SOURCE)) return "no-source";
  return `unexpected: ${s.slice(0, 60)}`;
}

/** The attribution sentence in the disclosure at the bottom. */
function disclosureAttribution(html) {
  if (html.includes(SOURCED)) return "sourced";
  if (html.includes(NO_SOURCE)) return "no-source";
  if (html.includes(NO_CERTS)) return "no-certs";
  return null;
}

async function main() {
  const sm = await text(`${BASE}/sitemap.xml`);
  const slugs = [
    ...sm.matchAll(/<loc>[^<]*\/reviews\/([^<]+)<\/loc>/g),
  ].map((m) => m[1]);

  if (slugs.length === 0) {
    console.error("No review URLs found in the sitemap.");
    process.exit(1);
  }

  const findings = [];
  const tally = {};
  let checked = 0;

  const QUEUE = [...slugs];
  const WORKERS = 6;

  async function worker() {
    for (;;) {
      const slug = QUEUE.shift();
      if (!slug) return;
      let html;
      try {
        html = strip(await text(`${BASE}/reviews/${slug}`));
      } catch (err) {
        findings.push(`${slug}: fetch failed — ${err.message}`);
        continue;
      }
      checked++;

      const disclosure = disclosureAttribution(html);
      const body = bodyAttribution(html);
      const list = evidenceListLabel(html);
      const bar = breakdownLabel(html);

      tally[disclosure ?? "none"] = (tally[disclosure ?? "none"] ?? 0) + 1;

      // The breakdown and the evidence list must name the same evidence status.
      if (list && bar && list !== bar) {
        findings.push(
          `${slug}: breakdown says "${bar}" but the evidence list says "${list}"`
        );
      }
      if (!list) findings.push(`${slug}: no "Certification claims" row in the evidence list`);
      if (!bar) findings.push(`${slug}: no certification row in the score breakdown`);

      // A product with claims states their provenance twice; both must agree.
      if (disclosure === "no-certs") {
        if (body !== null) {
          findings.push(`${slug}: records no certification claims but the body lists some`);
        }
      } else if (body === null) {
        findings.push(`${slug}: disclosure describes claims but the body has no Certifications section`);
      } else if (body !== disclosure) {
        findings.push(
          `${slug}: body attribution is "${body}" but the disclosure is "${disclosure}"`
        );
      }

      // "Not found" evidence and a sourced attribution cannot both be true.
      if (list === "Not found" && disclosure === "sourced") {
        findings.push(
          `${slug}: evidence status is "Not found" yet the claims are attributed to a manufacturer or retailer`
        );
      }
    }
  }

  await Promise.all(Array.from({ length: WORKERS }, worker));

  console.log(`Checked ${checked} of ${slugs.length} review pages on ${BASE}`);
  console.log("Attribution:", JSON.stringify(tally));

  if (findings.length > 0) {
    console.log(`\n${findings.length} finding(s):`);
    for (const f of findings.slice(0, 40)) console.log(`  - ${f}`);
    if (findings.length > 40) console.log(`  … and ${findings.length - 40} more`);
    process.exit(1);
  }
  console.log("\nAll reviews describe their certification claims consistently.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
