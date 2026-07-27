/**
 * Seed a second batch of Buying Guides, including a Back-to-School guide.
 *
 * DATA INTEGRITY
 *  - Each guide references REAL published toyReview docs, selected by an explicit
 *    curated slug list. Every slug is resolved against the live catalog at seed
 *    time; if any slug does not resolve, the script fails loudly rather than
 *    writing a broken reference. Nothing is fabricated.
 *  - Curation is editorial (allowed for a review site): products were chosen for
 *    topical relevance, then ordered by the site's existing safety score.
 *  - Guides require >= 3 resolved references (schema minimum) or they are skipped.
 *
 * Run: SANITY_API_TOKEN="..." node scripts/seed-guides-batch-2.mjs
 */
import { createClient } from "@sanity/client";

const client = createClient({
  projectId: "ofvgjgsi",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

let k = 0;
const key = (p = "k") => `${p}${++k}`;
const P = (text) => ({
  _type: "block", _key: key("p"), style: "normal", markDefs: [],
  children: [{ _type: "span", _key: key("s"), text, marks: [] }],
});
const H2 = (text) => ({
  _type: "block", _key: key("h"), style: "h2", markDefs: [],
  children: [{ _type: "span", _key: key("s"), text, marks: [] }],
});
const LI = (text) => ({
  _type: "block", _key: key("b"), style: "normal", listItem: "bullet", level: 1, markDefs: [],
  children: [{ _type: "span", _key: key("s"), text, marks: [] }],
});

const GUIDES = [
  {
    _id: "guide-back-to-school-preschool-readiness",
    title: "Back-to-School Guide: Preschool & Daycare Readiness Toys",
    slug: "back-to-school-preschool-readiness",
    min: 24, max: 72,
    excerpt:
      "Starting preschool or daycare? These safety-scored toys build the fine-motor, pre-writing, and self-help skills that make the first weeks easier — plus a practical readiness checklist.",
    intro:
      "The first year of preschool or daycare asks a lot of a small person: sitting for a story, managing a snack, holding a crayon, taking turns, and separating from you at the door. None of that is learned from a worksheet. It is learned through play, at home, in the weeks before and during the transition.",
    intro2:
      "The toys below are chosen for the specific skills that show up on day one — pincer grip and hand strength for pre-writing, sorting and sequencing for early math and pattern recognition, and self-correcting puzzles that build the persistence teachers notice. Every pick is independently safety-scored and recall-checked.",
    sections: [
      {
        h2: "The skills that actually matter on day one",
        bullets: [
          "Pincer grip and hand strength — the foundation for holding a crayon, using scissors, and managing zippers and snaps.",
          "Sorting, matching, and sequencing — early math and pattern thinking, plus the ability to follow a two-step direction.",
          "Sustained attention — sticking with a puzzle long enough to finish it, which transfers directly to circle time.",
          "Self-correction and frustration tolerance — toys where the child can see their own mistake and fix it without an adult stepping in.",
          "Language for classroom life — naming colors, shapes, letters, and numbers so instructions make sense.",
        ],
      },
      {
        h2: "A short readiness checklist for the first week",
        bullets: [
          "Practice the routine before it counts: shoes on, backpack on, out the door, at the real time of day.",
          "Label everything, and let your child help. Recognizing their own name on a cubby is a genuine confidence win.",
          "Rehearse goodbyes deliberately. Short, warm, and predictable beats long and drawn out.",
          "Check the class allergy policy before packing anything, and confirm what the room provides versus what you send.",
          "Send a familiar comfort item if the program allows it, and check their small-parts policy for mixed-age rooms.",
        ],
      },
      {
        h2: "One safety note for the preschool age range",
        bullets: [
          "Many pre-academic toys — letter tiles, lacing beads, small puzzle pieces — are labeled 3+ precisely because they contain small parts. If there is a younger sibling in the house, these need a shelf, not the shared toy bin.",
          "Age labels are safety designations, not difficulty ratings. A capable two-year-old who still mouths objects is not ready for a 3+ set with small pieces.",
        ],
      },
    ],
    // Curated for pre-writing, fine motor, sorting/sequencing, and pre-academics.
    slugs: [
      "melissa-and-doug-self-correcting-alphabet-wooden-puzzles-with-storage-box-52pc",
      "melissa-and-doug-jumbo-numbers-wooden-chunky-puzzle-20pc",
      "melissa-doug-primary-lacing-beads",
      "melissa-doug-bead-sequencing-set",
      "melissa-doug-pattern-blocks-and-boards",
      "melissa-and-doug-shape-sorting-clock",
      "crayola-my-first-tripod-crayons",
      "hape-rainbow-bead-abacus",
    ],
  },
  {
    _id: "guide-best-wooden-nontoxic-toys",
    title: "Best Wooden & Non-Toxic Toys for Babies and Toddlers",
    slug: "best-wooden-nontoxic-toys",
    min: 0, max: 96,
    excerpt:
      "Solid-wood toys with water-based finishes, ranked by our independent safety score — what to look for in materials, finishes, and certifications.",
    intro:
      "Wooden toys earn their reputation honestly: they are durable, quiet, open-ended, and free of the battery compartments and electronics that create their own set of hazards. They also tend to last long enough to hand down.",
    intro2:
      "That said, wood is not automatically safe. Finish, joinery, and piece size all matter. The picks below are solid-wood or wood-primary toys with non-toxic finishes, each independently safety-scored and recall-checked.",
    sections: [
      {
        h2: "What to look for in a wooden toy",
        bullets: [
          "Water-based or food-grade finishes, and paint explicitly described as non-toxic. Unfinished, well-sanded wood is also a good sign.",
          "Sustainably sourced or FSC-certified wood, which usually signals a manufacturer paying attention to supply chain generally.",
          "Smooth edges and tight joinery, with no exposed staples, splinters, or pieces that flex apart.",
          "Recognized safety testing — ASTM F963 and CPSIA compliance, and often EN 71 on European brands.",
          "Piece size appropriate to your child's age. Wooden does not mean choke-proof; small blocks and beads carry the same small-parts risk as plastic ones.",
        ],
      },
      {
        h2: "Caring for wood so it lasts",
        bullets: [
          "Wipe with a barely damp cloth and dry immediately. Never soak wooden toys or put them in the dishwasher.",
          "Air out rather than scrub for odors, and keep wood out of prolonged direct sun to avoid cracking.",
          "Retire any piece that develops a splinter or a crack you cannot sand smooth.",
        ],
      },
    ],
    slugs: [
      "grimms-large-rainbow-stacker",
      "plantoys-my-first-camera",
      "plantoys-stacking-ring",
      "tegu-14-piece-magnetic-blocks",
      "tegu-sunset-24-piece",
      "hape-pound-tap-xylophone",
      "hape-double-rainbow-stacker",
      "hape-fantasia-blocks-train",
    ],
  },
  {
    _id: "guide-best-travel-toys",
    title: "Best Travel & On-the-Go Toys for Babies and Toddlers",
    slug: "best-travel-on-the-go-toys",
    min: 0, max: 24,
    excerpt:
      "Compact, easy-clean toys for flights, car seats, strollers, and restaurant tables — safety-scored, with no small parts to lose under a seat.",
    intro:
      "A good travel toy is a specific thing: light enough to carry, big enough not to become a choking hazard when it rolls under a seat, quiet enough not to make you the villain of row 14, and washable after it hits the floor of an airport.",
    intro2:
      "These picks are all one-piece or clip-on designs with no loose parts, drawn from our safety-scored catalog and chosen specifically for portability.",
    sections: [
      {
        h2: "What makes a toy travel well",
        bullets: [
          "One-piece construction, or a secure clip so it attaches to a stroller, carrier, or bag and cannot be dropped and lost.",
          "No small detachable parts, since anything that can separate will separate in transit — and often out of reach.",
          "Wipeable, non-porous surfaces. Assume it will be dropped on the floor and need a fast clean.",
          "Quiet or volume-controlled. Battery-free is often the better call in shared spaces.",
          "Safe to mouth, because a tired baby will mouth whatever is closest.",
        ],
      },
      {
        h2: "Packing tips that make a difference",
        bullets: [
          "Bring a couple of familiar favorites plus one thing they have never seen. Novelty buys you the most time.",
          "Rotate rather than dump everything out at once. One toy at a time lasts far longer.",
          "Pack a zip bag for dropped items so contaminated toys are contained until you can wash them.",
          "Attach clip-on toys before you board, not during boarding.",
          "Skip anything with loose magnets or an easily opened battery compartment. Airplane floors and hotel rooms are exactly where lost pieces go unnoticed.",
        ],
      },
    ],
    slugs: [
      "fat-brain-dimpl",
      "oball-classic-ball",
      "manhattan-toy-skwish-rattle",
      "manhattan-toy-winkel-rattle",
      "sophie-la-girafe-teether",
      "skip-hop-farmstand-avocado-stroller-toy",
      "lamaze-freddie-the-firefly",
      "leapfrog-learning-friends-book",
    ],
  },
  {
    _id: "guide-best-bath-water-toys",
    title: "Best Bath & Water Toys for Babies and Toddlers",
    slug: "best-bath-water-toys",
    min: 6, max: 72,
    excerpt:
      "Mold-resistant bath and water toys, safety-scored — plus the drainage and supervision rules that matter more than the toys themselves.",
    intro:
      "Water play is one of the best sensory experiences you can offer a small child, and one of the few where the safety rules are non-negotiable. The toys matter. The supervision matters more.",
    intro2:
      "Every pick below is independently safety-scored and recall-checked, with a bias toward designs that drain and dry rather than trap water.",
    sections: [
      {
        h2: "Water safety comes first, always",
        bullets: [
          "Never leave a child unattended near water, including a water table or a bucket. Drowning is silent and can happen in a very small amount of water.",
          "Stay within arm's reach for babies and young toddlers in the bath. A baby seat or ring is not a substitute for hands-on supervision.",
          "Empty water tables, buckets, and tubs immediately after play, and store them so they cannot refill with rain.",
          "Check water temperature before every bath, and keep hot taps out of reach.",
        ],
      },
      {
        h2: "The mold problem, and how to avoid it",
        bullets: [
          "Prefer toys with large drainage holes or fully sealed, one-piece designs. The classic squeeze-and-squirt toy is the hardest kind to keep clean.",
          "Squeeze out all trapped water after every bath and store toys somewhere they can air dry, not in a closed bin.",
          "Clean regularly per the manufacturer's directions, and never mix cleaning products.",
          "If you see black specks inside a toy or squeeze out cloudy water, retire it. Interior mold cannot be reliably cleaned out.",
        ],
      },
    ],
    slugs: [
      "green-toys-bubbling-submarine",
      "green-toys-my-first-submarine",
      "green-toys-rescue-boat-and-helicopter",
      "munchkin-bath-bobbers",
      "skip-hop-zoo-stack-and-pour-buckets",
      "skip-hop-stem-baby-bath-toys",
      "step2-waterpark-wonders-two-tier-water-table",
      "little-tikes-3-in-1-splash-n-grow-water-table",
    ],
  },
  {
    _id: "guide-best-toys-1-2-years",
    title: "Best Toys for 1–2 Year Olds",
    slug: "best-toys-1-2-years",
    min: 12, max: 24,
    excerpt:
      "The walking, climbing, everything-in-the-mouth stage. Safety-scored toys matched to what one-year-olds are actually working on.",
    intro:
      "Between one and two, children are walking, climbing, dumping, filling, and testing every physical limit they can find. They are also still mouthing almost everything, which makes this the age where small parts matter most and where a toy's durability gets a real workout.",
    intro2:
      "These picks are ranked with an eye toward developmental value at this specific stage — cause and effect, early problem solving, and gross-motor practice — and every one is independently safety-scored and recall-checked.",
    sections: [
      {
        h2: "What one-year-olds are working on",
        bullets: [
          "Cause and effect: press, pull, drop, and watch what happens. This is the engine of learning at this age.",
          "Container play: filling and emptying anything they can lift, which builds spatial reasoning and patience.",
          "Gross motor: walking, pushing, climbing, and carrying heavy things for no reason at all.",
          "First problem solving: simple shape sorters and stackers where success is visible and immediate.",
          "Imitation: copying what adults do, which is why pretend phones, carts, and tools land so well.",
        ],
      },
      {
        h2: "Safety priorities at this stage",
        bullets: [
          "Small parts are the top risk, because almost everything still goes in the mouth. If a piece fits through a toilet-paper tube, keep it away from this age.",
          "Check battery compartments for a screw or child-resistant latch on anything that lights up or makes sound.",
          "Watch stability on push toys and ride-ons. A wide base and a low center of gravity prevent most tip-overs.",
          "Re-inspect favorites regularly. At this age toys get chewed, thrown, and stress-tested, and parts loosen.",
        ],
      },
    ],
    slugs: [
      "lovevery-play-kits-0-12",
      "hape-pound-tap-xylophone",
      "hape-shape-sorter-xylophone",
      "fat-brain-toys-dimpl-digits",
      "kiwico-panda-crate",
      "green-toys-stacking-cups",
      "melissa-doug-shape-sorting-cube",
      "vtech-sit-to-stand-walker",
    ],
  },
];

function buildBody(g, resolved) {
  const body = [P(g.intro), P(g.intro2)];
  for (const s of g.sections) {
    body.push(H2(s.h2));
    s.bullets.forEach((b) => body.push(LI(b)));
  }
  body.push(H2("How we score these"));
  body.push(
    P(
      "Every toy is scored out of 100 on four safety factors — material safety, choking risk, recall history, and independent certifications — plus a separate developmental score. We take no sponsorships; placement is earned, never paid. Age ranges reflect safety labeling, not how clever your child is."
    )
  );
  body.push(H2("Our picks"));
  body.push(
    P(
      `Leading this guide: ${resolved.slice(0, 3).map((r) => r.productName).join(", ")}. Tap any product below for its full safety breakdown, materials, and age guidance.`
    )
  );
  return body;
}

async function main() {
  let created = 0;
  for (const g of GUIDES) {
    // Resolve curated slugs against the live catalog. Fail loudly on bad slugs.
    const resolved = await client.fetch(
      `*[_type=="toyReview" && slug.current in $slugs]{_id, productName, "slug": slug.current, safetyScore}
       | order(safetyScore desc)`,
      { slugs: g.slugs }
    );
    const found = new Set(resolved.map((r) => r.slug));
    const missing = g.slugs.filter((s) => !found.has(s));
    if (missing.length) {
      console.error(`✗ ${g.title}: unresolved slugs -> ${missing.join(", ")}`);
      console.error("  Aborting so no broken reference is written.");
      process.exitCode = 1;
      continue;
    }
    if (resolved.length < 3) {
      console.log(`⚠ skip ${g.title} — only ${resolved.length} products`);
      continue;
    }
    const refs = resolved.map((r) => ({ _type: "reference", _key: key("ref"), _ref: r._id }));
    await client.createOrReplace({
      _id: g._id,
      _type: "buyingGuide",
      title: g.title,
      slug: { _type: "slug", current: g.slug },
      targetAgeRange: { minMonths: g.min, maxMonths: g.max },
      reviews: refs,
      reviewReferences: refs,
      excerpt: g.excerpt,
      body: buildBody(g, resolved),
      publishedAt: new Date().toISOString(),
    });
    created++;
    console.log(`✓ ${g.title}\n    /guides/${g.slug}  (${resolved.length} real products)`);
  }
  console.log(`\n✅ ${created} guides created/updated.`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
