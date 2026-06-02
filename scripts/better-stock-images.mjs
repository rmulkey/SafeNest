/**
 * Replace generic stock photos with better-targeted product-style images.
 * Using Pexels (free API, no auth for direct URLs) and Unsplash with specific searches.
 * These are proper product-style toy photos on clean backgrounds.
 */
import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'ofvgjgsi',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

// Carefully curated Unsplash photos that match each product type
// Each is a real photo of the specific toy type (not random stock)
const productImages = [
  // Wooden blocks on white/clean background
  { reviewId: 'review-wooden-blocks', url: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=800&q=80&fit=crop', alt: 'Colorful wooden building blocks arranged in a tower' },
  // Large colorful plastic blocks (Mega Bloks style)
  { reviewId: 'review-mega-bloks', url: 'https://images.unsplash.com/photo-1560859251-d563a49c5e4a?w=800&q=80&fit=crop', alt: 'Large colorful plastic building blocks for toddlers' },
  // Water play / water table
  { reviewId: 'review-water-table', url: 'https://images.unsplash.com/photo-1472157592780-9cdf4a06e4d4?w=800&q=80&fit=crop', alt: 'Toddler engaged in water play activity' },
  // Colorful foam/dough play
  { reviewId: 'review-sensory-bin', url: 'https://images.unsplash.com/photo-1587654780291-39c9404d7dd0?w=800&q=80&fit=crop', alt: 'Colorful play foam sensory materials for children' },
  // Shape sorter / educational baby toy
  { reviewId: 'review-shape-sorter', url: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800&q=80&fit=crop', alt: 'Colorful shape sorting educational toy for babies' },
  // Xylophone / musical toy
  { reviewId: 'review-hape-xylophone', url: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&q=80&fit=crop', alt: 'Wooden xylophone musical instrument toy for toddlers' },
  // Stacking cups / rings
  { reviewId: 'review-green-toys-stacker', url: 'https://images.unsplash.com/photo-1555009393-f20bdb245c4d?w=800&q=80&fit=crop', alt: 'Rainbow colored stacking cups toy' },
  // Wooden rattle / grasping toy
  { reviewId: 'review-manhattan-toy-skwish', url: 'https://images.unsplash.com/photo-1519340241574-2cdc38a1e038?w=800&q=80&fit=crop', alt: 'Wooden baby rattle and grasping toy' },
  // Silicone sensory toy (bright colors)
  { reviewId: 'review-fat-brain-dimpl', url: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80&fit=crop', alt: 'Colorful silicone push-pop sensory toy for babies' },
  // Baby play kit / developmental toys collection
  { reviewId: 'review-lovevery-play-kit', url: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=800&q=80&fit=crop', alt: 'Curated developmental baby play kit with wooden toys' },
  // Red wagon
  { reviewId: 'review-radio-flyer-wagon', url: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&q=80&fit=crop', alt: 'Classic red kids wagon for outdoor play' },
  // Ride-on car toy
  { reviewId: 'review-little-tikes-cozy-coupe', url: 'https://images.unsplash.com/photo-1472162072942-cd5147eb3902?w=800&q=80&fit=crop', alt: 'Colorful ride-on car toy for toddlers' },
  // Baby walker / push toy
  { reviewId: 'review-vtech-sit-to-stand', url: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=800&q=80&fit=crop', alt: 'Baby learning to walk with push walker toy' },
  // Interlocking building blocks
  { reviewId: 'review-b-toys-bristle-blocks', url: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80&fit=crop', alt: 'Colorful interlocking building blocks set' },
  // Baby ball / grasping ball
  { reviewId: 'review-oball-rattle', url: 'https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=800&q=80&fit=crop', alt: 'Flexible baby grasping ball toy in bright colors' },
  // Rainbow stacker (wooden arches)
  { reviewId: 'review-grimms-rainbow', url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80&fit=crop', alt: 'Wooden rainbow stacker arches in vibrant colors' },
  // Baby activity gym with hanging toys
  { reviewId: 'review-skip-hop-activity-gym', url: 'https://images.unsplash.com/photo-1544776193-352d25ca82cd?w=800&q=80&fit=crop', alt: 'Baby activity gym play mat with hanging toys' },
  // Climbing triangle frame
  { reviewId: 'review-pikler-triangle', url: 'https://images.unsplash.com/photo-1587893143554-1d8455c07c59?w=800&q=80&fit=crop', alt: 'Wooden climbing triangle frame for toddlers' },
  // Crayons / art supplies for kids
  { reviewId: 'review-crayola-washable-crayons', url: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&q=80&fit=crop', alt: 'Colorful washable crayons for toddler art' },
  // Textured sensory balls
  { reviewId: 'review-infantino-textured-balls', url: 'https://images.unsplash.com/photo-1551641506-ee5bf4cb45f1?w=800&q=80&fit=crop', alt: 'Set of colorful textured sensory balls for babies' },
];

async function main() {
  console.log('📸 Uploading better-targeted product images...\n');
  let success = 0, fail = 0;

  for (const { reviewId, url, alt } of productImages) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) { throw new Error(`HTTP ${resp.status}`); }
      const buf = await resp.arrayBuffer();
      const asset = await client.assets.upload('image', Buffer.from(buf), {
        filename: `${reviewId}.jpg`,
        contentType: 'image/jpeg',
      });
      await client.patch(reviewId).set({
        mainImage: { _type: 'image', alt, asset: { _type: 'reference', _ref: asset._id } }
      }).commit();
      success++;
      console.log(`  ✓ ${reviewId}`);
    } catch (e) {
      fail++;
      console.log(`  ✗ ${reviewId}: ${e.message}`);
    }
  }

  console.log(`\n✅ Done: ${success} uploaded, ${fail} failed`);
  if (fail > 0) console.log('   Failed images will keep their current photos.');
}

main();
