/**
 * Seed script to publish sample content to Sanity CMS.
 * Run with: node scripts/seed-sanity.mjs
 */

import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'ofvgjgsi',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

async function seed() {
  console.log('🌱 Seeding Sanity content...\n');

  // 1. Create categories
  const categories = [
    { _id: 'cat-building', _type: 'category', title: 'Building Toys', slug: { _type: 'slug', current: 'building-toys' } },
    { _id: 'cat-sensory', _type: 'category', title: 'Sensory Toys', slug: { _type: 'slug', current: 'sensory-toys' } },
    { _id: 'cat-outdoor', _type: 'category', title: 'Outdoor Toys', slug: { _type: 'slug', current: 'outdoor-toys' } },
    { _id: 'cat-educational', _type: 'category', title: 'Educational Toys', slug: { _type: 'slug', current: 'educational-toys' } },
  ];

  for (const cat of categories) {
    await client.createOrReplace(cat);
    console.log(`  ✓ Category: ${cat.title}`);
  }

  // 2. Create toy reviews
  const reviews = [
    {
      _id: 'review-wooden-blocks',
      _type: 'toyReview',
      productName: 'Melissa & Doug Wooden Building Blocks Set',
      brand: 'Melissa & Doug',
      slug: { _type: 'slug', current: 'melissa-doug-wooden-blocks' },
      ageRange: { minMonths: 12, maxMonths: 48 },
      category: { _type: 'reference', _ref: 'cat-building' },
      materialSafety: 92,
      chokingRisk: 85,
      recallHistory: 95,
      certificationPresence: 90,
      motorSkills: 88,
      cognitiveSkills: 75,
      sensoryEngagement: 70,
      safetyScore: 90,
      developmentScore: 79,
      materials: ['solid wood', 'non-toxic water-based paint'],
      chokingHazardAssessment: 'All blocks are larger than 1.75 inches in diameter. No small parts. Suitable for children 12 months and older.',
      certifications: ['ASTM F963', 'CPSIA compliant', 'EN-71'],
      pros: ['Durable solid wood construction', 'Non-toxic paints', 'Multiple shapes encourage creativity', 'Includes storage bag'],
      cons: ['Higher price point than plastic alternatives', 'Heavier than foam blocks for younger toddlers'],
      alternatives: [{ _type: 'reference', _ref: 'review-mega-bloks' }],
      affiliateLinks: [{ _type: 'affiliateLink', partnerId: 'amazon', url: 'https://amazon.com/dp/B000068CKY', tag: 'safenest-20' }],
      hasActiveRecall: false,
      needsReview: false,
    },
    {
      _id: 'review-mega-bloks',
      _type: 'toyReview',
      productName: 'MEGA BLOKS First Builders Big Building Bag',
      brand: 'MEGA',
      slug: { _type: 'slug', current: 'mega-bloks-first-builders' },
      ageRange: { minMonths: 12, maxMonths: 60 },
      category: { _type: 'reference', _ref: 'cat-building' },
      materialSafety: 85,
      chokingRisk: 90,
      recallHistory: 88,
      certificationPresence: 85,
      motorSkills: 82,
      cognitiveSkills: 70,
      sensoryEngagement: 75,
      safetyScore: 87,
      developmentScore: 76,
      materials: ['BPA-free plastic'],
      chokingHazardAssessment: 'Large oversized blocks designed specifically for small hands. No choking hazard for ages 1+.',
      certifications: ['ASTM F963', 'CPSIA compliant'],
      pros: ['Very affordable', 'Easy to grip for small hands', 'Compatible with other MEGA BLOKS sets', 'Comes with storage bag'],
      cons: ['Plastic material less eco-friendly', 'Limited color variety in base set'],
      alternatives: [{ _type: 'reference', _ref: 'review-wooden-blocks' }],
      affiliateLinks: [{ _type: 'affiliateLink', partnerId: 'amazon', url: 'https://amazon.com/dp/B007GE75HY', tag: 'safenest-20' }],
      hasActiveRecall: false,
      needsReview: false,
    },
    {
      _id: 'review-water-table',
      _type: 'toyReview',
      productName: 'Step2 Rain Showers Splash Pond Water Table',
      brand: 'Step2',
      slug: { _type: 'slug', current: 'step2-rain-showers-water-table' },
      ageRange: { minMonths: 18, maxMonths: 72 },
      category: { _type: 'reference', _ref: 'cat-outdoor' },
      materialSafety: 88,
      chokingRisk: 75,
      recallHistory: 92,
      certificationPresence: 80,
      motorSkills: 90,
      cognitiveSkills: 80,
      sensoryEngagement: 95,
      safetyScore: 84,
      developmentScore: 88,
      materials: ['BPA-free plastic', 'stainless steel hardware'],
      chokingHazardAssessment: 'Includes small accessories (cups, spinners) that pose choking risk for children under 18 months. Recommended 18m+.',
      certifications: ['ASTM F963', 'CPSIA compliant'],
      pros: ['Excellent sensory engagement', 'Multi-level design keeps interest', 'Durable for outdoor use', 'Easy assembly'],
      cons: ['Large footprint requires outdoor space', 'Small accessories can be lost easily', 'No drain plug on some models'],
      alternatives: [{ _type: 'reference', _ref: 'review-sensory-bin' }],
      affiliateLinks: [{ _type: 'affiliateLink', partnerId: 'amazon', url: 'https://amazon.com/dp/B01BWGKEEY', tag: 'safenest-20' }],
      hasActiveRecall: false,
      needsReview: false,
    },
    {
      _id: 'review-sensory-bin',
      _type: 'toyReview',
      productName: 'Learning Resources Playfoam Sensory Set',
      brand: 'Learning Resources',
      slug: { _type: 'slug', current: 'learning-resources-playfoam-sensory' },
      ageRange: { minMonths: 36, maxMonths: 96 },
      category: { _type: 'reference', _ref: 'cat-sensory' },
      materialSafety: 90,
      chokingRisk: 80,
      recallHistory: 95,
      certificationPresence: 88,
      motorSkills: 85,
      cognitiveSkills: 78,
      sensoryEngagement: 95,
      safetyScore: 88,
      developmentScore: 86,
      materials: ['non-toxic foam compound', 'recyclable packaging'],
      chokingHazardAssessment: 'Foam pieces can break into small chunks. Recommended for 3+ years with supervision.',
      certifications: ['ASTM F963', 'CE mark', 'Non-toxic certified'],
      pros: ['Mess-free sensory play', 'Never dries out', 'Multiple colors included', 'Encourages fine motor skills'],
      cons: ['Not suitable for children who mouth toys', 'Can stick to carpet if pressed in'],
      alternatives: [{ _type: 'reference', _ref: 'review-water-table' }],
      affiliateLinks: [{ _type: 'affiliateLink', partnerId: 'amazon', url: 'https://amazon.com/dp/B003U6T3SC', tag: 'safenest-20' }],
      hasActiveRecall: false,
      needsReview: false,
    },
    {
      _id: 'review-shape-sorter',
      _type: 'toyReview',
      productName: 'Fisher-Price Baby\'s First Blocks Shape Sorter',
      brand: 'Fisher-Price',
      slug: { _type: 'slug', current: 'fisher-price-shape-sorter' },
      ageRange: { minMonths: 6, maxMonths: 36 },
      category: { _type: 'reference', _ref: 'cat-educational' },
      materialSafety: 88,
      chokingRisk: 92,
      recallHistory: 80,
      certificationPresence: 90,
      motorSkills: 90,
      cognitiveSkills: 88,
      sensoryEngagement: 72,
      safetyScore: 87,
      developmentScore: 84,
      materials: ['BPA-free plastic'],
      chokingHazardAssessment: 'All shapes are oversized (larger than 2 inches). No choking hazard. Safe for 6 months+.',
      certifications: ['ASTM F963', 'CPSIA', 'Toy Safety Directive 2009/48/EC'],
      pros: ['Classic developmental toy', 'Teaches shapes and colors', 'Lid doubles as shape sorter', 'Very affordable'],
      cons: ['Plastic construction less durable long-term', 'Limited to 10 shapes'],
      alternatives: [{ _type: 'reference', _ref: 'review-wooden-blocks' }],
      affiliateLinks: [{ _type: 'affiliateLink', partnerId: 'amazon', url: 'https://amazon.com/dp/B000LSZVKA', tag: 'safenest-20' }],
      hasActiveRecall: false,
      needsReview: false,
    },
  ];

  for (const review of reviews) {
    // Create without alternatives first (cross-references need both docs to exist)
    const { alternatives, ...reviewWithoutAlts } = review;
    await client.createOrReplace(reviewWithoutAlts);
    console.log(`  ✓ Review: ${review.productName} (Safety: ${review.safetyScore}, Dev: ${review.developmentScore})`);
  }

  // Now patch alternatives
  for (const review of reviews) {
    if (review.alternatives && review.alternatives.length > 0) {
      await client.patch(review._id).set({ alternatives: review.alternatives }).commit();
    }
  }
  console.log('  ✓ Alternatives linked');


  // 3. Create a blog post
  const blogPost = {
    _id: 'blog-choosing-first-toys',
    _type: 'blogPost',
    title: 'How to Choose Safe First Toys for Your Baby',
    slug: { _type: 'slug', current: 'choosing-safe-first-toys' },
    publishedAt: '2024-12-15T10:00:00Z',
    excerpt: 'A comprehensive guide to selecting age-appropriate, safety-tested toys for babies 0-12 months.',
    author: 'SafeNest Editorial Team',
    body: [
      {
        _type: 'block',
        _key: 'intro1',
        style: 'normal',
        children: [{ _type: 'span', _key: 's1', text: 'Choosing your baby\'s first toys can feel overwhelming. With thousands of options and conflicting safety advice, how do you know what\'s actually safe? This guide breaks down the key factors every parent should consider.' }],
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'h1',
        style: 'h2',
        children: [{ _type: 'span', _key: 's2', text: 'Check for Age-Appropriate Labeling' }],
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'p2',
        style: 'normal',
        children: [{ _type: 'span', _key: 's3', text: 'Always look for age recommendations on packaging. Toys labeled for 0-6 months should have no small parts, no sharp edges, and materials that can withstand mouthing. Avoid anything with parts smaller than 1.75 inches for babies under 3 years.' }],
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'h2',
        style: 'h2',
        children: [{ _type: 'span', _key: 's4', text: 'Look for Safety Certifications' }],
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'p3',
        style: 'normal',
        children: [{ _type: 'span', _key: 's5', text: 'Key certifications to look for include ASTM F963 (US toy safety standard), CPSIA compliance, and the CE mark for European standards. These indicate the toy has been tested for lead content, choking hazards, and mechanical safety.' }],
        markDefs: [],
      },
    ],
  };

  await client.createOrReplace(blogPost);
  console.log(`  ✓ Blog post: ${blogPost.title}`);

  // 4. Create a safety article
  const safetyArticle = {
    _id: 'article-recall-awareness',
    _type: 'safetyArticle',
    title: 'Understanding Toy Recalls: What Parents Need to Know',
    slug: { _type: 'slug', current: 'understanding-toy-recalls' },
    publishedAt: '2025-01-10T08:00:00Z',
    excerpt: 'A parent-friendly guide to toy recalls — how they work, where to check, and what to do if your child\'s toy is recalled.',
    body: [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        children: [{ _type: 'span', _key: 's1', text: 'Toy recalls happen more often than most parents realize. The CPSC issues dozens of toy recalls each year. Knowing how to stay informed can protect your family.' }],
        markDefs: [],
      },
    ],
  };

  await client.createOrReplace(safetyArticle);
  console.log(`  ✓ Safety article: ${safetyArticle.title}`);

  // 5. Create a recall alert
  const recallAlert = {
    _id: 'recall-example-magnetic-tiles',
    _type: 'recallAlert',
    affectedProduct: 'MagicTiles Magnetic Building Set (Model MT-200)',
    recallDate: '2025-01-05',
    recallReason: 'Magnets can detach from tiles, posing ingestion and internal injury hazard to young children.',
    issuingAuthority: 'U.S. Consumer Product Safety Commission (CPSC)',
    recommendedAction: 'Stop using immediately. Contact manufacturer for full refund. Do not attempt to repair.',
    officialNoticeUrl: 'https://www.cpsc.gov/Recalls',
    isResolved: false,
    publishedAt: '2025-01-06T12:00:00Z',
  };

  await client.createOrReplace(recallAlert);
  console.log(`  ✓ Recall alert: ${recallAlert.affectedProduct}`);

  // 6. Create a buying guide
  const buyingGuide = {
    _id: 'guide-best-building-toys',
    _type: 'buyingGuide',
    title: 'Best Building Toys for Toddlers (2025)',
    slug: { _type: 'slug', current: 'best-building-toys-toddlers-2025' },
    targetAgeRange: { minMonths: 12, maxMonths: 48 },
    reviews: [
      { _type: 'reference', _ref: 'review-wooden-blocks' },
      { _type: 'reference', _ref: 'review-mega-bloks' },
      { _type: 'reference', _ref: 'review-shape-sorter' },
    ],
    body: [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        children: [{ _type: 'span', _key: 's1', text: 'Building toys are among the best investments for toddler development. They build fine motor skills, spatial reasoning, and creative thinking. Here are our top picks tested for safety and developmental value.' }],
        markDefs: [],
      },
    ],
  };

  await client.createOrReplace(buyingGuide);
  console.log(`  ✓ Buying guide: ${buyingGuide.title}`);

  console.log('\n✅ Seeding complete! Content is now published on Sanity.');
  console.log('   Refresh http://localhost:3001 to see the content.');
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err.message);
  process.exit(1);
});
