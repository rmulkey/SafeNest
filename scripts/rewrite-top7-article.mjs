/**
 * Rewrite the auto-generated outdoor-toys roundup into a polished, hooked
 * "Top 7 Child-Safe Toys in 2026" article WITH inline images and links.
 *
 * Data integrity: every product, image (existing Sanity asset ref), score, and
 * review link below is REAL — pulled from the live catalog. Editorial copy is
 * authored (allowed for a review site). No fabricated products or links.
 *
 * Run: SANITY_API_TOKEN="..." node scripts/rewrite-top7-article.mjs
 */
import { createClient } from "@sanity/client";

const client = createClient({
  projectId: "ofvgjgsi",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

const OLD_ID = "blog-best-outdoor-toys-2026-w23";
const NEW_SLUG = "top-7-child-safe-toys-2026";

// Real top-7 by safety score (verified: have images + live review pages).
const PICKS = [
  { name: "Green Toys Stacking Cups", slug: "green-toys-stacking-cups", safety: 95, dev: 74, age: "6–36 months", img: "image-dbda0362508a5e5500f57b1da5aee542a05e71b1-800x800-heif", alt: "Green Toys My First Stacker nesting and stacking cups in whimsical colors", why: "Made from 100% recycled milk jugs with no BPA, phthalates, or external coatings, these nesting cups are about as worry-free as a first toy gets — and they double as bath and sand scoops as your child grows." },
  { name: "Lovevery The Play Kits (0–12 months)", slug: "lovevery-play-kits-0-12", safety: 95, dev: 90, age: "0–12 months", img: "image-8a4d40b89f99edee1230761d9dd288f56694d349-1080x1080-webp", alt: "Lovevery The Looker Play Kit baby toys flatlay with high-contrast cards, mittens, and play gym pieces", why: "Designed by child-development specialists and made from sustainably sourced wood and organic cotton, each kit is matched to your baby's developmental stage — our highest development score of the group at 90/100." },
  { name: "Green Toys Dump Truck", slug: "green-toys-dump-truck", safety: 94, dev: 76, age: "1–6 years", img: "image-5c123bfb9d2ce86883b34321914125d4653515af-800x800-heif", alt: "Green Toys blue and orange recycled plastic dump truck with working tailgate", why: "A rugged, recycled-plastic classic with no small parts and a working tailgate that begs for sandbox and backyard play. Dishwasher-safe when the mud inevitably wins." },
  { name: "Grimm's Large Rainbow Stacker", slug: "grimms-large-rainbow-stacker", safety: 94, dev: 85, age: "1–8 years", img: "image-8e07ba804c55a366a67862b18cfbee82eefb2df9-800x800-webp", alt: "Grimm's Large Rainbow wooden stacker with 12 nested arches in rainbow colors", why: "Twelve nested wooden arches finished with non-toxic water-based stains. It's the definition of open-ended play — a tunnel, a fence, a bridge, a cradle — and it grows with your child for years." },
  { name: "PlanToys My First Camera", slug: "plantoys-my-first-camera", safety: 94, dev: 79, age: "18 months–4 years", img: "image-36cabd4d8b655260531a8cf788233c5ead568542-800x800-heif", alt: "PlanToys My First Camera wooden toy camera with kaleidoscope lens", why: "Made from sustainably harvested rubberwood with a kaleidoscope lens and a shutter that clicks. It encourages imaginative play and gentle motor skills without a single screen in sight." },
  { name: "PlanToys Stacking Ring", slug: "plantoys-stacking-ring", safety: 94, dev: 78, age: "1–3 years", img: "image-c90fae375c7732e2c43499a3ebbef5d9196ae72b-800x800-heif", alt: "PlanToys wooden Stacking Ring set with colorful rings on a foldable center rod", why: "A modern take on the classic ring stacker, with a soft foldable center post that's gentle for new walkers. Solid rubberwood and non-toxic finishes throughout." },
  { name: "Tegu 14-Piece Magnetic Wooden Blocks", slug: "tegu-14-piece-magnetic-blocks", safety: 94, dev: 83, age: "1–6 years", img: "image-39be2aefb5bfd20a7b764f84f6e7124f8a5d0f65-800x800-heif", alt: "Tegu 14-Piece Magnetic Wooden Blocks set in Tints colorway", why: "Hardwood blocks with magnets safely sealed inside — no loose magnets, ever. They snap together in satisfying ways that keep toddlers and big kids building side by side." },
];

let k = 0;
const key = (p = "k") => `${p}${++k}`;

function para(text, markDefs = [], children = null) {
  return {
    _type: "block",
    _key: key("p"),
    style: "normal",
    markDefs,
    children: children || [{ _type: "span", _key: key("s"), text, marks: [] }],
  };
}
function heading(style, text) {
  return {
    _type: "block",
    _key: key("h"),
    style,
    markDefs: [],
    children: [{ _type: "span", _key: key("s"), text, marks: [] }],
  };
}
function image(ref, alt) {
  return { _type: "image", _key: key("img"), alt, asset: { _type: "reference", _ref: ref } };
}
// A paragraph whose trailing phrase links to the product's review page.
function paraWithReviewLink(lead, linkText, slug) {
  const linkKey = key("link");
  return {
    _type: "block",
    _key: key("p"),
    style: "normal",
    markDefs: [{ _type: "link", _key: linkKey, href: `/reviews/${slug}` }],
    children: [
      { _type: "span", _key: key("s"), text: lead, marks: [] },
      { _type: "span", _key: key("s"), text: linkText, marks: [linkKey] },
      { _type: "span", _key: key("s"), text: ".", marks: [] },
    ],
  };
}

const body = [];

// Hook
body.push(
  para(
    "Walk into any toy aisle and the choices are dizzying — and the labels rarely tell you what actually matters: is this safe, and will it genuinely help my child grow? As parents of three, we've spent years sorting the truly excellent toys from the merely loud ones. These seven earned the highest safety scores in our entire catalog for 2026, and every one of them is a toy we'd happily hand our own kids."
  )
);
body.push(
  para(
    "Each pick below is independently scored out of 100 for material safety, choking risk, recall history, and certifications — then checked against current recall data. No sponsorships, no guesswork. Here's the shortlist, best-first."
  )
);

body.push(heading("h2", "How we scored these"));
body.push(
  para(
    "Our Safety Score weighs four things: what a toy is made of, whether it poses a choking risk for its age, its recall history, and which independent safety certifications (like ASTM F963 and CPSIA) it carries. A score in the 90s means a toy we'd trust without a second thought. Every toy here cleared that bar."
  )
);

// Each pick: heading, image, why, review link
PICKS.forEach((p, i) => {
  body.push(heading("h3", `${i + 1}. ${p.name}`));
  body.push(image(p.img, p.alt));
  body.push(
    para(
      `Safety ${p.safety}/100 · Development ${p.dev}/100 · Ages ${p.age}. ${p.why}`
    )
  );
  body.push(
    paraWithReviewLink("See the full safety breakdown in our ", `${p.name} review`, p.slug)
  );
});

// Closing
body.push(heading("h2", "Choosing the right one for your child"));
body.push(
  para(
    "If you're shopping for a baby, the Lovevery Play Kits and Green Toys Stacking Cups are hard to beat. For toddlers building independence, the Grimm's Rainbow Stacker and Tegu blocks offer years of open-ended play. And if you want something that gets your child outside, the Green Toys Dump Truck is built for it."
  )
);
body.push(
  para(
    "Whatever you choose, you can shop knowing it's been checked the way we'd check it for our own family. Browse every toy we've scored on our reviews page, and if you'd like our safest picks and recall alerts in your inbox, join the SafeNest newsletter below."
  )
);
body.push(
  para(
    "Helping parents choose safer, smarter toys with confidence — that's why we built SafeNest."
  )
);

const doc = {
  _id: OLD_ID, // keep same _id so we replace in place
  _type: "blogPost",
  title: "Top 7 Child-Safe Toys in 2026",
  slug: { _type: "slug", current: NEW_SLUG },
  excerpt:
    "The toy aisle won't tell you what matters most: is it safe, and will it help your child grow? These seven earned the highest safety scores in our 2026 catalog — researched by parents, scored out of 100, and checked against recall data.",
  author: "Rodrigo & Vanessa Mulkey",
  publishedAt: new Date().toISOString(),
  body,
};

async function main() {
  await client.createOrReplace(doc);
  console.log(`✓ Rewrote article → /blog/${NEW_SLUG} ("${doc.title}")`);
  console.log(`  ${PICKS.length} products, ${body.length} blocks (incl. ${PICKS.length} images + ${PICKS.length} review links)`);
}
main().catch((e) => { console.error(e.message); process.exit(1); });
