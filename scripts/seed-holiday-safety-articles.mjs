/**
 * Seed the three holiday-season safety articles, and add the reciprocal
 * cross-links into the two existing posts they lean on.
 *
 * WHY ONE SCRIPT
 * The cross-links in button-batteries-and-magnets-toy-safety and
 * homeschool-manipulatives-safety-mixed-ages point at posts created here. Split
 * across two scripts, running them in the wrong order writes links to documents
 * that do not exist yet — which is the dangling-reference failure this repo has
 * already had once. Creating the targets and linking to them in one pass removes
 * the ordering trap.
 *
 * SCOPE OF EACH ARTICLE, AND WHAT IT DELIBERATELY DOES NOT COVER
 * Two published posts already own material these three touch:
 *   - button-batteries-and-magnets-toy-safety: the mechanism of coin-cell and
 *     magnet injury, the symptoms, and what to do. Linked, never restated. The
 *     new posts only add the situation-specific part (decorations at child
 *     height; the screw out of a battery door on a living-room floor).
 *   - homeschool-manipulatives-safety-mixed-ages: the mechanics of running
 *     small-parts play with a younger sibling in the room (separate by time, use
 *     a visible boundary, count in and out). Linked, never restated.
 * how-to-read-toy-safety-labels owns the label explainer and the small-parts
 * rule of thumb; secondhand-toy-safety-checklist owns the hand-me-down
 * inspection. Both are linked rather than summarised.
 *
 * DATA INTEGRITY
 *  - No products, ASINs, affiliate links, prices or images are created here.
 *    These are explainer posts, and the blog template renders a product shelf
 *    only when relatedReviews is set, which is deliberately left unset — the
 *    same position the existing explainer posts take.
 *  - No invented statistics, studies, dates, dollar figures or brand names.
 *  - The two external-fact claims are checked against cpsc.gov:
 *      * Recall notices are scoped by model number and, commonly, a range of
 *        date codes rather than by product name. Verified against published
 *        notices, e.g. ride-on toys recalled for two model numbers within a
 *        date-code range, and an activity board recalled for date codes printed
 *        on the packaging.
 *      * Offering a recalled product for sale is unlawful in the US under
 *        section 19 of the Consumer Product Safety Act (15 U.S.C. 2068); CPSC
 *        states this plainly in its guidance to resellers.
 *    Both are stated qualitatively, with no figures attached.
 *  - Standing disclaimers are imported from src/lib/content/evidence.ts rather
 *    than retyped, so they cannot drift from the wording the rest of the site
 *    renders. This is why the script runs under tsx.
 *
 * Run: set -a; . ./.env.local; set +a
 *      node --import tsx scripts/seed-holiday-safety-articles.mjs
 */
import { createClient } from "@sanity/client";
import {
  SCORE_DISCLAIMER,
  REVIEW_METHOD_SENTENCE,
} from "../src/lib/content/evidence.ts";
import { GIFT_GUIDES } from "../src/lib/seo/gift-guides.ts";

const client = createClient({
  projectId: "ofvgjgsi",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

const AUTHOR = "Rodrigo & Vanessa Mulkey";

/**
 * Publish timestamps, ordered so the soonest holiday reads first.
 *
 * /blog orders both the archive and the "In season now" block by publishedAt
 * descending, and all three windows are open together through late November.
 * Thanksgiving therefore carries the latest stamp and Christmas the earliest,
 * which puts the most imminent occasion at the top of the list a reader sees.
 *
 * The stamps are deliberately a few hours behind the authoring time. Every query
 * that feeds /blog, the homepage list and sitemap.ts filters on
 * `publishedAt <= now()`, so a stamp even minutes into the future silently
 * withholds the post from all three — which is how the Thanksgiving article was
 * first written live but absent from the sitemap.
 */
const PUBLISHED = {
  christmas: "2026-11-19T13:00:00.000Z",
  blackFriday: "2026-11-19T13:05:00.000Z",
  thanksgiving: "2026-11-19T13:10:00.000Z",
};

// ─── Portable Text construction ───────────────────────────────────────────────

let k = 0;
const key = (p = "k") => `${p}${++k}`;

/**
 * Every internal href these articles use, and how it is proven to exist.
 *
 * A previous session wrote 15 dangling references by assuming document ids
 * followed a `review-` + slug pattern. The same class of mistake is available
 * here with route paths, so nothing is assumed: static routes are listed against
 * the app directory, gift guides are read from the canonical GIFT_GUIDES array,
 * and every /blog/<slug> is resolved against Sanity before a single document is
 * written. An unresolved href aborts the run.
 */
const STATIC_ROUTES = new Set([
  "/",
  "/about",
  "/best-toys",
  "/blog",
  "/categories",
  "/contact",
  "/gift-guides",
  "/guides",
  "/privacy",
  "/recalls",
  "/reviews",
  "/terms",
  "/transparency",
]);

/** The one external host these articles link to, already linked site-wide. */
const ALLOWED_EXTERNAL = new Set(["https://www.cpsc.gov/Recalls"]);

const giftGuideSlugs = new Set(GIFT_GUIDES.map((g) => g.slug));

/** Hrefs collected while building the bodies, checked before anything is written. */
const seenHrefs = new Set();

const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;

/**
 * Turn `text with [a link](/path)` into a block's children + markDefs.
 *
 * Markdown-style link syntax keeps the article source readable as prose, which
 * matters more than it sounds: the copy below is the deliverable, and reviewing
 * it inside hand-built span arrays is how wording errors survive review.
 */
function spansFor(text) {
  const children = [];
  const markDefs = [];
  let cursor = 0;
  LINK_RE.lastIndex = 0;
  for (const m of text.matchAll(LINK_RE)) {
    if (m.index > cursor) {
      children.push({
        _type: "span",
        _key: key("s"),
        text: text.slice(cursor, m.index),
        marks: [],
      });
    }
    const linkKey = key("link");
    const href = m[2];
    seenHrefs.add(href);
    markDefs.push({ _type: "link", _key: linkKey, href });
    children.push({
      _type: "span",
      _key: key("s"),
      text: m[1],
      marks: [linkKey],
    });
    cursor = m.index + m[0].length;
  }
  if (cursor < text.length) {
    children.push({
      _type: "span",
      _key: key("s"),
      text: text.slice(cursor),
      marks: [],
    });
  }
  if (children.length === 0) {
    children.push({ _type: "span", _key: key("s"), text, marks: [] });
  }
  return { children, markDefs };
}

/** Convert marker-based plain text into Portable Text blocks. */
function toPortableText(src, keyPrefix = "b") {
  const blocks = [];
  for (const raw of src.trim().split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^(H2|H3|P|BULLET):\s*(.+)$/);
    if (!m) throw new Error(`Unparsed line: ${line.slice(0, 70)}`);
    const [, kind, text] = m;
    const { children, markDefs } = spansFor(text);
    const base = { _type: "block", _key: key(keyPrefix), markDefs, children };
    if (kind === "H2") blocks.push({ ...base, style: "h2" });
    else if (kind === "H3") blocks.push({ ...base, style: "h3" });
    else if (kind === "BULLET")
      blocks.push({ ...base, style: "normal", listItem: "bullet", level: 1 });
    else blocks.push({ ...base, style: "normal" });
  }
  return blocks;
}

// ─── Slugs ────────────────────────────────────────────────────────────────────

const CHRISTMAS = "christmas-toy-safety-unwrapping-day";
const THANKSGIVING = "thanksgiving-toy-safety-family-gatherings";
const BLACK_FRIDAY = "black-friday-toy-deals-recall-check";
const BATTERIES = "button-batteries-and-magnets-toy-safety";
const MANIPULATIVES = "homeschool-manipulatives-safety-mixed-ages";
const LABELS = "how-to-read-toy-safety-labels";
const SECONDHAND = "secondhand-toy-safety-checklist";

// ─── Article 1: Christmas ─────────────────────────────────────────────────────

const CHRISTMAS_BODY = `
P: Christmas morning has a shape to it. Paper everywhere, a dozen boxes open at once, and a floor covered in things that were sealed inside cardboard ten minutes earlier.
P: Very little of what makes that risky is about whether the toys are any good. It is the packaging, the hardware that holds a battery door shut, and a room where every child in the house is reaching for everything at the same time.
P: We are parents, not safety professionals, and we test nothing. What follows is the routine our own house runs on, and the reasoning behind it.
H2: The packaging is the hazard, not the toy
P: A boxed toy arrives held in place by whatever it took to survive a shipping container. Plastic-coated wire ties threaded through the cardboard, cable ties, clear film, foam blocks, staples, and sometimes a desiccant sachet tucked in a corner. All of it ends up in the same heap as the wrapping paper, on the floor, which is the worst available place for it.
P: They are not one hazard but several. Film and plastic bags are a suffocation risk for a baby. Wire ties and cable ties have sharp cut ends and are stiff enough to puncture. The offcuts, clips and fasteners are small parts. The sachet is something a toddler will put in their mouth.
P: Opening a rubbish bag before the first present rather than after the last one sounds like housekeeping rather than safety. It is the change that made the biggest difference to what our floor looked like half an hour in, because packaging goes into the bag instead of into the paper pile where it disappears.
H2: Pieces that were contained in the box are not contained out of it
P: A hundred magnetic tiles are one object on a shelf and a hundred objects on a rug. The box was doing the containing, and the box is now in the bin.
P: That matters most where the ages in the room do not match. A set labelled for six and up can be exactly right for the six-year-old it was bought for and a choking risk for the eighteen-month-old crawling past it. The youngest child with access sets the limit for what can be open on the floor, not the child whose name was on the tag.
P: The mechanics of doing this well are the same ones we use for school materials, so rather than repeat them: [separating small-parts play from a younger sibling](/blog/${MANIPULATIVES}) comes down to a tray with a visible edge, a time when the youngest is not circulating, and counting the pieces back in.
H2: Battery doors, and the screw that holds them
P: Anything that lights up, beeps or sings has a battery compartment, and the compartment is worth looking at before the toy is handed over. What you want is a door that needs a screwdriver or a deliberate push-and-turn rather than one that lifts off under a fingernail.
P: The screw itself is the part that gets missed. Somebody takes it out with a small screwdriver on Christmas morning, puts the batteries in, and sets the screw down on the carpet. It is now a small metal object on the floor of a house full of children, and the toy it belongs to is already being carried around the room. Put it back before the toy goes anywhere.
P: Coin cells and loose magnets we treat as a separate category from everything else here, because the injury happens inside the body and a child can look completely fine for hours afterwards. That is its own article: [what button batteries and magnets actually do, and what to do about it](/blog/${BATTERIES}).
H2: Match the label to the child, not to how clever they are
P: The age on the box is mostly a safety statement rather than a difficulty rating. A three-and-up label usually means the toy contains parts small enough to be a choking risk under three, which says nothing about whether a particular two-year-old could work out how to use it. The longer version is in our piece on [what the labels on a toy box actually mean](/blog/${LABELS}).
P: Gifts make this harder in two specific ways. The person buying usually will not be in the room when the toy is played with, so they buy for the child they picture rather than for the house the toy lands in. And a present bought a year or two up is a compliment — it says the child is ahead — which makes it an awkward thing to quietly put back in the box.
P: Our own answer is unsatisfying and works anyway: the toy stays, the access changes. It goes on a high shelf, it comes out when the younger one is asleep or in another room, and nobody has to tell a relative their present was a mistake.
H2: Five minutes before the boxes go out
P: All of this is reading that can only be done while the packaging is still in the room.
BULLET: Write down or photograph the model number and any date code. [Recall notices name specific models and production runs](/blog/${BLACK_FRIDAY}) rather than product names, and on some toys the code is printed only on the packaging you are about to recycle.
BULLET: Keep the instructions, or photograph those too. A toy with a safety function — a harness, a latch, a stabilising leg — only works as intended if it is assembled as intended.
BULLET: Count the pieces against the number on the box. A set that arrived with sixty and goes away as fifty-eight is then a known fact rather than a suspicion.
BULLET: Open every battery door, check it closes firmly, and account for every screw.
BULLET: Look up anything that arrived secondhand before it joins the rotation. Our [hand-me-down inspection routine](/blog/${SECONDHAND}) is the long version, and the [recalls page](/recalls) republishes the CPSC's public data if you would rather search by name.
H2: What we do not do
P: We do not measure parts, send anything to a laboratory, or verify a manufacturer's certification claims. When a review here records that a toy is labelled for three and up, that is the label and not our determination. ${REVIEW_METHOD_SENTENCE}
P: ${SCORE_DISCLAIMER}
P: The box in front of you, the manufacturer's own warnings, and the [official recall notices](https://www.cpsc.gov/Recalls) are the authorities here. Nothing on this site replaces them.
P: If there is still shopping to do, our [gift guides](/gift-guides) are grouped by the age the manufacturer printed on the box, which is the number this article keeps coming back to.
`;

// ─── Article 2: Thanksgiving ──────────────────────────────────────────────────

const THANKSGIVING_BODY = `
P: Thanksgiving is the one day a year when a toddler spends eight hours in a house nobody childproofed, surrounded by relatives who are all slightly distracted, on a floor covered in other children's toys.
P: None of that is a reason to stay home. It does change what is worth two minutes when you arrive, and most of the useful things are quick.
H2: What goes in the bag
P: The instinct is to pack whatever keeps a child busiest for longest. In a car the more useful question is what each toy does if you have to stop hard.
P: Anything rigid, dense or heavy is a loose object in a moving vehicle, and a child in a rear-facing seat is behind you where you cannot see what they are doing with it. Soft, light and slightly boring travels better: books, fabric, a plush animal.
P: The second car-specific point is that nobody is supervising. A toy that is only reasonable under supervision is not a car toy, because the driver is driving. Small-parts sets and anything with a battery door that has worked loose stay at home.
P: There is also a case for bringing two or three familiar toys even if the house you are going to is full of them. A toy you brought is a toy you have already looked at, and it reduces how much of the afternoon depends on what happens to be in somebody else's toy box.
H2: A house that was childproofed thirty years ago, or never
P: A grandparent's house works perfectly well for the people who live in it. That is a different standard from a house set up for someone who is eleven months old and puts everything in their mouth.
P: The toy box is the part worth opening before the children do, because it is often a genuine archive: things kept from when the adults in the room were small, plus whatever the last set of visiting children left behind. Older toys were legal when they were sold and may not meet what we would expect now, and recall notices reach the original buyer rather than the fourth family to own something. We have a [full inspection routine for hand-me-downs](/blog/${SECONDHAND}); on the day, the short version is cracked plastic, loose eyes and wheels, chipping paint on anything old, long cords, and any battery door that opens with a fingernail.
P: Childproofing a whole house during a holiday is not realistic and not necessary. Clearing one room is. Floor cleared, coats and bags up high, door shut or gated, and that is where the youngest plays. Handbags are the quiet problem in that list — somebody's medication, somebody's keys with a coin-cell fob on them — and they get put down on the nearest low chair by whoever walks in last.
P: The other thing that works better than wandering around inspecting is one question to whoever's house it is: where can the little one crawl around without somebody standing over them? People know their own homes. They will usually tell you about the step you had not noticed.
H2: Cousins
P: Mixed-age play is the hardest part of the day, and the part most worth thinking about in advance, because the age label on a toy was set for the child it was bought for and not for the child who crawls over to it.
P: An eight-year-old's building set, bead kit or anything with a hundred pieces is entirely reasonable for them and a choking risk for a one-year-old on the same rug. The older child is not doing anything wrong, which is exactly why telling them to watch their brother is not a plan. We wrote up [how we run small-parts materials with a younger sibling in the room](/blog/${MANIPULATIVES}) for a homeschool setting, and the mechanics carry over unchanged.
P: Two things help more than supervision on its own. Give small-parts play a physical boundary: a table the toddler cannot reach, or a room with a door, rather than a corner of the same floor. And give the toddler something of their own that is genuinely worth having, because the pull of the pile they are not allowed near is most of the problem.
P: It is also worth saying to the older children once, plainly, that the small pieces have to stay on the table because the baby will eat them. In our experience they are better at this than adults expect. They are the ones actually down on the floor.
H2: Holiday decorations run on coin cells
P: Decorating has quietly become a battery category. Flameless candles and battery tea lights, cards that play music, light-up ornaments, wreaths on a timer, figures that sing when you walk past — most of them run on coin cells, and a decoration is not a toy, so nobody designed it around a child finding it.
P: Coin cells and loose magnets are the two hazards we treat differently from everything else, because the harm happens inside the body and the early hours can look unremarkable. The mechanism, the symptoms and what to do are all in [our article on button batteries and magnets](/blog/${BATTERIES}), and that is the one to read if you only read one.
P: The decoration-specific part is short. Battery covers on decorations are often a sliding panel or one small screw rather than the secured compartment a toy would need. Decorations sit at child height on side tables, hearths and low shelves, which is where a toy would never be allowed. And a musical card is the easiest thing in the house to pull apart, which is the point of a musical card.
P: Spare batteries are the other half of it. They arrive in a blister pack alongside the decorations, the pack gets opened in the kitchen, and the leftovers end up loose in a drawer that a child can open.
H2: The short version
BULLET: Pack soft and light for the car, and leave small-parts sets at home.
BULLET: Open the toy box before the children do, looking hardest at old painted toys and easy battery doors.
BULLET: Clear one room rather than a house, and get the handbags off the low chairs.
BULLET: Keep small-parts play on a surface or behind a door, not merely under an eye.
BULLET: Treat a decoration with a coin cell in it exactly as you would treat a toy with a coin cell in it.
P: Written down it reads like a project. On the day it is one walk around a room and a short conversation with two people.
H2: What we do not do
P: We do not test toys, measure parts against a small-parts gauge, or verify anybody's certification claims. ${REVIEW_METHOD_SENTENCE} Where a review here records an age range, that is the manufacturer's labelling.
P: ${SCORE_DISCLAIMER}
P: The [official recall notices](https://www.cpsc.gov/Recalls) and the manufacturer's own warnings are the authorities. Our [recalls page](/recalls) republishes the CPSC's public data and shows when it last synchronised, which is useful for looking something up but is not a substitute for the notice itself.
P: This article is general safety information, not medical advice. For any specific concern about your child, contact poison control, your pediatrician, or emergency services.
`;

// ─── Article 3: Black Friday ──────────────────────────────────────────────────

const BLACK_FRIDAY_BODY = `
P: A toy deal hands you two things at once: a discount and a deadline. The deadline is the problem, because every check worth doing takes about a minute and the stock is visibly going.
P: There is one of those checks that matters more than the rest, and it is not the one most shopping advice leads with.
H2: A recall does not apply to a product. It applies to a batch.
P: Read an actual recall notice and the scope is narrow. It names model numbers, and very often a range of date codes as well — the production run the problem was found in. One notice might cover two model numbers with date codes falling between a specific pair of values. Another covers two models that share a single code. On some toys that code is printed on the packaging rather than on the toy.
P: That is the right way to write a recall and an awkward thing to shop against. Searching a product name tells you whether anything sold under that name has ever been recalled. It does not tell you whether the box in your hand is in scope.
P: It also means the version matters. A toy line gets revised, tooling changes, a supplier changes, and the name on the front of the box stays exactly the same. The model number is the part that tells those apart.
H2: Why that lands hardest on a discount
P: A low price usually has a reason, and the ordinary reasons are not sinister. The retailer is clearing stock that has been sitting, or the line has been superseded by a newer version, or a quantity was bought in for the sale months ago.
P: All three of those mean older production. Older production is what recall notices name, because a problem takes time to surface: units ship, incidents get reported, the notice follows months or years later. The clearance pile and the recall scope are selecting for the same stock from opposite ends.
P: None of that is an argument against buying a deal. It is an argument for checking the specific model instead of the product, which is a different search from the one most of us run.
H2: Checking in the time you actually have
P: In a shop, with the box in your hand: find the model number, usually on an end flap or a label underneath, and search it together with the brand against the recall database. The [CPSC's recall listing](https://www.cpsc.gov/Recalls) is the authority. Our [recalls page](/recalls) republishes the same public data, is searchable, and tells you when it last synchronised, which makes it a reasonable place to browse — but for something you are about to buy, go to the source.
P: Buying online: the model number is often missing from the listing altogether, and that absence is itself information. A listing that will not say which version it is selling cannot be checked before you pay, so the check moves to the moment the box arrives, before the toy is handed over.
P: Third-party marketplace listings are the ones to slow down on. Offering a recalled product for sale is unlawful in the United States under the Consumer Product Safety Act, which has never stopped recalled stock turning up on resale listings. What it means in practice is that nobody involved is going to volunteer it.
P: And photograph the label before the packaging goes out. The code you will want in March is printed on cardboard that gets recycled in December, which is the same point we make about [the morning the boxes are opened](/blog/${CHRISTMAS}).
H2: The age label, under time pressure
P: The number on the box is the check most likely to get skipped while a deal is running out, and it costs nothing.
P: A three-and-up label is usually about small parts rather than difficulty, and [the labels article](/blog/${LABELS}) goes through what the rest of the fine print means. The time-pressure failure mode is specific: you are buying for a child you have in mind, you see a price, and you do not stop to ask whether there is a younger sibling who will be in the room. The age that matters is the youngest child with access, not the one whose name goes on the tag.
P: The related one is buying up a size. A deal on next year's toy is still a deal, provided somebody decides now where it lives in the meantime, rather than discovering the question on the day it gets unwrapped.
H2: Four things we check, in order
BULLET: The model number, against the recall database. Brand plus model, not brand plus product name.
BULLET: The age label, read against the youngest child who will have access rather than the recipient.
BULLET: The battery door, on anything that lights up or makes a noise. A coin cell behind a cover that slides off is the one thing that goes straight back on the shelf — [here is why we are strict about that](/blog/${BATTERIES}).
BULLET: Whether the listing or the box says which version it is. If it does not, the check happens on arrival instead.
P: Three of those take under a minute. The fourth takes none, because either the model number is printed there or it is not.
H2: What we do not do
P: We hold no price data of any kind, so nothing here can tell you whether a discount is real or what a toy is worth. This is about the other numbers on the label.
P: We also do not test toys, measure parts, or verify certification claims. ${REVIEW_METHOD_SENTENCE} Recall information comes from the CPSC's public database, and age ranges are the manufacturer's labelling.
P: ${SCORE_DISCLAIMER}
P: If you want somewhere to start, our [gift guides](/gift-guides) group reviewed toys by the age their manufacturer labelled them for, and every pick links to its own safety write-up.
`;

// ─── Cross-links added into the two existing posts ────────────────────────────

/**
 * Reciprocal links, inserted into posts that already exist.
 *
 * Keyed with an `xlink-` prefix and removed before reinsertion, so re-running
 * this script replaces the paragraph rather than stacking another copy. The
 * anchor is matched on the opening words of a real block: if the post has been
 * reworded since, the run aborts instead of guessing where the link belongs.
 */
const CROSS_LINKS = [
  {
    slug: BATTERIES,
    xlinkKey: "xlink-holiday-batteries",
    anchorStartsWith: "Pay extra attention during gift season and visits",
    position: "after",
    text: `Holidays concentrate both of these. Decorations with coin cells go up at child height, cards that play music arrive in the post, and an older cousin's magnetic set comes out on a floor with a crawling toddler on it. Two companion pieces cover those days specifically: [toy safety at family gatherings](/blog/${THANKSGIVING}) and [the morning the presents are opened](/blog/${CHRISTMAS}).`,
  },
  {
    slug: MANIPULATIVES,
    xlinkKey: "xlink-holiday-manipulatives",
    anchorStartsWith: "Searching the manufacturer and product name against the CPSC",
    position: "after",
    text: `The same mixed-age problem travels badly. In somebody else's living room, with cousins spanning five years and no tray in sight, none of the routine above is set up — which is why that day got its own piece: [toy safety at a family gathering](/blog/${THANKSGIVING}).`,
  },
];

// ─── Documents ────────────────────────────────────────────────────────────────

const ARTICLES = [
  {
    slug: CHRISTMAS,
    title: "Christmas Toy Safety: What Happens After the Paper Comes Off",
    excerpt:
      "The riskiest part of Christmas morning is rarely the toy. It is the packaging on the floor, the screw out of a battery door, and a room where the youngest child can reach everything at once.",
    publishedAt: PUBLISHED.christmas,
    body: CHRISTMAS_BODY,
  },
  {
    slug: THANKSGIVING,
    title: "Thanksgiving Toy Safety: Travelling, Grandparents' Houses, Cousins",
    excerpt:
      "Thanksgiving puts a toddler in a house nobody childproofed, with cousins who brought their own small-parts toys and decorations that run on coin cells. Here is what we check when we arrive.",
    publishedAt: PUBLISHED.thanksgiving,
    body: THANKSGIVING_BODY,
  },
  {
    slug: BLACK_FRIDAY,
    title: "Black Friday Toy Deals: Check the Model, Not the Product Name",
    excerpt:
      "A recall names model numbers and date codes, not product names — and a clearance price usually means older production. The checks that fit in the time a deal gives you.",
    publishedAt: PUBLISHED.blackFriday,
    body: BLACK_FRIDAY_BODY,
  },
];

// ─── Fail-closed href resolution ──────────────────────────────────────────────

async function assertHrefsResolve(newSlugs) {
  const blogSlugs = new Set(newSlugs);
  const existing = await client.fetch(
    `*[_type=="blogPost" && defined(slug.current)].slug.current`
  );
  existing.forEach((s) => blogSlugs.add(s));

  const unresolved = [];
  for (const href of [...seenHrefs].sort()) {
    if (href.startsWith("http")) {
      if (!ALLOWED_EXTERNAL.has(href)) unresolved.push(`${href} (external, not allow-listed)`);
      continue;
    }
    if (!href.startsWith("/")) {
      unresolved.push(`${href} (not an absolute path)`);
      continue;
    }
    if (STATIC_ROUTES.has(href)) continue;
    const blog = href.match(/^\/blog\/([^/]+)$/);
    if (blog) {
      if (!blogSlugs.has(blog[1])) unresolved.push(`${href} (no blogPost with that slug)`);
      continue;
    }
    const guide = href.match(/^\/gift-guides\/([^/]+)$/);
    if (guide) {
      if (!giftGuideSlugs.has(guide[1])) unresolved.push(`${href} (not in GIFT_GUIDES)`);
      continue;
    }
    unresolved.push(`${href} (no resolver for this route shape)`);
  }

  console.log(`\nlink targets: ${seenHrefs.size} distinct`);
  [...seenHrefs].sort().forEach((h) => console.log(`  ${h}`));
  if (unresolved.length) {
    console.error(`\n✗ ${unresolved.length} href(s) do not resolve:`);
    unresolved.forEach((u) => console.error(`    ${u}`));
    throw new Error("refusing to write documents with dangling links");
  }
  console.log("  all resolve ✓");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.SANITY_API_TOKEN) {
    throw new Error("SANITY_API_TOKEN is not set");
  }

  // Build every body first so seenHrefs is complete before anything is written.
  const docs = ARTICLES.map((a) => ({
    _id: `blog-${a.slug}`,
    _type: "blogPost",
    title: a.title,
    slug: { _type: "slug", current: a.slug },
    excerpt: a.excerpt,
    author: AUTHOR,
    publishedAt: a.publishedAt,
    body: toPortableText(a.body),
  }));
  const patches = CROSS_LINKS.map((c) => ({
    ...c,
    block: toPortableText(`P: ${c.text}`, "x")[0],
  }));

  for (const d of docs) {
    if (d.excerpt.length > 300) {
      throw new Error(`${d.slug.current}: excerpt is ${d.excerpt.length} chars (max 300)`);
    }
  }

  await assertHrefsResolve(docs.map((d) => d.slug.current));

  console.log("");
  for (const doc of docs) {
    /*
     * Carry the seasonal window across a re-run.
     *
     * createOrReplace writes the whole document, so a second run of this script
     * silently dropped the `seasonal` object that set-seasonal-windows.mjs had
     * already written — and the only visible symptom is a post quietly falling
     * out of the "In season now" block on /blog, which nobody would notice from
     * this script's output. Reading it back and preserving it keeps the two
     * scripts order-independent.
     */
    const existing = await client.fetch(`*[_id==$id][0]{seasonal}`, { id: doc._id });
    if (existing?.seasonal) doc.seasonal = existing.seasonal;
    await client.createOrReplace(doc);
    const season = doc.seasonal
      ? ` · season ${doc.seasonal.startMonthDay} → ${doc.seasonal.endMonthDay}`
      : "";
    const headings = doc.body.filter((b) => b.style === "h2").length;
    const links = doc.body.reduce((n, b) => n + (b.markDefs?.length || 0), 0);
    console.log(
      `✓ /blog/${doc.slug.current}\n    ${doc._id} · ${doc.body.length} blocks · ${headings} sections · ${links} links${season}\n    "${doc.title}"`
    );
  }

  console.log("");
  for (const p of patches) {
    const post = await client.fetch(
      `*[_type=="blogPost" && slug.current==$slug][0]{_id, body}`,
      { slug: p.slug }
    );
    if (!post) throw new Error(`no post found for slug "${p.slug}" — not inventing one`);

    // Drop a previous run's paragraph so the operation is idempotent.
    const body = post.body.filter((b) => b._key !== p.xlinkKey);
    const at = body.findIndex((b) =>
      (b.children || []).map((c) => c.text).join("").startsWith(p.anchorStartsWith)
    );
    if (at === -1) {
      throw new Error(
        `${p.slug}: anchor block not found ("${p.anchorStartsWith.slice(0, 50)}…"). ` +
          `The post was reworded; update the anchor rather than guessing.`
      );
    }
    const block = { ...p.block, _key: p.xlinkKey };
    body.splice(p.position === "after" ? at + 1 : at, 0, block);
    await client.patch(post._id).set({ body }).commit();
    console.log(
      `✓ cross-link into /blog/${p.slug}\n    ${post._id} · inserted at block ${at + 1} · key ${p.xlinkKey}`
    );
  }

  console.log(`\n${docs.length} articles seeded, ${patches.length} posts cross-linked.`);
  console.log("Next: node scripts/set-seasonal-windows.mjs to open their seasonal windows.");
}

main().catch((e) => {
  console.error(`\n${e.message}`);
  process.exit(1);
});
