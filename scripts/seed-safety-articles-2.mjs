/**
 * Seed two new safety articles (as blogPost docs, which is where safety content
 * actually renders at /blog/[slug] — the safetyArticle type has no route).
 *
 * PRODUCTION PROCESS
 *  1. Drafted by two specialist UX/safety copywriters (separate briefs).
 *  2. Reviewed by a specialist safety editor for factual accuracy, medical
 *     safety, liability, tone, and single-publication voice. Editor rulings are
 *     applied in the final copy below.
 *
 * DATA INTEGRITY
 *  - No invented statistics, studies, dates, or dollar figures. Scale is
 *    conveyed qualitatively.
 *  - No invented experts, quotes, or credentialed bylines. Byline is the real
 *    site owners (Rodrigo & Vanessa Mulkey).
 *  - No brand is named or accused.
 *  - Emergency phone numbers were independently verified before inclusion:
 *      Poison Help 1-800-222-1222  (poisonhelp.hrsa.gov, poison.org, MedlinePlus)
 *      National Battery Ingestion Hotline 1-800-498-8666 (poison.org, NIH MedlinePlus)
 *  - Editor correction applied: the CPSC small-parts cylinder is 1.25 in inside
 *    diameter; a household toilet-paper tube is WIDER (~1.5-1.75 in), so it is
 *    presented as a deliberately cautious rough stand-in, not an equivalent.
 *  - Editor correction applied: button-battery guidance defaults to nothing by
 *    mouth while explicitly deferring to poison control / clinicians (a
 *    professional-only exception exists for older children), and never delaying
 *    transport. No dosing instructions are given.
 *
 * Run: SANITY_API_TOKEN="..." node scripts/seed-safety-articles-2.mjs
 */
import { createClient } from "@sanity/client";

const client = createClient({
  projectId: "ofvgjgsi",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

const AUTHOR = "Rodrigo & Vanessa Mulkey";

let k = 0;
const key = (p = "k") => `${p}${++k}`;

/** Convert marker-based plain text into Portable Text blocks. */
function toPortableText(src) {
  const blocks = [];
  for (const raw of src.trim().split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^(H2|H3|P|BULLET):\s*(.+)$/);
    if (!m) throw new Error(`Unparsed line: ${line.slice(0, 60)}`);
    const [, kind, text] = m;
    const base = {
      _type: "block",
      _key: key("b"),
      markDefs: [],
      children: [{ _type: "span", _key: key("s"), text, marks: [] }],
    };
    if (kind === "H2") blocks.push({ ...base, style: "h2" });
    else if (kind === "H3") blocks.push({ ...base, style: "h3" });
    else if (kind === "BULLET")
      blocks.push({ ...base, style: "normal", listItem: "bullet", level: 1 });
    else blocks.push({ ...base, style: "normal" });
  }
  return blocks;
}

const ARTICLE_1 = `
P: Most toy hazards announce themselves. A cord that is too long, a small part that pops loose, a stuffed animal with an eye working its way free. You spot it, you fix it, you move on.
P: Button batteries and high-powered magnets are different. They are small, they look harmless, and the harm they cause happens inside the body where you cannot see it. Both are treated as urgent by poison control centers and emergency departments.
P: This is not a reason to panic. It is a reason to know two specific things well. Learning them takes about ten minutes and changes how you respond in the moment that matters.
H2: Why these two hazards get overlooked
P: Both break the usual mental model of choking. We are trained to think about airway blockage, so we check whether an object is small enough to lodge in a throat. A swallowed button battery or a pair of magnets can clear the airway entirely and still cause serious injury.
P: They are also mostly not in toys. The battery in your TV remote is the same type used in a light-up toy. The safest toy shelf in the world does not cover the whole risk.
H2: Button batteries: small, shiny, and fast-acting
P: Button batteries, also called coin cells, are the flat silver discs that power small electronics. Children find them because they are shiny, easy to grip, and often loose in a drawer or fallen out of a device.
H3: What happens inside the body
P: When a button battery lodges in a child's esophagus, saliva completes a circuit across the battery. That current generates a caustic substance against the surrounding tissue, which can cause severe internal burns in as little as two hours.
P: The damage is not from acid leaking out of the battery. That is why a battery that looks perfectly intact is still dangerous, and why a dead battery pulled from a toy that stopped working is still dangerous.
P: One more detail matters more than any other: a child may seem completely fine at first. Symptoms can appear hours later, and their absence early on is not reassurance. Waiting to see what develops is not a safe plan.
H3: What Reese's Law changed
P: In the United States, Reese's Law requires consumer products using button cells to have child-resistant battery compartments and clear warning labels. It is real progress, and that kind of secured compartment is worth looking for on anything that lights up, beeps, or sings.
P: What the law cannot do is reach backward into what you already own. Older devices, hand-me-down toys, and loose spare batteries in a junk drawer all predate the requirement.
H2: High-powered magnets: the danger is in the number
P: Small rare-earth magnets, usually neodymium, are dramatically stronger than the fridge magnets most of us grew up with. A single swallowed magnet will often pass without incident. Two or more is a different situation.
P: Separate magnets can attract each other through the walls of the intestine, pinching the tissue caught between them. That pressure can cause perforation, blockage, or infection that spreads, and it can require emergency surgery.
P: The US toy safety standard ASTM F963 restricts loose high-powered magnets in toys intended for children under 14. Magnetic building sets and desk toys sold to older kids and adults are the more common source, which is why mixed-age households deserve extra attention.
H3: Why the symptoms are easy to misread
P: Magnet ingestion often looks like an ordinary stomach bug. Vague belly pain, nausea, vomiting, low appetite, tiredness. There is nothing dramatic to point at, and children frequently do not report swallowing anything.
P: So hold onto this: if you find a magnetic set with pieces missing and your child seems off, treat those two facts as connected until a clinician tells you otherwise.
H2: Where these hazards actually hide
P: Walk through your home mentally. Most families are surprised by how many sources turn up.
P: Common button battery locations:
BULLET: TV, streaming, and air conditioner remotes
BULLET: Car key fobs and garage door openers
BULLET: Bathroom and kitchen scales
BULLET: Musical or light-up greeting cards
BULLET: Hearing aids and their storage cases
BULLET: Digital thermometers
BULLET: Light-up shoes, small flashlights, and novelty toys
BULLET: Watches, fitness trackers, and small kitchen timers
BULLET: Loose spare batteries in drawers, purses, and bedside tables
P: Common high-powered magnet locations:
BULLET: Magnetic building and construction sets
BULLET: Magnetic desk toys and puzzle balls
BULLET: Magnetic tiles that have cracked open
BULLET: Fridge magnets, especially decorative ones with small backing magnets
BULLET: Magnetic closures on bags, jewelry, and toy accessories
BULLET: Older hand-me-down toys with unknown history
H2: What to do right now
P: This is a one-time pass. It does not need to be perfect to be worth doing.
BULLET: Check that every battery compartment your child can reach requires a tool or a firm push-and-turn to open. If a cover slides off with a fingernail, secure it or move the device out of reach.
BULLET: Collect loose button batteries into one sealed container stored high and out of sight. Do the same with used ones until you can recycle them, since they remain dangerous.
BULLET: Inspect magnetic sets for cracked pieces and count what is missing. Store the set up high between uses rather than in the general toy bin.
BULLET: Pay extra attention during gift season and visits. Novelty cards, keychains, and older cousins' toys are frequent entry points.
BULLET: Tell every caregiver, including grandparents and sitters, that these two items are emergency-room urgent. Shared knowledge is what makes a fast response possible.
H2: If you think your child swallowed a battery or a magnet
P: Act on suspicion. You do not need to have seen it happen, and you do not need symptoms.
BULLET: Go to the emergency room immediately. Call 911 or your local emergency number if your child is in distress.
BULLET: Call Poison Help at 1-800-222-1222, or the National Battery Ingestion Hotline at 1-800-498-8666, for guidance on the way, and follow their instructions.
BULLET: Do not induce vomiting.
BULLET: Give nothing by mouth as your default, unless emergency services, poison control, or a clinician specifically tells you otherwise. There is a narrow exception in published guidance for older children, but whether it applies is a professional's call, not a parent's.
BULLET: Never delay getting to the hospital in order to give anything.
BULLET: Bring the packaging, the device, or an identical battery or magnet if you have one. It helps clinicians identify size and type quickly.
H3: Warning signs worth acting on
BULLET: Drooling, gagging, refusing to eat or drink, or pain when swallowing
BULLET: Chest or throat pain, coughing, wheezing, or noisy breathing
BULLET: Stomach pain, repeated vomiting, or unusual lethargy
BULLET: Blood in saliva, vomit, or stool
BULLET: Any sudden fussiness you cannot explain, especially near a device or a magnetic set with missing pieces
P: Whether imaging is needed is a clinician's decision. Your job is to get there quickly and describe what you found.
H2: The takeaway
P: You do not need to strip every battery and magnet out of your home. You need secured compartments, high storage, awareness of where these things actually live, and a clear plan for the moment something goes missing.
P: That plan is the whole point.
H2: Keep looking with us
P: We are Rodrigo and Vanessa, and we built SafeNest Toys to be the resource we could not find when our own kids were small. Our reviews score toys on safety criteria including battery compartment security and how magnets are handled, not just play value.
P: For official recall notices, the CPSC maintains a searchable database, and we flag recalls on the products we cover. Browse whenever it is useful. No urgency, no pressure.
P: This article is general safety information, not medical advice. For any specific concern about your child, contact poison control, your pediatrician, or emergency services.
`;

const ARTICLE_2 = `
P: A neighbor drops off a bin of gently used toys. Your sister-in-law hands over the entire baby stage in three garbage bags. For plenty of families this is how the playroom gets filled, and there is nothing second-rate about it.
P: The only thing worth adding is a short pause before the toys go into rotation. Most hand-me-downs pass a basic check easily. The few that do not are usually obvious once you know where to look.
P: Here is the routine we use, in order, plus the categories we are pickier about and a kind way to say no when you need to.
H2: Why older toys deserve a second look
P: Toy safety rules have tightened steadily over the years. That is good news for anything new and a reason to be thoughtful about anything old. A toy made a decade or two ago was legal when sold but may not meet what we would expect today.
P: Two milestones are worth knowing. Lead paint was banned from US household paint in 1978, so painted items that may predate that deserve real caution. The Consumer Product Safety Improvement Act of 2008 set federal limits on lead and phthalates in children's products, and ASTM F963 is the current US toy safety standard.
P: There is also a quieter issue. Recall notices usually reach the original buyer, not the third or fourth family down the line, so hand-me-downs and thrift shelves are exactly where recalled items tend to linger. None of that is anyone's fault. It just means a quick lookup is worth the time.
H2: The nine-step inspection
P: This takes about ten minutes for a full bin, less for a single toy. Work in order so the deal-breakers surface first.
BULLET: 1. Physical condition. Look for cracked or split plastic, sharp edges, splinters, exposed screws, rust, chipped or peeling paint, frayed seams, and crumbling foam. Toys age, and aging creates hazards the original design never had. Squeeze it, flex it, give it a shake.
BULLET: 2. Small parts. The official US test uses a cylinder with an inside diameter of about one and a quarter inches, and it has depth as well as width, so long thin objects can fail it too. A household toilet paper tube is a bit wider than that, which makes it a usefully cautious stand-in at home: if a piece slips through the tube, treat it as a choking hazard for a child under three. Test loose pieces, and also the parts that could come loose, like eyes, wheels, buttons, squeakers, and pom-poms.
BULLET: 3. Battery compartments. Open it. Many current toys use a screw and a child-resistant latch, and older ones often do not. If the cover pops off with a fingernail, or a coin-sized button battery is easy to reach, that toy needs a repair or needs to go. Check for corrosion or leaked residue while you are in there.
BULLET: 4. Cords, strings, ribbons, and straps. Long cords and pull strings are a strangulation risk for babies and young toddlers, especially anything that could reach into a crib or playpen. Shorten or remove what you can, and set aside anything where the cord is the entire point.
BULLET: 5. Magnets. Look hard at magnetic toys. If a small, strong magnet can work loose, the toy is not worth keeping. Swallowed magnets can attract each other through tissue and cause serious internal injury, and this is one of the few risks where the safe answer is simply no.
BULLET: 6. Age labeling. Find the age grading if it is still legible. Those labels are about safety, not intelligence, so a toy marked three and up in a house with a one-year-old needs a plan for where it lives.
BULLET: 7. Smell and moisture. Trust your nose. A musty, sour, or chemical smell usually means mold, mildew, or something absorbed in storage, and porous items rarely recover fully. Check tags and seams for dark spotting.
BULLET: 8. Recall check. The CPSC keeps a searchable recall database. Search the brand and product name for anything with batteries, magnets, straps, or a safety function. This is the highest-value minute in the whole process.
BULLET: 9. Missing pieces and manuals. A toy missing a strap, lock, lid, or stabilizing part may not work the way it was tested to work. If you cannot find instructions online and the toy needs assembly or has a safety function, treat it as incomplete.
P: A checklist reduces risk. It does not guarantee safety, and when a manufacturer's instructions or your pediatrician's advice differ, follow those instead.
H2: Categories where we are extra careful
P: Some items pass every visual check and still are not great secondhand candidates.
H3: Anything with a safety-critical function
P: Car seats, carriers, harnesses, high chair restraints, sleep products, and gates all depend on materials and hardware performing exactly as designed. Webbing stretches, plastic grows brittle, and you usually cannot know an item's full history, including whether it was in a crash or stored in a hot attic. Standards here have changed substantially, which is why older drop-side cribs are no longer considered safe and their sale was banned in the US.
H3: Soft, porous items
P: Plush toys, fabric books, foam mats, and anything stuffed can hold moisture, dust mites, and mold you cannot see. They are fine if they are washable and you can wash them. If the label is gone and the item cannot be laundered, it is an easy pass.
H3: Painted items of unknown age
P: Vintage painted wooden toys are charming and often beautifully made, but if you cannot establish the age, treat the paint as a question mark. Chipping or peeling paint on an older item is the clearest signal to keep it away from a child who still mouths things.
H3: Magnets and accessible button batteries
P: Worth repeating. High-powered magnet sets and any toy where a coin cell can be reached are the two categories we decline without hesitation.
H2: Cleaning without ruining anything
H3: Hard plastic
P: Warm water with a little dish soap, a soft brush for the seams, and a thorough rinse handles most of it. For a deeper clean, use a household disinfectant exactly as its label directs, then rinse well and let it dry completely. Never mix cleaning products. Skip the dishwasher unless the toy says it is safe, and never submerge anything with a battery compartment or electronics. Wipe those with a damp cloth instead.
H3: Wood
P: Wood hates soaking. Wipe with a barely damp, soapy cloth, then dry immediately with a towel. Fresh air and sunlight help with odor. A light sanding smooths a rough spot, but if you would be sanding paint of unknown age, stop and retire the toy instead.
H3: Fabric and plush
P: Follow the care tag first. If it is machine washable, a mesh bag or pillowcase protects seams and eyes, and drying it fully matters because trapped dampness is what restarts the smell. For non-washable plush, surface-clean with a damp cloth and air dry. If a musty smell survives one full wash, it is usually there for good.
H2: How to decline without hurting anyone
P: People offer hand-me-downs out of generosity, and most would far rather hear no than hand you something risky. Keep it short, make it about the item, and thank them for thinking of you.
P: A few lines that work: This is so kind, thank you, though it turns out this model was recalled. Or: We are tight on space right now, but I would love the books and the plush. Or simply: We are sticking with new for car seats, but yes please to everything else.
P: You do not owe anyone a detailed explanation, and you can happily accept most of a bin while quietly setting one item aside.
H2: The bigger picture
P: Secondhand toys are a good deal, an environmental win, and how a lot of us grew up. A checklist is not meant to talk you out of them. It is meant to let you say yes with confidence and know which few items to skip.
H2: Keep looking with us
P: We are Rodrigo and Vanessa, and we built SafeNest Toys to be the resource we could not find when our own kids were small. Our reviews score toys on safety criteria like small parts, battery security, and materials, so you can look up a hand-me-down before it hits the playroom floor.
P: For official recall notices, the CPSC maintains a searchable database, and we flag recalls on the products we cover. Check a toy when you are unsure, and enjoy the free stuff the rest of the time.
P: This article is general safety information, not medical or product-specific advice. Follow the manufacturer's instructions and your pediatrician's guidance for your child.
`;

const DOCS = [
  {
    _id: "blog-button-batteries-and-magnets",
    slug: "button-batteries-and-magnets-toy-safety",
    title:
      "Button Batteries and Magnets: The Two Hidden Toy Dangers Every Parent Should Know",
    excerpt:
      "Button batteries and high-powered magnets are two of the most serious hazards in a home with small kids. Here is how they cause harm, where they hide, and exactly what to do.",
    body: ARTICLE_1,
  },
  {
    _id: "blog-secondhand-toy-safety",
    slug: "secondhand-toy-safety-checklist",
    title: "Secondhand Toy Safety: What to Check Before You Accept a Hand-Me-Down",
    excerpt:
      "Hand-me-down toys stretch a tight budget and keep good things out of landfills. Here is a practical nine-step check before one lands in your child's hands.",
    body: ARTICLE_2,
  },
];

async function main() {
  for (const d of DOCS) {
    const body = toPortableText(d.body);
    await client.createOrReplace({
      _id: d._id,
      _type: "blogPost",
      title: d.title,
      slug: { _type: "slug", current: d.slug },
      excerpt: d.excerpt,
      author: AUTHOR,
      publishedAt: new Date().toISOString(),
      body,
    });
    console.log(`✓ /blog/${d.slug}  (${body.length} blocks)`);
  }
  console.log("\n✅ 2 safety articles published.");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
