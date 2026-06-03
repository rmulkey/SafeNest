/**
 * Seed the queuedProduct queue with REAL, verified products.
 *
 * Data integrity:
 *  - Every product is a real, currently-sold toy (verified on Target/manufacturer).
 *  - imageUrl was verified to return real image bytes (scripts/verify-queue-images.mjs).
 *  - affiliateUrl is an Amazon SEARCH url WITHOUT the tag (BuyButton appends it);
 *    search URLs always resolve, so no fabricated /dp/{ASIN} links.
 *  - Scores, materials, pros/cons, and assessments are authored editorially
 *    (allowed for a review site) and kept reasonable.
 *
 * The daily publisher cron (/api/cron/publish-products) re-verifies the URL and
 * image at publish time before anything goes live.
 *
 * Run: SANITY_API_TOKEN="..." node scripts/seed-product-queue.mjs
 */
import { createClient } from "@sanity/client";

const client = createClient({
  projectId: "ofvgjgsi",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

function searchUrl(brand, name) {
  const q = name.toLowerCase().includes(brand.toLowerCase()) ? name : `${brand} ${name}`;
  return `https://www.amazon.com/s?k=${encodeURIComponent(q.trim())}`;
}

// Real products, none already in the 75-item catalog. Images pre-verified.
const products = [
  {
    productName: "Melissa & Doug Deluxe Pound and Roll Wooden Tower Toy with Hammer",
    brand: "Melissa & Doug",
    categoryRef: "cat-building",
    ageMinMonths: 24, ageMaxMonths: 48,
    imageUrl: "https://target.scene7.com/is/image/Target/GUEST_69e832c3-7e99-4362-8e7e-cdd72f69e4a6?wid=800&hei=800&fmt=pjpeg",
    imageAlt: "Melissa & Doug Deluxe Pound and Roll Wooden Tower Toy with Hammer",
    materialSafety: 90, chokingRisk: 82, recallHistory: 95, certificationPresence: 88,
    motorSkills: 90, cognitiveSkills: 82, sensoryEngagement: 78,
    materials: ["wood", "non-toxic paint"],
    chokingHazardAssessment: "Balls are larger than the small-parts cylinder; the hammer and balls are sized for toddler hands. Labeled for ages 2+. Supervise to keep balls out of mouths.",
    certifications: ["ASTM F963", "CPSIA"],
    pros: ["Classic cause-and-effect play", "Sturdy wood construction", "Helps build hand-eye coordination", "Bright, smoothly sanded pieces"],
    cons: ["Can be noisy on hard floors", "Balls can roll away and get lost"],
  },
  {
    productName: "Melissa & Doug Deluxe Pounding Bench Wooden Toy with Mallet",
    brand: "Melissa & Doug",
    categoryRef: "cat-building",
    ageMinMonths: 24, ageMaxMonths: 48,
    imageUrl: "https://target.scene7.com/is/image/Target/GUEST_f1695eab-3eba-49aa-b56e-70fb14e98d63?wid=800&hei=800&fmt=pjpeg",
    imageAlt: "Melissa & Doug Deluxe Pounding Bench Wooden Toy with Mallet",
    materialSafety: 90, chokingRisk: 84, recallHistory: 95, certificationPresence: 88,
    motorSkills: 92, cognitiveSkills: 80, sensoryEngagement: 76,
    materials: ["wood", "non-toxic paint"],
    chokingHazardAssessment: "Pegs are fixed in the bench and the mallet is large; no loose small parts. Labeled for ages 2+. Adult supervision recommended for the mallet.",
    certifications: ["ASTM F963", "CPSIA"],
    pros: ["Great for motor-skill development", "Satisfying cause-and-effect", "Durable all-wood build", "Reversible pegs extend play"],
    cons: ["Loud during active play", "Mallet swinging needs supervision"],
  },
  {
    productName: "Melissa & Doug Jumbo Numbers Wooden Chunky Puzzle (20pc)",
    brand: "Melissa & Doug",
    categoryRef: "cat-educational",
    ageMinMonths: 24, ageMaxMonths: 60,
    imageUrl: "https://target.scene7.com/is/image/Target/GUEST_1c7edb3b-ab56-49dc-90b6-e40e8c961db4?wid=800&hei=800&fmt=pjpeg",
    imageAlt: "Melissa & Doug Jumbo Numbers Wooden Chunky Puzzle, 20 pieces",
    materialSafety: 90, chokingRisk: 80, recallHistory: 95, certificationPresence: 88,
    motorSkills: 80, cognitiveSkills: 92, sensoryEngagement: 70,
    materials: ["wood", "non-toxic paint"],
    chokingHazardAssessment: "Chunky number pieces are easy to grasp and larger than small-parts gauge, but labeled for ages 2+ as a precaution. Pieces stand upright for play.",
    certifications: ["ASTM F963", "CPSIA", "FSC-certified wood"],
    pros: ["Introduces numbers 1–20", "Self-correcting matching pictures", "Thick, easy-grasp pieces", "Encourages counting and sequencing"],
    cons: ["Board takes up table space", "Older preschoolers may outgrow quickly"],
  },
  {
    productName: "Melissa & Doug Multi-Sensory Pineapple Soft Stacker Infant Toy",
    brand: "Melissa & Doug",
    categoryRef: "cat-sensory",
    ageMinMonths: 6, ageMaxMonths: 24,
    imageUrl: "https://target.scene7.com/is/image/Target/GUEST_e9014d2f-ffad-4638-8e0a-60a3d20a502e?wid=800&hei=800&fmt=pjpeg",
    imageAlt: "Melissa & Doug Multi-Sensory Pineapple Soft Stacker Infant Toy",
    materialSafety: 92, chokingRisk: 90, recallHistory: 95, certificationPresence: 86,
    motorSkills: 84, cognitiveSkills: 80, sensoryEngagement: 92,
    materials: ["soft fabric", "crinkle material", "plastic rings"],
    chokingHazardAssessment: "Soft, oversized stacking rings designed for infants 6 months+; no detachable small parts. Machine-washable fabric. Suitable for mouthing.",
    certifications: ["ASTM F963", "CPSIA"],
    pros: ["Multiple textures for sensory play", "Soft and safe for infants", "Crinkle and rattle sounds", "Easy for little hands to grasp"],
    cons: ["Rings are not interchangeable with hard stackers", "Fabric needs occasional washing"],
  },
  {
    productName: "Melissa & Doug GO Tots Wooden Barnyard Tumble with 4 Disks",
    brand: "Melissa & Doug",
    categoryRef: "cat-educational",
    ageMinMonths: 12, ageMaxMonths: 36,
    imageUrl: "https://target.scene7.com/is/image/Target/GUEST_5046753b-95ce-426c-b29e-7377f76a5a9f?wid=800&hei=800&fmt=pjpeg",
    imageAlt: "Melissa & Doug GO Tots Wooden Barnyard Tumble with 4 disks",
    materialSafety: 90, chokingRisk: 78, recallHistory: 95, certificationPresence: 88,
    motorSkills: 86, cognitiveSkills: 84, sensoryEngagement: 76,
    materials: ["wood", "non-toxic paint"],
    chokingHazardAssessment: "Chunky double-sided disks are sized for toddlers 1+ and larger than the small-parts gauge. Labeled for ages 1+. Supervise during play.",
    certifications: ["ASTM F963", "CPSIA", "FSC-certified wood"],
    pros: ["Encourages cause-and-effect learning", "Portable barn with carry handle", "Chunky disks easy to grip", "Compatible with other GO Tots sets"],
    cons: ["Only 4 disks included", "Disks can be misplaced"],
  },
  {
    productName: "Melissa & Doug Self-Correcting Alphabet Wooden Puzzles with Storage Box (52pc)",
    brand: "Melissa & Doug",
    categoryRef: "cat-educational",
    ageMinMonths: 36, ageMaxMonths: 72,
    imageUrl: "https://target.scene7.com/is/image/Target/GUEST_bb9c3ffb-b1db-4855-a7fd-881e3f339526?wid=800&hei=800&fmt=pjpeg",
    imageAlt: "Melissa & Doug Self-Correcting Alphabet Wooden Puzzles with storage box",
    materialSafety: 88, chokingRisk: 70, recallHistory: 95, certificationPresence: 88,
    motorSkills: 76, cognitiveSkills: 94, sensoryEngagement: 66,
    materials: ["wood", "non-toxic paint"],
    chokingHazardAssessment: "Contains small letter pieces; labeled for ages 3+ due to small parts. Keep away from children under 3. Storage box keeps pieces contained.",
    certifications: ["ASTM F963", "CPSIA"],
    pros: ["Teaches upper- and lowercase letters", "Self-correcting design builds independence", "Reinforces vocabulary with pictures", "Wooden storage box included"],
    cons: ["Small parts not for under 3", "52 pieces require tidying"],
  },
  {
    productName: "Melissa & Doug Farm Wooden Chunky Puzzle (8pc)",
    brand: "Melissa & Doug",
    categoryRef: "cat-educational",
    ageMinMonths: 24, ageMaxMonths: 48,
    imageUrl: "https://cdn.shopify.com/s/files/1/0550/8487/5830/files/2023-11-16_f0cf62b8-aa1c-4520-81d1-a2332b6e10db.jpg?v=1700169911",
    imageAlt: "Melissa & Doug Farm Wooden Chunky Puzzle, 8 pieces",
    materialSafety: 90, chokingRisk: 80, recallHistory: 95, certificationPresence: 88,
    motorSkills: 80, cognitiveSkills: 88, sensoryEngagement: 72,
    materials: ["wood", "non-toxic paint"],
    chokingHazardAssessment: "Chunky farm-animal pieces are easy to grasp and larger than the small-parts gauge; labeled for ages 2+. Pieces stand upright for pretend play.",
    certifications: ["ASTM F963", "CPSIA", "FSC-certified wood"],
    pros: ["Easy-grasp chunky pieces", "Full-color pictures under each piece", "Pieces stand for pretend play", "Introduces farm animals and names"],
    cons: ["Only 8 pieces", "Younger toddlers may need help"],
  },
];

async function main() {
  console.log(`📦 Queuing ${products.length} verified products...\n`);
  let ok = 0;
  for (const p of products) {
    const _id = `queued-${p.productName.toLowerCase().replace(/['’]/g, "").replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80)}`;
    const doc = {
      _id,
      _type: "queuedProduct",
      status: "queued",
      affiliateUrl: searchUrl(p.brand, p.productName),
      ...p,
    };
    await client.createOrReplace(doc);
    ok++;
    console.log(`  ✓ queued: ${p.productName}`);
  }
  console.log(`\n✅ ${ok} products queued. The daily cron will publish 5/day after re-verification.`);
}

main().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
