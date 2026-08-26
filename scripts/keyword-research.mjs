#!/usr/bin/env node
/**
 * Keyword research for SafeNest, seeded from what Search Console shows already
 * working rather than from guesses.
 *
 * WHY THESE SEEDS
 * First-party GSC data for the last 83 days says the winning query shape is
 * "{product or category} + safety concern":
 *
 *   choking hazard ...      average position 12.8
 *   ... recall              average position 14.0
 *   best {category} ...     average position 41-86
 *
 * So commercial "best X" phrasing is not where this domain competes, and
 * seo/content-roadmap.md was wrong to lead with it. Seeds below are all
 * safety-concern shaped.
 *
 * WHAT THIS DOES NOT DO
 * Semrush volume and difficulty figures are estimates from their own model, not
 * measurements. They are recorded as such and used for ordering, never presented
 * as fact. Anything acted on is cross-checked against GSC, which is
 * first-party.
 *
 * Usage:
 *   set -a; . ./.env.local; set +a
 *   node scripts/keyword-research.mjs
 *   SEEDS_ONLY=1 node scripts/keyword-research.mjs   # skip the expansion pulls
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { callTool } from "./semrush-mcp.mjs";

const DB = "us";
const OUT_DIR = "seo/data";
const OUT = "seo/keyword-research.csv";

/** Safety-concern shaped seeds, matching the shape that already ranks. */
const SEEDS = [
  "toy choking hazard",
  "toy recall",
  "non toxic baby toys",
  "bpa free baby toys",
  "magnetic tiles safety",
  "button battery toy safety",
  "baby toy safety",
  "wooden toy safety",
  "toy safety standards",
  "are magnet toys safe",
  "toy age labels",
  "secondhand toy safety",
];

async function report(name, params) {
  try {
    const raw = await callTool("execute_report", { report: name, params });
    const text = typeof raw === "string" ? raw : JSON.stringify(raw);
    // ERROR 50 means no rows, which is an empty result and not a failure.
    if (/ERROR 50/.test(text)) return [];
    return parseSemicolonCsv(text);
  } catch (e) {
    console.warn(`  ! ${name}(${params.phrase ?? ""}) -> ${e.message.slice(0, 120)}`);
    return [];
  }
}

/** Semrush answers semicolon-delimited CSV with a header row. */
function parseSemicolonCsv(text) {
  const lines = String(text)
    .replace(/^"+|"+$/g, "")
    .split(/\\n|\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0].split(";").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(";");
    return Object.fromEntries(header.map((h, i) => [h, (cells[i] ?? "").trim()]));
  });
}

const num = (v) => {
  const n = Number(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

mkdirSync(OUT_DIR, { recursive: true });

// ── 1. Expand each seed into questions and semantic relatives ───────────────
const pool = new Map(); // keyword -> { keyword, volume, cpc, competition, sources }
function add(kw, row, source) {
  const k = String(kw || "").toLowerCase().trim();
  if (!k || k.length < 8) return; // single words are unwinnable head terms
  const prev = pool.get(k) ?? { keyword: k, volume: 0, cpc: 0, competition: 0, sources: new Set() };
  prev.volume = Math.max(prev.volume, num(row["Search Volume"] ?? row.Volume));
  prev.cpc = Math.max(prev.cpc, num(row.CPC));
  prev.competition = Math.max(prev.competition, num(row.Competition ?? row["Competition Level"]));
  prev.sources.add(source);
  pool.set(k, prev);
}

const seedsOnly = process.env.SEEDS_ONLY === "1";
console.log(`expanding ${SEEDS.length} seeds (database=${DB})`);
for (const seed of SEEDS) {
  const [questions, related] = await Promise.all([
    report("phrase_questions", { database: DB, phrase: seed, display_limit: 40 }),
    seedsOnly ? [] : report("phrase_related", { database: DB, phrase: seed, display_limit: 40 }),
  ]);
  for (const r of questions) add(r.Keyword ?? r.Phrase, r, "question");
  for (const r of related) add(r.Keyword ?? r.Phrase, r, "related");
  console.log(`  ${seed.padEnd(28)} questions=${String(questions.length).padStart(3)} related=${String(related.length).padStart(3)} pool=${pool.size}`);
}

if (pool.size === 0) {
  console.error("\nno keywords returned — check SEMRUSH_API_KEY and credit balance");
  process.exit(1);
}

// ── 2. Difficulty for the ones worth scoring ────────────────────────────────
// KDI is the expensive call, so only rows with real volume are scored.
const scoreable = [...pool.values()].filter((k) => k.volume >= 30);
console.log(`\n${scoreable.length} of ${pool.size} keywords have volume >= 30; pulling difficulty`);

const kd = new Map();
for (let i = 0; i < scoreable.length; i += 90) {
  const batch = scoreable.slice(i, i + 90);
  const rows = await report("phrase_kdi", {
    database: DB,
    phrase: batch.map((b) => b.keyword).join(";"),
  });
  for (const r of rows) {
    const k = String(r.Keyword ?? "").toLowerCase().trim();
    if (k) kd.set(k, num(r["Keyword Difficulty Index"] ?? r.Difficulty));
  }
  console.log(`  scored ${Math.min(i + 90, scoreable.length)}/${scoreable.length}`);
}

// ── 3. What the site already covers, so gaps are real gaps ──────────────────
let covered = new Set();
const invPath = "seo/url-inventory.csv";
if (existsSync(invPath)) {
  const text = readFileSync(invPath, "utf8");
  covered = new Set(
    text
      .split("\n")
      .slice(1)
      .map((l) => l.split(",")[0])
      .filter(Boolean)
      .map((u) => u.replace(/^https?:\/\/[^/]+/, "").toLowerCase())
  );
}
const slugOf = (kw) => "/" + kw.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const looksCovered = (kw) => {
  const s = slugOf(kw);
  for (const u of covered) if (u.includes(s.slice(1, 24))) return true;
  return false;
};

// ── 4. Score: reachable volume for a low-authority domain ───────────────────
// Volume alone favours head terms this site cannot rank for. GSC shows it
// placing 6.9-11.6 on long-tail safety queries and 41-86 on broad commercial
// ones, so difficulty is weighted hard and very high volume is discounted.
const scored = scoreable
  .map((k) => {
    const difficulty = kd.get(k.keyword) ?? 100;
    const reachable = difficulty <= 35;
    const score = reachable ? Math.round((k.volume * (40 - difficulty)) / 40) : 0;
    return {
      ...k,
      difficulty,
      reachable,
      score,
      isQuestion: /^(how|what|why|when|are|is|can|do|does|should|which|where)\b/.test(k.keyword),
      alreadyCovered: looksCovered(k.keyword),
      sources: [...k.sources].join("+"),
    };
  })
  .sort((a, b) => b.score - a.score);

writeFileSync(
  OUT,
  ["keyword,volume,cpc_usd,competition,difficulty,reachable,score,is_question,already_covered,sources"]
    .concat(
      scored.map((s) =>
        [
          `"${s.keyword.replace(/"/g, '""')}"`,
          s.volume, s.cpc, s.competition, s.difficulty,
          s.reachable, s.score, s.isQuestion, s.alreadyCovered, s.sources,
        ].join(",")
      )
    )
    .join("\n") + "\n"
);

const open = scored.filter((s) => s.reachable && !s.alreadyCovered);
console.log(`\n${scored.length} scored, ${scored.filter((s) => s.reachable).length} reachable (difficulty <= 35), ${open.length} of those not already covered`);

const show = (label, rows) => {
  console.log(`\n${label}`);
  console.log("  %s %s %s %s", "VOL".padStart(6), "KD".padStart(4), "SCORE".padStart(6), "KEYWORD");
  for (const s of rows.slice(0, 15)) {
    console.log(
      "  %s %s %s %s",
      String(s.volume).padStart(6),
      String(s.difficulty).padStart(4),
      String(s.score).padStart(6),
      s.keyword
    );
  }
};
show("TOP REACHABLE — QUESTIONS (blog posts)", open.filter((s) => s.isQuestion));
show("TOP REACHABLE — NON-QUESTIONS (products / listings)", open.filter((s) => !s.isQuestion));
console.log(`\nfull table -> ${OUT}`);
console.log(
  "\nVolume and difficulty are Semrush model estimates, not measurements.\n" +
    "Cross-check anything acted on against gsc/*.csv, which is first-party."
);
