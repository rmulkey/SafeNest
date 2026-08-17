#!/usr/bin/env node
/**
 * Publish homeschool-focused editorial content.
 *
 * DATA INTEGRITY
 * Editorial opinion and practical guidance are allowed on a review site. What is
 * NOT allowed, and is deliberately absent here:
 *  - no claim that SafeNest tested, certified or lab-checked anything
 *  - no "expert", "safest", "approved" or endorsement language
 *  - no prices, discounts or availability claims
 *  - no invented research citations or statistics
 *  - CPSC is referenced as the authority for recalls, not as an endorser
 *
 * Guides link to reviews that already exist in the catalog, resolved by slug
 * at run time. A guide is written with only the references that actually
 * resolve, so a mistyped slug drops out rather than becoming a broken link.
 *
 * Usage:
 *   node scripts/add-homeschool-content.mjs --dry-run
 *   node scripts/add-homeschool-content.mjs
 */
import { createClient } from "@sanity/client";

const DRY_RUN = process.argv.includes("--dry-run");

if (!process.env.SANITY_API_TOKEN) {
  console.error("SANITY_API_TOKEN is required");
  process.exit(1);
}

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "ofvgjgsi",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

let keySeq = 0;
const nextKey = (p) => `${p}${(keySeq++).toString(36)}${Date.now().toString(36).slice(-4)}`;

/** Portable-text paragraph. */
const p = (text) => ({
  _key: nextKey("b"),
  _type: "block",
  style: "normal",
  markDefs: [],
  children: [{ _key: nextKey("s"), _type: "span", marks: [], text }],
});

/** Portable-text heading. */
const h = (text, style = "h2") => ({
  _key: nextKey("b"),
  _type: "block",
  style,
  markDefs: [],
  children: [{ _key: nextKey("s"), _type: "span", marks: [], text }],
});

/** Portable-text bullet. */
const li = (text) => ({
  _key: nextKey("b"),
  _type: "block",
  style: "normal",
  listItem: "bullet",
  level: 1,
  markDefs: [],
  children: [{ _key: nextKey("s"), _type: "span", marks: [], text }],
});

const AUTHOR = "Rodrigo & Vanessa Mulkey";
const NOW = new Date().toISOString();

// ─────────────────────────────────────────────────────────────────────────────
// Articles
// ─────────────────────────────────────────────────────────────────────────────

const ARTICLES = [
  {
    slug: "homeschool-manipulatives-safety-mixed-ages",
    title: "Homeschooling With Small Parts: Keeping Manipulatives Safe in a Mixed-Age House",
    excerpt:
      "Counting cubes, pattern blocks and base-ten units are choking hazards by design — they are small on purpose. Here is how we run math materials with a toddler in the same room.",
    body: [
      p(
        "Homeschooling several ages at once creates a problem that classrooms mostly do not have. A kindergarten math lesson needs a hundred loose plastic cubes. A one-year-old needs a floor. Those two facts share a room."
      ),
      p(
        "Almost every good manipulative set is labeled for ages three and up, and often five and up. That labelling is not caution for its own sake. Snap cubes, pattern blocks, base-ten units and counters are deliberately small so that small hands can group and sort them, and a piece that fits neatly between a five-year-old's fingers fits just as neatly into a toddler's airway."
      ),
      p(
        "We are parents, not safety professionals, and we do not test any of this. What follows is the routine our own house runs on, and the reasoning behind it."
      ),

      h("Separate by time, not by shelf height"),
      p(
        "The instinct is to store small-parts sets high up. That helps, but it solves the wrong half of the problem: the risky moment is not storage, it is the forty minutes the set is open on a table with a toddler awake."
      ),
      p(
        "What worked better for us was tying small-parts work to a time when the youngest is not circulating — nap, or an adult-supervised stretch in another room. It is a less satisfying answer than a clever storage system, because it costs scheduling rather than money. It is also the one that actually reduced the number of times we found a cube on the floor."
      ),

      h("Use a boundary the older child can see"),
      p(
        "A tray, a rimmed baking sheet or a shallow box gives the work a visible edge. Pieces that leave the tray are out of bounds. Children take to this quickly, partly because it makes tidying finite: everything belongs inside a rectangle."
      ),
      p(
        "The side benefit is that a tray can be lifted intact and put out of reach mid-lesson, which is what you want when a nap ends early."
      ),

      h("Count in and count out"),
      p(
        "Sets that ship with a stated piece count are worth counting back. Not for tidiness — so that a missing piece is a known fact rather than a suspicion. A hundred snap cubes going back as ninety-eight is a signal to look under the sofa now, not next week."
      ),
      p(
        "This is also the habit that catches wear: cracked cubes and split wooden blocks turn up during counting rather than during play."
      ),

      h("Magnets deserve their own rule"),
      p(
        "Magnetic letters, magnetic calendar pieces and magnetic building sets are common in homeschool spaces and belong in a stricter category than wooden blocks. If more than one small magnet is swallowed they can attract through tissue, and that is a surgical emergency rather than a watch-and-wait."
      ),
      p(
        "The U.S. Consumer Product Safety Commission has recalled a number of magnetic toys and fidget items on exactly this basis, including sets sold recently. We keep magnetic materials to adult-present use only, and we check the recall database before buying a magnetic set rather than after."
      ),
      p(
        "If a magnet ever comes loose from its housing, we retire the piece. Re-gluing it is not a repair we are willing to trust."
      ),

      h("Buy the sturdier version of things that get daily use"),
      p(
        "This is an editorial preference rather than a safety finding, so treat it as ours rather than as advice. Materials that get handled every school day — pattern blocks, counting frames, sorting sets — hold up better in wood or in thicker plastic, and pieces that hold their shape are less likely to crack into sharp fragments."
      ),
      p(
        "It does not follow that expensive is safer. Plenty of inexpensive sets are perfectly sound, and price tells you very little about small-parts risk, which is a function of size and of the age of the child in the room."
      ),

      h("Check recalls on the way in, not on the way out"),
      p(
        "Homeschool materials arrive from a wider range of places than most toys: curriculum suppliers, teacher-supply stores, secondhand co-op sales, hand-me-downs from families a grade ahead. Secondhand items are the ones least likely to reach you with a recall notice attached."
      ),
      p(
        "Searching the manufacturer and product name against the CPSC recall database takes a minute and is the single highest-value check we do. Our recalls page republishes that public data and shows when it was last synchronized, but for anything you are about to hand a child, go to CPSC directly."
      ),

      h("What we do not do"),
      p(
        "We do not measure parts against a small-parts cylinder, we do not send anything to a laboratory, and we do not verify a manufacturer's certification claims. When we record that a set is labeled for ages three and up, that is the label, not our determination."
      ),
      p(
        "The current packaging, the manufacturer's own warnings, and the official recall notices are the authorities here. Nothing on this site replaces them."
      ),
    ],
  },
  {
    slug: "homeschool-toy-rotation-that-actually-holds",
    title: "A Homeschool Toy Rotation That Survives Contact With Real Children",
    excerpt:
      "Rotation advice usually assumes a spare closet and a free Sunday. Here is the stripped-down version we kept doing after the elaborate one collapsed.",
    body: [
      p(
        "We tried the version with labeled bins, a printed schedule and a four-week cycle. It lasted about five weeks, which is roughly one cycle plus the week we spent feeling guilty about it."
      ),
      p(
        "What survived is smaller and less photogenic, and it has three parts: a short open shelf, a deep store, and one decision made once a week. If you are homeschooling, rotation is doing double duty — it is managing clutter and it is managing what your children are actually able to reach for during a school day."
      ),

      h("Keep the open shelf genuinely short"),
      p(
        "Six to eight things, visible, not stacked. The point is not minimalism as an aesthetic. It is that a child scanning a shelf for something to do will pick from what they can see, and a crowded shelf reads as noise."
      ),
      p(
        "In practice, ours holds one construction set, one puzzle, one math material currently in use, one open-ended art thing, and two or three that are simply favourites and never leave. Fighting the favourites is a losing battle and not worth the friction."
      ),

      h("Rotate on evidence, not on a calendar"),
      p(
        "The four-week cycle failed because it moved things that were still being used and kept things that were not. Watching for a week tells you more than any schedule: whatever has not been touched comes off the shelf, whatever is being used stays regardless of how long it has been there."
      ),
      p(
        "A set that gets daily use for four months has earned its space. Removing it to honour a rotation schedule is tidying for its own sake."
      ),

      h("Store by age band, because the store is where the risk lives"),
      p(
        "This is the part that matters if you have a range of ages. The deep store is not one pile. Small-parts sets — counters, cubes, pattern blocks, anything labeled three-plus or five-plus — live in closed containers on high shelves. Everything a toddler could safely find lives low."
      ),
      p(
        "The reason is simple: a rotation system means containers get opened, carried and put down half-sorted. That is exactly the moment a hundred loose cubes become a floor-level hazard. Sorting the store by age band means a mistake during rotation is much less likely to matter."
      ),

      h("Give math materials a permanent spot"),
      p(
        "Homeschooling changes the calculation compared with a house that only plays. A counting frame or a set of pattern blocks used in a lesson three times a week is equipment, not a toy, and rotating it out interrupts the lesson rather than refreshing the play."
      ),
      p(
        "We keep current math and literacy materials out permanently and rotate only the play shelf around them. It cost us one shelf and removed a recurring argument."
      ),

      h("Do the safety check at the rotation point"),
      p(
        "Rotation is already the moment everything is in your hands, which makes it the cheapest time to look for the things that matter: cracked plastic, splintered wood, loose magnets, seams opening on soft toys, and missing pieces from counted sets."
      ),
      p(
        "It is also a natural point to search anything new or secondhand against the CPSC recall database before it joins the shelf. Doing it here means it happens; doing it as a separate task means it does not."
      ),

      h("What rotation does not do"),
      p(
        "It does not make a toy age-appropriate. Moving a five-plus set onto a shelf a three-year-old can reach does not change what the label says or what the pieces are. The age guidance on the box is the manufacturer's, and it does not rotate."
      ),
      p(
        "And it does not substitute for supervision. Our own scores are a research tool for comparing products, not a verdict on whether something is safe in your particular room with your particular children. Follow the packaging and the official recall notices first."
      ),
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Buying guide
// ─────────────────────────────────────────────────────────────────────────────

const GUIDE = {
  slug: "homeschool-math-literacy-materials",
  title: "Homeschool Math and Literacy Materials, Compared",
  excerpt:
    "Parent-researched comparison of hands-on math and literacy materials for a homeschool day, with the small-parts trade-off stated plainly for each one.",
  targetAgeRange: { minMonths: 36, maxMonths: 120 },
  reviewSlugs: [
    "learning-resources-10-row-rekenrek-counting-frame",
    "learning-resources-wooden-pattern-blocks-250-piece-set",
    "learning-resources-snap-cubes-100-piece-set",
    "learning-resources-1-10-counting-owls-activity-set",
    "melissa-and-doug-my-first-daily-magnetic-calendar",
    "melissa-and-doug-turn-and-tell-wooden-clock",
    "melissa-and-doug-self-correcting-alphabet-wooden-puzzles-with-storage-box-52pc",
    "melissa-and-doug-jumbo-numbers-wooden-chunky-puzzle-20pc",
  ],
  body: [
    p(
      "Hands-on materials are the part of a homeschool day that most rewards buying carefully. They get used daily, they last for years, and the difference between a set that works and one that sits in a cupboard is usually not price."
    ),
    p(
      "Every item below is scored the same way as everything else on this site, and every one of them involves the same trade-off: the features that make a manipulative useful — small, numerous, easy to group — are the features that make it a choking hazard for a younger child. We state that plainly on each review rather than burying it."
    ),

    h("How to read the scores here"),
    p(
      "Our safety scores for this category sit lower than for baby toys, and that is deliberate rather than a criticism of the products. A hundred loose cubes cannot score the way a single molded rattle does. The score reflects what the item is; the age label tells you who it is for."
    ),
    p(
      "None of these carry a certification claim we were able to verify, so their certification factor is recorded as not found. That is an absence of evidence available to us, not evidence of a problem."
    ),

    h("Counting and number sense"),
    p(
      "A counting frame makes five and ten visible rather than abstract, which is the jump most early math programs are trying to produce. Beads on fixed wires also means fewer loose pieces than most alternatives, which matters in a mixed-age house."
    ),
    p(
      "Loose counters — cubes, owls, penguins — do something a frame cannot: they can be grouped, moved and physically rearranged. That is genuinely more useful for teaching grouping and early multiplication, and it is also where the small-parts risk concentrates."
    ),

    h("Shape, pattern and geometry"),
    p(
      "Pattern blocks are the most open-ended thing in this list. The same 250 pieces cover symmetry at four and fractions at eight, which is unusual value across a homeschool span. They are also flat, small and numerous — the set we are most careful about with a toddler in the house."
    ),

    h("Time, calendar and daily routine"),
    p(
      "Clock and calendar materials do less teaching per dollar than math manipulatives, and they earn their place a different way: they anchor the start of a school day. A child who sets the date and the weather has started, which is worth something on a slow morning."
    ),
    p(
      "Magnetic calendar sets need the stricter magnet rule. Multiple small magnets swallowed together can cause serious internal injury, and CPSC has recalled magnetic items on that basis. Adult-present use, and retire any piece whose magnet has come loose."
    ),

    h("Letters and early literacy"),
    p(
      "Self-correcting letter puzzles and chunky number puzzles are the gentlest entry point here, because the pieces are large and the design tells a child when they are right without an adult intervening."
    ),

    h("What we did not include, and why"),
    p(
      "We dropped several products we had intended to cover because we could not confirm a manufacturer age range for them from the manufacturer or the retailer. Publishing an age we had guessed at would be worse than leaving the product out, particularly for sets containing magnets."
    ),
    p(
      "As always: follow the age guidance and warnings on the packaging you actually receive, and check the official CPSC recall database directly before handing anything new or secondhand to a child."
    ),
  ],
};

// ─────────────────────────────────────────────────────────────────────────────

const slugify = (s) => s;

async function main() {
  const mutations = [];

  for (const a of ARTICLES) {
    const existing = await client.fetch(
      `*[_type == "blogPost" && slug.current == $slug][0]._id`,
      { slug: a.slug }
    );
    if (existing) {
      console.log(`SKIP  blogPost ${a.slug} — already exists`);
      continue;
    }
    console.log(`NEW   blogPost ${a.slug}`);
    console.log(`        "${a.title}"`);
    console.log(`        ${a.body.length} blocks`);
    mutations.push({
      create: {
        _id: `blog-${a.slug}`,
        _type: "blogPost",
        title: a.title,
        slug: { _type: "slug", current: a.slug },
        excerpt: a.excerpt,
        author: AUTHOR,
        body: a.body,
        publishedAt: NOW,
      },
    });
  }

  const existingGuide = await client.fetch(
    `*[_type == "buyingGuide" && slug.current == $slug][0]._id`,
    { slug: GUIDE.slug }
  );
  if (existingGuide) {
    console.log(`SKIP  buyingGuide ${GUIDE.slug} — already exists`);
  } else {
    // Resolve review references by slug; drop any that do not exist so the guide
    // can never contain a dangling reference.
    const resolved = await client.fetch(
      `*[_type == "toyReview" && slug.current in $slugs]{_id, "slug": slug.current}`,
      { slugs: GUIDE.reviewSlugs }
    );
    const found = new Set(resolved.map((r) => r.slug));
    const missing = GUIDE.reviewSlugs.filter((s) => !found.has(s));
    console.log(`NEW   buyingGuide ${GUIDE.slug}`);
    console.log(`        "${GUIDE.title}"`);
    console.log(`        ${resolved.length}/${GUIDE.reviewSlugs.length} review refs resolved`);
    if (missing.length) {
      console.log(`        dropped (no such review): ${missing.join(", ")}`);
    }
    mutations.push({
      create: {
        _id: `guide-${GUIDE.slug}`,
        _type: "buyingGuide",
        title: GUIDE.title,
        slug: { _type: "slug", current: slugify(GUIDE.slug) },
        excerpt: GUIDE.excerpt,
        targetAgeRange: GUIDE.targetAgeRange,
        reviewReferences: resolved.map((r) => ({
          _key: nextKey("r"),
          _type: "reference",
          _ref: r._id,
        })),
        body: GUIDE.body,
        publishedAt: NOW,
      },
    });
  }

  console.log(`\n${mutations.length} document(s) to create.${DRY_RUN ? " (dry run)" : ""}`);
  if (DRY_RUN) {
    console.log("Dry run: nothing written.");
    return;
  }
  if (mutations.length === 0) {
    console.log("Nothing to do.");
    return;
  }
  await client.mutate(mutations);
  console.log("Created.");
}

await main();
