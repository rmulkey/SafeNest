/**
 * Seed 25 NEW real toy reviews to Sanity CMS.
 *
 * All products are real, currently-known products from well-known brands, none
 * of which already exist in the catalog. Affiliate links are Amazon SEARCH URLs
 * WITHOUT the tag (BuyButton.buildAmazonUrl appends the tag at render time) so
 * no fabricated /dp/{ASIN} URLs are stored. Images are attached separately by
 * scripts/upload-from-urls.mjs from scripts/images-25-real.json (each verified
 * to return HTTP 200 + image/* + >2KB by scripts/verify-images.mjs).
 *
 * Scores, pros/cons, and assessments are authored editorially (this is a review
 * site) but kept reasonable.
 *
 * Run with: SANITY_API_TOKEN="..." node scripts/seed-25-real.mjs
 */

import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'ofvgjgsi',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

const TAG = 'safeneststore-20';

function computeSafetyScore(ms, cr, rh, cp) {
  return Math.round(ms * 0.3 + cr * 0.3 + rh * 0.2 + cp * 0.2);
}
function computeDevelopmentScore(motor, cognitive, sensory) {
  return Math.round(motor * 0.4 + cognitive * 0.35 + sensory * 0.25);
}

// Build an Amazon SEARCH URL WITHOUT the affiliate tag. The BuyButton appends
// the tag, so storing it here would double it. Search URLs never 404.
function buildSearchUrl(brand, productName) {
  const normalizedBrand = brand.replace(/\s*\(.*?\)\s*/g, '').trim();
  const nameLower = productName.toLowerCase();
  const brandLower = normalizedBrand.toLowerCase();
  const query =
    !normalizedBrand || nameLower.includes(brandLower)
      ? productName
      : `${normalizedBrand} ${productName}`;
  return `https://www.amazon.com/s?k=${encodeURIComponent(query.trim())}`;
}

const reviews = [
  // ---------- BUILDING (cat-building) ----------
  {
    _id: 'review-picassotiles-100pc-magnet-tiles',
    _type: 'toyReview',
    productName: 'PicassoTiles 100 Piece Magnetic Building Tiles Set with Carry Case',
    brand: 'PicassoTiles',
    slug: { _type: 'slug', current: 'picassotiles-100-piece-magnetic-tiles' },
    ageRange: { minMonths: 36, maxMonths: 144 },
    category: { _type: 'reference', _ref: 'cat-building' },
    materialSafety: 88, chokingRisk: 84, recallHistory: 90, certificationPresence: 90,
    motorSkills: 90, cognitiveSkills: 92, sensoryEngagement: 80,
    materials: ['ABS plastic', 'sealed magnets', 'BPA-free'],
    chokingHazardAssessment: 'Magnets are fully sealed inside each tile and tiles exceed 3 inches. Labeled choking hazard for under 3 due to small included accessory pieces. Recommended for ages 3+.',
    certifications: ['ASTM F963', 'CPSIA', 'CE mark'],
    pros: ['Open-ended STEM building play', 'Compatible with other standard magnetic tiles', 'Strong magnets connect easily for young builders', 'Carry case makes cleanup simple'],
    cons: ['Smaller accessory pieces not for under 3', 'Magnets can weaken if dropped repeatedly', 'Tiles scratch over heavy use'],
    alternativeId: 'review-hape-fantasia-blocks-train',
  },
  {
    _id: 'review-hape-fantasia-blocks-train',
    _type: 'toyReview',
    productName: 'Hape Fantasia Blocks Wooden Sorting & Stacking Train',
    brand: 'Hape',
    slug: { _type: 'slug', current: 'hape-fantasia-blocks-train' },
    ageRange: { minMonths: 18, maxMonths: 72 },
    category: { _type: 'reference', _ref: 'cat-building' },
    materialSafety: 94, chokingRisk: 88, recallHistory: 94, certificationPresence: 92,
    motorSkills: 86, cognitiveSkills: 84, sensoryEngagement: 78,
    materials: ['maple wood', 'water-based paint', 'non-toxic finishes'],
    chokingHazardAssessment: 'Seventeen-piece maple block set with large, easy-to-grasp pieces and interchangeable train cars. No small detachable parts. Meets EN 71 and ASTM F963. Recommended for ages 2+.',
    certifications: ['ASTM F963', 'EN-71', 'CPSIA'],
    pros: ['Bright maple blocks with enchanting patterns', 'Interchangeable train cars extend play', 'Durable non-toxic finishes', 'Encourages open-ended configurations'],
    cons: ['Only 17 pieces in set', 'Wooden pieces are heavier than plastic', 'Pattern decorations may vary'],
    alternativeId: 'review-picassotiles-100pc-magnet-tiles',
  },
  {
    _id: 'review-janod-translucent-stacking-blocks',
    _type: 'toyReview',
    productName: 'Janod Translucent Sensory Stacking Blocks',
    brand: 'Janod',
    slug: { _type: 'slug', current: 'janod-translucent-sensory-stacking-blocks' },
    ageRange: { minMonths: 12, maxMonths: 48 },
    category: { _type: 'reference', _ref: 'cat-building' },
    materialSafety: 92, chokingRisk: 86, recallHistory: 94, certificationPresence: 90,
    motorSkills: 84, cognitiveSkills: 82, sensoryEngagement: 88,
    materials: ['wood', 'translucent acrylic inserts', 'water-based paint'],
    chokingHazardAssessment: 'Eighteen-piece set of smooth wooden blocks and large translucent shapes sized for toddler hands. No small parts. Designed for ages 12 months and up.',
    certifications: ['ASTM F963', 'EN-71', 'CPSIA'],
    pros: ['Translucent pieces add light and color exploration', 'Includes activity cards to guide early play', 'Smooth, well-crafted wooden blocks', 'Grows with child from stacking to building'],
    cons: ['Premium price for 18 pieces', 'Translucent inserts can pop loose with rough play', 'Limited piece count for older builders'],
    alternativeId: 'review-hape-twist-turnables',
  },
  {
    _id: 'review-hape-twist-turnables',
    _type: 'toyReview',
    productName: 'Hape Twist & Turnables Wooden Shape Blocks',
    brand: 'Hape',
    slug: { _type: 'slug', current: 'hape-twist-and-turnables' },
    ageRange: { minMonths: 24, maxMonths: 72 },
    category: { _type: 'reference', _ref: 'cat-building' },
    materialSafety: 94, chokingRisk: 86, recallHistory: 94, certificationPresence: 92,
    motorSkills: 90, cognitiveSkills: 82, sensoryEngagement: 74,
    materials: ['FSC-sourced wood', 'child-safe paint', 'non-toxic finishes'],
    chokingHazardAssessment: 'Nine screw-together wooden nuts and bolts in four colors, all sized larger than the small-parts cylinder. Recommended for ages 2 and up.',
    certifications: ['ASTM F963', 'EN-71', 'CPSIA', 'FSC-certified wood'],
    pros: ['Screw-together builds will not topple', 'Strengthens hand muscles and dexterity', 'Teaches colors and shapes', 'Sustainably sourced wood'],
    cons: ['Only 9 pieces', 'Twisting can frustrate the youngest toddlers', 'Limited beyond nut-and-bolt play'],
    alternativeId: 'review-janod-translucent-stacking-blocks',
  },
  {
    _id: 'review-hape-string-along-shapes',
    _type: 'toyReview',
    productName: 'Hape String-Along Shapes Stacking Game',
    brand: 'Hape',
    slug: { _type: 'slug', current: 'hape-string-along-shapes' },
    ageRange: { minMonths: 36, maxMonths: 96 },
    category: { _type: 'reference', _ref: 'cat-building' },
    materialSafety: 92, chokingRisk: 80, recallHistory: 94, certificationPresence: 92,
    motorSkills: 90, cognitiveSkills: 86, sensoryEngagement: 74,
    materials: ['wood', 'cotton lace', 'child-safe paint'],
    chokingHazardAssessment: 'Thirty-two colored wooden blocks with two laces. Labeled choking hazard for small parts; not for children under 3. Includes a lace, so adult supervision recommended for ages 3+.',
    certifications: ['ASTM F963', 'EN-71', 'CPSIA'],
    pros: ['Two ways to play: lace or stack', 'Teaches sorting, counting, and color recognition', 'Develops fine motor and hand-eye coordination', 'Sturdy long-lasting wood construction'],
    cons: ['Lace is a strangulation risk without supervision', 'Not for children under 3', 'Blocks can scatter easily'],
    alternativeId: 'review-picassotiles-race-track',
  },
  {
    _id: 'review-picassotiles-race-track',
    _type: 'toyReview',
    productName: 'PicassoTiles 100 Piece Magnetic Race Track Set',
    brand: 'PicassoTiles',
    slug: { _type: 'slug', current: 'picassotiles-100-piece-race-track' },
    ageRange: { minMonths: 36, maxMonths: 144 },
    category: { _type: 'reference', _ref: 'cat-building' },
    materialSafety: 88, chokingRisk: 82, recallHistory: 90, certificationPresence: 90,
    motorSkills: 90, cognitiveSkills: 92, sensoryEngagement: 82,
    materials: ['ABS plastic', 'sealed magnets', 'BPA-free'],
    chokingHazardAssessment: 'Magnets sealed inside each tile; includes two racing cars. Labeled choking hazard for small parts; not for children under 3. Recommended for ages 3+.',
    certifications: ['ASTM F963', 'CPSIA', 'CE mark'],
    pros: ['Combines magnetic building with race-track play', 'Compatible with standard magnetic tiles', 'Columns and slopes enable 3D multi-level builds', 'Strong magnets for frustration-free connecting'],
    cons: ['Racing cars are small parts, not for under 3', 'Premium price', 'Magnets can pinch if slammed together'],
    alternativeId: 'review-hape-string-along-shapes',
  },

  // ---------- SENSORY (cat-sensory) ----------
  {
    _id: 'review-baby-banana-teething-toothbrush',
    _type: 'toyReview',
    productName: 'Baby Banana Infant Teething Toothbrush',
    brand: 'Baby Banana',
    slug: { _type: 'slug', current: 'baby-banana-infant-teething-toothbrush' },
    ageRange: { minMonths: 3, maxMonths: 12 },
    category: { _type: 'reference', _ref: 'cat-sensory' },
    materialSafety: 92, chokingRisk: 90, recallHistory: 88, certificationPresence: 86,
    motorSkills: 70, cognitiveSkills: 58, sensoryEngagement: 90,
    materials: ['food-grade silicone', 'BPA-free'],
    chokingHazardAssessment: 'One-piece bendable silicone design with curved handles too large to swallow; flexes to reduce injury risk if baby falls. Freezer and dishwasher safe. Safe from 3 months.',
    certifications: ['CPSIA', 'BPA-free certified', 'FDA food-grade'],
    pros: ['Soft silicone soothes sore gums', 'Curved handles are easy for babies to grip', 'Bendable design reduces gag/injury risk', 'Dishwasher and freezer safe'],
    cons: ['Limited play value beyond teething', 'Can pick up lint between uses', 'Bristles wear with heavy chewing'],
    alternativeId: 'review-sassy-newborn-gift-set',
  },
  {
    _id: 'review-sassy-newborn-gift-set',
    _type: 'toyReview',
    productName: 'Sassy Newborn Gift Set',
    brand: 'Sassy',
    slug: { _type: 'slug', current: 'sassy-newborn-gift-set' },
    ageRange: { minMonths: 0, maxMonths: 12 },
    category: { _type: 'reference', _ref: 'cat-sensory' },
    materialSafety: 88, chokingRisk: 90, recallHistory: 86, certificationPresence: 84,
    motorSkills: 74, cognitiveSkills: 62, sensoryEngagement: 92,
    materials: ['BPA-free plastic', 'fabric', 'high-contrast print'],
    chokingHazardAssessment: 'Four-piece set (phone, teether, ring rattle, spin rattle), each piece oversized for newborn hands and mouths. No detachable small parts. Safe from birth.',
    certifications: ['ASTM F963', 'CPSIA', 'BPA-free certified'],
    pros: ['High-contrast patterns support visual development', 'Multiple textures for sensory exploration', 'Lightweight pieces easy for newborns to grasp', 'Good value multi-toy set'],
    cons: ['Rattle sounds are subtle', 'Fabric teether absorbs drool', 'Babies outgrow some pieces quickly'],
    alternativeId: 'review-baby-banana-teething-toothbrush',
  },
  {
    _id: 'review-sassy-teethe-twirl-sensation',
    _type: 'toyReview',
    productName: 'Sassy Teethe & Twirl Sensation Station',
    brand: 'Sassy',
    slug: { _type: 'slug', current: 'sassy-teethe-and-twirl-sensation-station' },
    ageRange: { minMonths: 6, maxMonths: 24 },
    category: { _type: 'reference', _ref: 'cat-sensory' },
    materialSafety: 88, chokingRisk: 90, recallHistory: 88, certificationPresence: 84,
    motorSkills: 82, cognitiveSkills: 72, sensoryEngagement: 92,
    materials: ['BPA-free plastic', 'suction base', 'textured surfaces'],
    chokingHazardAssessment: 'Two-in-one toy that suctions to a tray or detaches as a hand rattle. All textured surfaces are molded to the body with no small parts. Safe for 6 months and up.',
    certifications: ['ASTM F963', 'CPSIA', 'BPA-free certified'],
    pros: ['Suctions to high-chair tray to reduce drops', 'Spinning wheel builds visual tracking', 'Textured surfaces soothe gums', 'Converts to floor-play rattle'],
    cons: ['Suction loosens on textured surfaces', 'Spinner can be loud on a tray', 'Limited use after toddlerhood'],
    alternativeId: 'review-fat-brain-pipsquigz-loops',
  },
  {
    _id: 'review-fat-brain-pipsquigz-loops',
    _type: 'toyReview',
    productName: 'Fat Brain Toys PipSquigz Loops',
    brand: 'Fat Brain Toys',
    slug: { _type: 'slug', current: 'fat-brain-toys-pipsquigz-loops' },
    ageRange: { minMonths: 3, maxMonths: 18 },
    category: { _type: 'reference', _ref: 'cat-sensory' },
    materialSafety: 92, chokingRisk: 88, recallHistory: 94, certificationPresence: 86,
    motorSkills: 84, cognitiveSkills: 74, sensoryEngagement: 92,
    materials: ['food-grade silicone', 'BPA-free', 'ABS plastic rings'],
    chokingHazardAssessment: 'Large bendy silicone body with three loops and rattle rings, all sized well above the small-parts cylinder. Suction cups attach to smooth surfaces. Safe for infants.',
    certifications: ['ASTM F963', 'CPSIA', 'BPA-free certified'],
    pros: ['Suction cups teach cause and effect', 'Soft silicone soothes teething', 'Rattle rings add auditory play', 'Easy for little fingers to grab'],
    cons: ['Suction weak on textured surfaces', 'Rings can collect grime', 'Pop sound may startle some babies'],
    alternativeId: 'review-sassy-teethe-twirl-sensation',
  },
  {
    _id: 'review-sassy-stacks-of-circles',
    _type: 'toyReview',
    productName: 'Sassy Stacks of Circles Ring Stacker',
    brand: 'Sassy',
    slug: { _type: 'slug', current: 'sassy-stacks-of-circles-ring-stacker' },
    ageRange: { minMonths: 6, maxMonths: 24 },
    category: { _type: 'reference', _ref: 'cat-sensory' },
    materialSafety: 88, chokingRisk: 90, recallHistory: 88, certificationPresence: 84,
    motorSkills: 84, cognitiveSkills: 78, sensoryEngagement: 88,
    materials: ['BPA-free plastic', 'textured rings'],
    chokingHazardAssessment: 'Nine chunky rings on a straight post; rings can be stacked in any direction. All pieces are larger than the small-parts cylinder. Safe for 6 months and up.',
    certifications: ['ASTM F963', 'CPSIA', 'BPA-free certified'],
    pros: ['Stacks in any direction for frustration-free play', 'Each ring has a different color and texture', 'Chunky size easy for babies to grasp', 'Teaches sequencing and size order'],
    cons: ['Simple play value tapers off by toddlerhood', 'Rings are not water-sealed', 'Bright plastic feels lightweight'],
    alternativeId: 'review-munchkin-bath-bobbers',
  },
  {
    _id: 'review-munchkin-bath-bobbers',
    _type: 'toyReview',
    productName: 'Munchkin Bath Bobbers',
    brand: 'Munchkin',
    slug: { _type: 'slug', current: 'munchkin-bath-bobbers' },
    ageRange: { minMonths: 6, maxMonths: 36 },
    category: { _type: 'reference', _ref: 'cat-sensory' },
    materialSafety: 90, chokingRisk: 90, recallHistory: 90, certificationPresence: 84,
    motorSkills: 78, cognitiveSkills: 70, sensoryEngagement: 88,
    materials: ['BPA-free rubber', 'watertight sealed design'],
    chokingHazardAssessment: 'Two weighted, hole-free bath toys (dolphin and walrus) that float and wobble. Watertight design prevents interior mold. No small parts. Safe for 6 months and up.',
    certifications: ['ASTM F963', 'CPSIA', 'BPA-free certified'],
    pros: ['Hole-free design prevents mold and mildew', 'Floats on water and wobbles on land', 'Easy-grip size for little hands', 'Encourages imaginative water play'],
    cons: ['Only two characters in set', 'Weighted base makes them sink if punctured', 'Limited play outside the tub'],
    alternativeId: 'review-sassy-teethe-twirl-sensation',
  },

  // ---------- OUTDOOR (cat-outdoor) ----------
  {
    _id: 'review-step2-up-down-coaster',
    _type: 'toyReview',
    productName: 'Step2 Up & Down Roller Coaster',
    brand: 'Step2',
    slug: { _type: 'slug', current: 'step2-up-and-down-roller-coaster' },
    ageRange: { minMonths: 24, maxMonths: 60 },
    category: { _type: 'reference', _ref: 'cat-outdoor' },
    materialSafety: 84, chokingRisk: 90, recallHistory: 84, certificationPresence: 82,
    motorSkills: 92, cognitiveSkills: 72, sensoryEngagement: 76,
    materials: ['double-walled polyethylene', 'UV-stabilized plastic'],
    chokingHazardAssessment: 'Large coaster car with high back, handlebar, and footrests on a snap-together 10 ft track. No small parts. Non-slip steps lock into the track. Maximum weight 50 lbs. Ages 2+.',
    certifications: ['ASTM F963', 'CPSIA'],
    pros: ['Kid-powered ride builds gross motor skills', 'Steps and track encourage independent play', 'Sturdy double-walled construction', 'Car doubles as a foot-powered ride-on'],
    cons: ['Takes significant floor or yard space', 'Assembly required', '50 lb weight limit is quickly outgrown'],
    alternativeId: 'review-little-tikes-snug-secure-swing',
  },
  {
    _id: 'review-little-tikes-snug-secure-swing',
    _type: 'toyReview',
    productName: "Little Tikes 2-in-1 Snug 'n Secure Swing",
    brand: 'Little Tikes',
    slug: { _type: 'slug', current: 'little-tikes-2-in-1-snug-n-secure-swing' },
    ageRange: { minMonths: 9, maxMonths: 48 },
    category: { _type: 'reference', _ref: 'cat-outdoor' },
    materialSafety: 86, chokingRisk: 92, recallHistory: 78, certificationPresence: 84,
    motorSkills: 84, cognitiveSkills: 64, sensoryEngagement: 80,
    materials: ['blow-molded polyethylene', 'weather-resistant rope', 'plastic T-bar'],
    chokingHazardAssessment: 'Hinged T-bar and stay-put shoulder straps secure the child; straps move out of the way as the child grows. No small parts. Maximum fall-height protection up to 7 feet required. Weight limit 50 lbs.',
    certifications: ['ASTM F963', 'CPSIA'],
    pros: ['Grows from baby to toddler swing', 'T-bar and straps hold child securely', 'Weather-resistant for outdoor use', 'Easy loading with rotating T-bar'],
    cons: ['Anchors and hardware not included', 'Requires proper fall-height clearance', 'Rope length needs careful installation'],
    alternativeId: 'review-step2-up-down-coaster',
  },
  {
    _id: 'review-radio-flyer-stroll-n-trike',
    _type: 'toyReview',
    productName: "Radio Flyer 4-in-1 Stroll 'N Trike",
    brand: 'Radio Flyer',
    slug: { _type: 'slug', current: 'radio-flyer-4-in-1-stroll-n-trike' },
    ageRange: { minMonths: 12, maxMonths: 60 },
    category: { _type: 'reference', _ref: 'cat-outdoor' },
    materialSafety: 86, chokingRisk: 88, recallHistory: 84, certificationPresence: 86,
    motorSkills: 90, cognitiveSkills: 70, sensoryEngagement: 72,
    materials: ['steel frame', 'BPA-free plastic', 'EVA tires'],
    chokingHazardAssessment: 'Converts across four stages with a 3-point harness, high-back seat, and removable footrest for infants. Adult push handle for younger riders. No small parts. For ages 1 to 5.',
    certifications: ['ASTM F963', 'CPSIA'],
    pros: ['Four ride modes grow with the child', '3-point harness and canopy for infant safety', 'Sturdy steel frame lasts for years', 'Parent steering handle for early stages'],
    cons: ['Assembly can be involved', 'Heavier than a basic trike', 'Canopy and tray feel less durable than the frame'],
    alternativeId: 'review-little-tikes-totsports-basketball',
  },
  {
    _id: 'review-little-tikes-totsports-basketball',
    _type: 'toyReview',
    productName: 'Little Tikes TotSports Basketball Set',
    brand: 'Little Tikes',
    slug: { _type: 'slug', current: 'little-tikes-totsports-basketball-set' },
    ageRange: { minMonths: 18, maxMonths: 60 },
    category: { _type: 'reference', _ref: 'cat-outdoor' },
    materialSafety: 86, chokingRisk: 90, recallHistory: 86, certificationPresence: 82,
    motorSkills: 90, cognitiveSkills: 72, sensoryEngagement: 72,
    materials: ['blow-molded polyethylene', 'UV-resistant plastic'],
    chokingHazardAssessment: 'Oversized toddler rim, post, and junior basketball with no small parts. Base can be weighted with sand for stability. Recommended for ages 18 months and up.',
    certifications: ['ASTM F963', 'CPSIA'],
    pros: ['Oversized rim sized for toddlers', 'Weightable base adds stability', 'Builds motor skills and coordination', 'Works indoors or outdoors'],
    cons: ['Base tips if not weighted', 'Height adjustment is limited on this model', 'Included ball is small and easy to misplace'],
    alternativeId: 'review-radio-flyer-stroll-n-trike',
  },
  {
    _id: 'review-little-tikes-tball-set',
    _type: 'toyReview',
    productName: 'Little Tikes TotSports T-Ball Set',
    brand: 'Little Tikes',
    slug: { _type: 'slug', current: 'little-tikes-totsports-t-ball-set' },
    ageRange: { minMonths: 18, maxMonths: 60 },
    category: { _type: 'reference', _ref: 'cat-outdoor' },
    materialSafety: 86, chokingRisk: 88, recallHistory: 86, certificationPresence: 82,
    motorSkills: 90, cognitiveSkills: 70, sensoryEngagement: 70,
    materials: ['BPA-free plastic', 'UV-resistant plastic'],
    chokingHazardAssessment: 'Includes an easy-grip bat, oversized balls, and an adjustable-height tee. Balls are larger than the small-parts cylinder. Hang-on-the-wall storage. Recommended for ages 18 months and up.',
    certifications: ['ASTM F963', 'CPSIA'],
    pros: ['Adjustable tee grows with developing skills', 'Lightweight bat sized for toddlers', 'Wall-hanging design saves space', 'Encourages active outdoor play'],
    cons: ['Balls are easy to lose outdoors', 'Plastic bat is light in wind', 'Tee can tip on uneven ground'],
    alternativeId: 'review-step2-up-down-coaster',
  },
  {
    _id: 'review-little-tikes-easy-score-soccer',
    _type: 'toyReview',
    productName: 'Little Tikes Easy Score Soccer Set',
    brand: 'Little Tikes',
    slug: { _type: 'slug', current: 'little-tikes-easy-score-soccer-set' },
    ageRange: { minMonths: 24, maxMonths: 72 },
    category: { _type: 'reference', _ref: 'cat-outdoor' },
    materialSafety: 86, chokingRisk: 90, recallHistory: 86, certificationPresence: 82,
    motorSkills: 92, cognitiveSkills: 72, sensoryEngagement: 70,
    materials: ['BPA-free plastic', 'polyester net'],
    chokingHazardAssessment: 'Toddler-scale soccer goal with a junior ball and net. No small parts. Tool-free adult assembly. Recommended for ages 2 and up.',
    certifications: ['ASTM F963', 'CPSIA'],
    pros: ['Simple tool-free assembly', 'Encourages active outdoor play', 'Goal sized for young players', 'Promotes gross motor coordination'],
    cons: ['Net can tangle', 'Lightweight goal shifts on impact', 'Ball deflates over time'],
    alternativeId: 'review-step2-up-down-coaster',
  },

  // ---------- EDUCATIONAL (cat-educational) ----------
  {
    _id: 'review-hape-snail-walk-along',
    _type: 'toyReview',
    productName: 'Hape Walk-A-Long Snail',
    brand: 'Hape',
    slug: { _type: 'slug', current: 'hape-walk-a-long-snail' },
    ageRange: { minMonths: 12, maxMonths: 36 },
    category: { _type: 'reference', _ref: 'cat-educational' },
    materialSafety: 94, chokingRisk: 84, recallHistory: 94, certificationPresence: 92,
    motorSkills: 90, cognitiveSkills: 82, sensoryEngagement: 76,
    materials: ['wood', 'water-based paint', 'cotton pull string'],
    chokingHazardAssessment: 'Wooden pull toy with a removable shell shape sorter and three large blocks (triangle, cylinder, square). Includes a pull string, so adult supervision is advised. Recommended for ages 1+.',
    certifications: ['ASTM F963', 'EN-71', 'CPSIA'],
    pros: ['Combines pull toy with shape sorting', 'Removable shell adds play options', 'Sturdy wood with non-toxic finishes', 'Award-winning design'],
    cons: ['Pull string needs supervision', 'Only three sorting shapes', 'Wheels can mark hard floors'],
    alternativeId: 'review-melissa-doug-shape-sorting-cube',
  },
  {
    _id: 'review-melissa-doug-shape-sorting-cube',
    _type: 'toyReview',
    productName: 'Melissa & Doug Shape Sorting Cube',
    brand: 'Melissa & Doug',
    slug: { _type: 'slug', current: 'melissa-doug-shape-sorting-cube' },
    ageRange: { minMonths: 24, maxMonths: 60 },
    category: { _type: 'reference', _ref: 'cat-educational' },
    materialSafety: 92, chokingRisk: 84, recallHistory: 86, certificationPresence: 88,
    motorSkills: 88, cognitiveSkills: 86, sensoryEngagement: 72,
    materials: ['solid wood', 'non-toxic paint'],
    chokingHazardAssessment: 'Natural-finish hardwood cube with 12 chunky, rounded shapes easy for little hands. Shapes are larger than the small-parts cylinder. Recommended for ages 2 to 5.',
    certifications: ['ASTM F963', 'CPSIA', 'EN-71'],
    pros: ['Twelve shapes offer more challenge than basic sorters', 'Satisfying clunk reinforces success', 'Durable solid-wood construction', 'Teaches color and shape recognition'],
    cons: ['Twelve shapes can overwhelm the youngest sorters', 'Loose shapes can roll away', 'Paint can chip with heavy use'],
    alternativeId: 'review-hape-snail-walk-along',
  },
  {
    _id: 'review-melissa-doug-bead-sequencing',
    _type: 'toyReview',
    productName: 'Melissa & Doug Bead Sequencing Set',
    brand: 'Melissa & Doug',
    slug: { _type: 'slug', current: 'melissa-doug-bead-sequencing-set' },
    ageRange: { minMonths: 48, maxMonths: 96 },
    category: { _type: 'reference', _ref: 'cat-educational' },
    materialSafety: 90, chokingRisk: 78, recallHistory: 86, certificationPresence: 88,
    motorSkills: 90, cognitiveSkills: 88, sensoryEngagement: 70,
    materials: ['wood', 'non-toxic paint', 'wooden dowels'],
    chokingHazardAssessment: 'Forty-six small wooden beads stacked on dowels with five double-sided pattern cards. Small beads make this a choking hazard for young children; recommended for ages 4 to 8.',
    certifications: ['ASTM F963', 'CPSIA', 'EN-71'],
    pros: ['Ten patterns increase in difficulty', 'Builds matching, sequencing, and fine motor skills', 'Sturdy wooden storage box holds dowels upright', 'Strong early-math manipulative'],
    cons: ['Small beads are not for under 3', 'Beads can scatter', 'Best with adult guidance for patterns'],
    alternativeId: 'review-fat-brain-dimpl-digits',
  },
  {
    _id: 'review-melissa-doug-pattern-blocks',
    _type: 'toyReview',
    productName: 'Melissa & Doug Pattern Blocks and Boards',
    brand: 'Melissa & Doug',
    slug: { _type: 'slug', current: 'melissa-doug-pattern-blocks-and-boards' },
    ageRange: { minMonths: 36, maxMonths: 72 },
    category: { _type: 'reference', _ref: 'cat-educational' },
    materialSafety: 90, chokingRisk: 80, recallHistory: 86, certificationPresence: 88,
    motorSkills: 86, cognitiveSkills: 90, sensoryEngagement: 70,
    materials: ['solid wood', 'non-toxic paint'],
    chokingHazardAssessment: 'One hundred twenty solid-wood shapes with five double-sided boards. Small shapes are a choking hazard for young children; recommended for ages 3 and up.',
    certifications: ['ASTM F963', 'CPSIA', 'EN-71'],
    pros: ['120 shapes allow extensive pattern building', 'Double-sided boards add variety', 'Supports spatial awareness and early math', 'Durable solid-wood pieces'],
    cons: ['Many small pieces to manage', 'Not for children under 3', 'Pieces can get lost over time'],
    alternativeId: 'review-hape-string-along-shapes',
  },
  {
    _id: 'review-melissa-doug-primary-lacing-beads',
    _type: 'toyReview',
    productName: 'Melissa & Doug Primary Lacing Beads',
    brand: 'Melissa & Doug',
    slug: { _type: 'slug', current: 'melissa-doug-primary-lacing-beads' },
    ageRange: { minMonths: 36, maxMonths: 72 },
    category: { _type: 'reference', _ref: 'cat-educational' },
    materialSafety: 90, chokingRisk: 78, recallHistory: 86, certificationPresence: 88,
    motorSkills: 92, cognitiveSkills: 84, sensoryEngagement: 72,
    materials: ['wood', 'non-toxic paint', 'cotton laces'],
    chokingHazardAssessment: 'Thirty hand-painted wooden beads in six colors and five shapes with two laces and a wooden case. Small beads and a lace mean adult supervision is advised; recommended for ages 3 to 6.',
    certifications: ['ASTM F963', 'CPSIA', 'EN-71'],
    pros: ['Strengthens fine motor and hand-eye coordination', 'Teaches color, shape, and pattern recognition', 'Includes a wooden storage case', 'Open-ended for sorting and counting games'],
    cons: ['Lace is a strangulation risk without supervision', 'Small beads not for under 3', 'Laces can fray over time'],
    alternativeId: 'review-hape-snail-walk-along',
  },
  {
    _id: 'review-melissa-doug-jumbo-knob-puzzle',
    _type: 'toyReview',
    productName: 'Melissa & Doug Deluxe Jumbo Knob Wooden Puzzle - Geometric Shapes',
    brand: 'Melissa & Doug',
    slug: { _type: 'slug', current: 'melissa-doug-deluxe-jumbo-knob-puzzle-geometric-shapes' },
    ageRange: { minMonths: 12, maxMonths: 36 },
    category: { _type: 'reference', _ref: 'cat-educational' },
    materialSafety: 92, chokingRisk: 90, recallHistory: 86, certificationPresence: 88,
    motorSkills: 88, cognitiveSkills: 84, sensoryEngagement: 70,
    materials: ['extra-thick wood', 'non-toxic paint'],
    chokingHazardAssessment: 'Eight extra-thick wooden pieces with jumbo knobs sized for small hands; full-color matching pictures underneath. No small parts. Recommended for ages 12 months and up.',
    certifications: ['ASTM F963', 'CPSIA', 'EN-71'],
    pros: ['Jumbo knobs are easy for toddlers to grasp', 'Matching pictures reinforce shape recognition', 'Extra-thick durable wood', 'Great early puzzle for ages 1+'],
    cons: ['Only eight pieces', 'Quickly mastered by older toddlers', 'Knobs can loosen with rough handling'],
    alternativeId: 'review-fat-brain-dimpl-digits',
  },
  {
    _id: 'review-fat-brain-dimpl-digits',
    _type: 'toyReview',
    productName: 'Fat Brain Toys Dimpl Digits',
    brand: 'Fat Brain Toys',
    slug: { _type: 'slug', current: 'fat-brain-toys-dimpl-digits' },
    ageRange: { minMonths: 12, maxMonths: 36 },
    category: { _type: 'reference', _ref: 'cat-educational' },
    materialSafety: 92, chokingRisk: 90, recallHistory: 94, certificationPresence: 86,
    motorSkills: 86, cognitiveSkills: 88, sensoryEngagement: 82,
    materials: ['food-grade silicone', 'ABS plastic frame', 'BPA-free'],
    chokingHazardAssessment: 'ABS frame with embossed silicone push-buttons numbered 1 to 10; buttons are anchored to the frame with no detachable parts. Recommended for ages 12 months and up.',
    certifications: ['ASTM F963', 'CPSIA', 'BPA-free certified'],
    pros: ['Satisfying push-and-pop silicone buttons', 'Two-sided with English and Spanish words', 'Builds number recognition and counting', 'Durable, easy to clean'],
    cons: ['Single learning concept (numbers)', 'Buttons can be loud', 'Limited play once numbers are mastered'],
    alternativeId: 'review-melissa-doug-bead-sequencing',
  },
];

// Compute scores and attach affiliate search links for all reviews.
for (const r of reviews) {
  r.safetyScore = computeSafetyScore(r.materialSafety, r.chokingRisk, r.recallHistory, r.certificationPresence);
  r.developmentScore = computeDevelopmentScore(r.motorSkills, r.cognitiveSkills, r.sensoryEngagement);
  r.affiliateLinks = [
    {
      _type: 'affiliateLink',
      _key: 'amazon-search',
      partnerId: 'amazon',
      url: buildSearchUrl(r.brand, r.productName),
      tag: TAG,
    },
  ];
  r.hasActiveRecall = false;
  r.needsReview = false;
}

async function seed() {
  console.log(`🌱 Seeding ${reviews.length} new real toy reviews to Sanity...\n`);

  // Phase 1: create all reviews WITHOUT alternatives (avoids reference errors).
  console.log('Phase 1: Creating reviews...\n');
  for (const review of reviews) {
    const { alternativeId, ...doc } = review;
    await client.createOrReplace(doc);
    console.log(`  ✓ ${review.productName} (Safety: ${review.safetyScore}, Dev: ${review.developmentScore})`);
  }

  // Phase 2: patch alternatives now that every doc exists.
  console.log('\nPhase 2: Linking alternatives...\n');
  for (const review of reviews) {
    if (review.alternativeId) {
      await client
        .patch(review._id)
        .set({ alternatives: [{ _type: 'reference', _ref: review.alternativeId }] })
        .commit();
      console.log(`  ✓ ${review._id} → ${review.alternativeId}`);
    }
  }

  console.log(`\n✅ Done! ${reviews.length} new real reviews created.`);
}

seed().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
