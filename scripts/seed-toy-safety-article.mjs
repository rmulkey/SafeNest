/**
 * Seed the evergreen "How to Read Toy Safety Labels" blog post.
 *
 * Data integrity: this is editorial guidance (allowed for a review site). All
 * factual claims describe widely-published safety standards and CPSC guidance;
 * internal links point to real pages on this site. No fabricated products,
 * data, or external links.
 *
 * Run: SANITY_API_TOKEN="..." node scripts/seed-toy-safety-article.mjs
 */
import { createClient } from "@sanity/client";

const client = createClient({
  projectId: "ofvgjgsi",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

const ID = "blog-how-to-read-toy-safety-labels-2026";
const SLUG = "how-to-read-toy-safety-labels";

let k = 0;
const key = (p = "k") => `${p}${++k}`;
function para(text) {
  return { _type: "block", _key: key("p"), style: "normal", markDefs: [], children: [{ _type: "span", _key: key("s"), text, marks: [] }] };
}
function heading(style, text) {
  return { _type: "block", _key: key("h"), style, markDefs: [], children: [{ _type: "span", _key: key("s"), text, marks: [] }] };
}
function bullet(text) {
  return { _type: "block", _key: key("b"), style: "normal", listItem: "bullet", level: 1, markDefs: [], children: [{ _type: "span", _key: key("s"), text, marks: [] }] };
}
// Paragraph with an internal link at the end.
function paraLink(lead, linkText, href, tail = ".") {
  const linkKey = key("link");
  return {
    _type: "block", _key: key("p"), style: "normal",
    markDefs: [{ _type: "link", _key: linkKey, href }],
    children: [
      { _type: "span", _key: key("s"), text: lead, marks: [] },
      { _type: "span", _key: key("s"), text: linkText, marks: [linkKey] },
      { _type: "span", _key: key("s"), text: tail, marks: [] },
    ],
  };
}

const body = [];
body.push(para("If you've ever stood in a toy aisle squinting at the fine print on a box, you're not alone. Toy labels are dense with standards, age numbers, and symbols — and almost none of it explains what actually keeps your child safe. Here's a plain-English guide to what those labels mean, what to look for, and what to ignore."));

body.push(heading("h2", "The certifications that actually matter"));
body.push(para("In the United States, toys are regulated, and a few marks tell you a product was tested against recognized safety standards:"));
body.push(bullet("ASTM F963 — the core U.S. toy safety standard. It covers mechanical hazards (like small parts and sharp edges), and limits on lead and certain chemicals. It is the baseline you want to see."));
body.push(bullet("CPSIA — the Consumer Product Safety Improvement Act sets federal limits on lead and phthalates in children's products and requires third-party testing for toys intended for kids 12 and under."));
body.push(bullet("EN 71 — the European toy safety standard. You'll often see it on imported or international brands; it signals testing comparable to ASTM F963."));
body.push(bullet("JPMA certification — a voluntary program (common on items like gates and some infant gear) indicating the product met a certification program's testing."));
body.push(para("No mark is a magic guarantee, but a toy that carries ASTM F963 and CPSIA compliance has been held to real, testable requirements. The absence of any standard at all is a yellow flag worth a second thought."));

body.push(heading("h2", "Age grading is a safety label, not a skill rating"));
body.push(para("The single most misunderstood thing on a toy box is the age range. Parents often read 'ages 3+' as 'my advanced 2-year-old can handle it.' But that number is usually a safety designation, not a difficulty level. A '3+' label very often means the toy contains small parts that are a choking hazard for children under three — regardless of how clever your toddler is."));
body.push(para("Take age grading seriously for anything a child still mouths. When in doubt, treat it as a hard line rather than a suggestion."));

body.push(heading("h2", "The choking-hazard test you can do at home"));
body.push(para("Choking is the most common serious toy hazard for babies and toddlers. A simple rule of thumb: if a part fits through a standard cardboard toilet-paper tube (roughly 1.25 inches wide), it's a choking risk for a child under three. Small-parts testing gauges used by regulators are based on the same idea."));
body.push(para("When we evaluate a toy, choking risk is one of the four factors in our safety score, weighted heavily for the youngest age groups. Detachable parts, small batteries, and — especially — high-powered magnets deserve extra scrutiny. Swallowed button batteries and loose magnets can cause severe internal injuries and are worth avoiding entirely for little ones."));

body.push(heading("h2", "Materials: what 'non-toxic' should mean"));
body.push(para("Look for toys labeled BPA-free and phthalate-free, water-based or non-toxic paints and finishes, and, for wooden toys, sustainably sourced wood. These aren't just marketing words when they appear alongside a real safety standard — CPSIA already limits lead and phthalates, and reputable brands test to confirm it."));
body.push(para("For anything an infant will chew — teethers, rattles, soft books — food-grade or medical-grade silicone and natural rubber are reassuring signs, and one-piece designs with no seams to trap moisture are easier to keep clean."));

body.push(heading("h2", "Always check for recalls"));
body.push(paraLink("Even a well-made toy can be recalled after it ships. Before you buy — and periodically for toys you already own — it's worth a quick check. We monitor CPSC recall data daily and flag affected products on our ", "recalls page", "/recalls"));
body.push(para("If a toy you own is recalled, stop using it immediately and follow the manufacturer's instructions for a refund, repair, or replacement. Don't pass it along or resell it."));

body.push(heading("h2", "How we turn all of this into a score"));
body.push(paraLink("Every toy we review is scored out of 100 on four safety factors — material safety, choking risk, recall history, and certification presence — plus a separate developmental score. You can read exactly how the scoring works on our ", "transparency page", "/transparency"));
body.push(paraLink("Ready to put this into practice? Browse our independently scored ", "toy safety reviews", "/reviews"));

body.push(heading("h2", "The short version"));
body.push(bullet("Look for ASTM F963 and CPSIA compliance."));
body.push(bullet("Treat age grades as safety limits, especially for kids under three."));
body.push(bullet("If a part fits through a toilet-paper tube, it's a choking risk for little ones."));
body.push(bullet("Avoid loose magnets and accessible button batteries for babies and toddlers."));
body.push(bullet("Check for recalls before buying and periodically after."));
body.push(para("A little label-reading goes a long way. Choose toys that have been tested, match the age to your child honestly, and supervise play — and you've handled the vast majority of the risk. For our latest safety-scored picks and recall alerts, join the SafeNest newsletter below."));

const doc = {
  _id: ID,
  _type: "blogPost",
  title: "How to Read Toy Safety Labels: A Parent's Guide",
  slug: { _type: "slug", current: SLUG },
  excerpt:
    "Toy boxes are covered in standards, age numbers, and symbols — but which ones actually keep your child safe? A plain-English guide to certifications, age grading, choking hazards, materials, and recalls.",
  author: "Rodrigo & Vanessa Mulkey",
  publishedAt: new Date().toISOString(),
  body,
};

async function main() {
  await client.createOrReplace(doc);
  console.log(`✓ Seeded article → /blog/${SLUG} ("${doc.title}")`);
  console.log(`  ${body.length} blocks`);
}
main().catch((e) => { console.error(e.message); process.exit(1); });
