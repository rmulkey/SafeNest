# Image Upload Guide for SafetyNest Products

This guide explains how to upload product images to Sanity Studio for all 50 toy review products.

## How to Upload Images via Sanity Studio

### Option 1: Manual Upload (Sanity Studio UI)

1. Open Sanity Studio at your project URL (e.g., `https://ofvgjgsi.sanity.studio/`)
2. Navigate to **Toy Reviews** in the left sidebar
3. Select the product you want to add an image to
4. Scroll to the **Main Image** field
5. Click **Upload** or drag-and-drop an image file
6. Add descriptive **alt text** for accessibility (e.g., "LEGO DUPLO Classic Brick Box with colorful bricks")
7. Click **Publish** to save

### Option 2: Bulk Upload via Script

Use the existing `scripts/upload-images.mjs` pattern to batch upload images:

```javascript
import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'ofvgjgsi',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

// Upload from URL
const response = await fetch(imageUrl);
const buffer = await response.arrayBuffer();
const asset = await client.assets.upload('image', Buffer.from(buffer), {
  filename: 'product-name.jpg',
  contentType: 'image/jpeg',
});

// Attach to document
await client.patch('review-product-id').set({
  mainImage: {
    _type: 'image',
    alt: 'Product description for accessibility',
    asset: { _type: 'reference', _ref: asset._id },
  },
}).commit();
```

### Option 3: Download from Amazon and Upload

1. Visit the Amazon product page using the URLs below
2. Right-click the main product image → **Save Image As**
3. Save with a descriptive filename (e.g., `lego-duplo-brick-box.jpg`)
4. Upload to Sanity Studio using Option 1 or 2

> **Note:** Amazon product images are copyrighted. For production use, contact brands for official press images or use licensed stock photography.

## Image Requirements

| Property | Recommendation |
|----------|---------------|
| Format | JPEG or WebP preferred, PNG acceptable |
| Min Resolution | 800×800px |
| Max File Size | 5MB |
| Aspect Ratio | 1:1 (square) preferred for cards |
| Background | White or transparent preferred |
| Alt Text | Required — describe the product clearly |

## All 50 Products Reference Table

### Building Toys (cat-building)

| # | Product Name | Brand | Amazon URL |
|---|---|---|---|
| 1 | Mega Bloks First Builders | Mega Bloks | https://amazon.com/dp/B007GE75HY |
| 2 | Wooden Block Set | Melissa & Doug | https://amazon.com/dp/B000068CKY |
| 3 | B. toys Bristle Blocks | B. toys | https://amazon.com/dp/B004R2FZIY |
| 4 | Grimm's Large Rainbow Stacker | Grimm's | https://amazon.com/dp/B0017IUSFG |
| 5 | LEGO DUPLO Classic Brick Box | LEGO DUPLO | https://amazon.com/dp/B00NHQF6MG |
| 6 | Magna-Tiles Clear Colors 100pc | Magna-Tiles | https://amazon.com/dp/B000CBSNRY |
| 7 | Tegu 14-Piece Magnetic Blocks | Tegu | https://amazon.com/dp/B007PRNBUY |
| 8 | Magna-Tiles Stardust 15pc | Magna-Tiles | https://amazon.com/dp/B09DP6ND45 |
| 9 | Tegu Sunset 24-Piece | Tegu | https://amazon.com/dp/B009RKLFCU |
| 10 | B. toys One Two Squeeze Blocks | B. toys | https://amazon.com/dp/B01LWOFWN8 |
| 11 | LEGO DUPLO Steam Train | LEGO DUPLO | https://amazon.com/dp/B07FNNNQS4 |

### Sensory Toys (cat-sensory)

| # | Product Name | Brand | Amazon URL |
|---|---|---|---|
| 1 | Manhattan Toy Skwish Rattle | Manhattan Toy | https://amazon.com/dp/B000BNCA4Y |
| 2 | Fat Brain Toys Dimpl | Fat Brain Toys | https://amazon.com/dp/B019K4FC2S |
| 3 | Oball Classic Ball | Oball | https://amazon.com/dp/B001UXCIQM |
| 4 | Skip Hop Activity Gym | Skip Hop | https://amazon.com/dp/B071KGRM4V |
| 5 | Infantino Textured Balls | Infantino | https://amazon.com/dp/B005GUKXYQ |
| 6 | Baby Einstein Take Along Tunes | Baby Einstein | https://amazon.com/dp/B000YDDF6O |
| 7 | Sophie la Girafe Teether | Sophie la Girafe | https://amazon.com/dp/B000IDSLOG |
| 8 | Lamaze Freddie the Firefly | Lamaze | https://amazon.com/dp/B004LRJAHI |
| 9 | Nuby IcyBite Teething Keys | Nuby | https://amazon.com/dp/B003N9M6YI |
| 10 | Edushape Sensory Ball Set | Edushape | https://amazon.com/dp/B000LRUOSG |
| 11 | VTech KidiBeats Drum Set | VTech | https://amazon.com/dp/B007XVYSDI |
| 12 | Manhattan Toy Winkel Rattle | Manhattan Toy | https://amazon.com/dp/B000BNCA4Y |
| 13 | Fat Brain Toys InnyBin | Fat Brain Toys | https://amazon.com/dp/B07BFGMP3K |
| 14 | Skip Hop Bandana Buddies | Skip Hop | https://amazon.com/dp/B013GY4ZJO |

### Educational Toys (cat-educational)

| # | Product Name | Brand | Amazon URL |
|---|---|---|---|
| 1 | Shape Sorter | Generic | (original seed) |
| 2 | Sensory Bin Kit | Generic | (original seed) |
| 3 | Hape Pound & Tap Xylophone | Hape | https://amazon.com/dp/B00BWQMFHE |
| 4 | Green Toys Stacking Cups | Green Toys | https://amazon.com/dp/B003BKCLUB |
| 5 | Lovevery Play Kits (0-12m) | Lovevery | https://amazon.com/dp/B07XZHX58N |
| 6 | VTech Sit-to-Stand Walker | VTech | https://amazon.com/dp/B0053X62GK |
| 7 | Crayola My First Tripod Crayons | Crayola | https://amazon.com/dp/B00004S9NZ |
| 8 | PlanToys Stacking Ring | PlanToys | https://amazon.com/dp/B001XDZUUW |
| 9 | LeapFrog Learning Friends Book | LeapFrog | https://amazon.com/dp/B00CQHZU4G |
| 10 | Play-Doh Starter Set | Play-Doh | https://amazon.com/dp/B09BW7LGMG |
| 11 | KiwiCo Panda Crate | KiwiCo | https://amazon.com/dp/B0BXMWJGBY |
| 12 | LEGO DUPLO Number Train | LEGO DUPLO | https://amazon.com/dp/B08G4GPS5Q |
| 13 | PlanToys My First Camera | PlanToys | https://amazon.com/dp/B008LWKLOO |
| 14 | Fisher-Price Smart Stages Chair | Fisher-Price | https://amazon.com/dp/B00CHOL52I |
| 15 | Melissa & Doug Latches Board | Melissa & Doug | https://amazon.com/dp/B000GKA9A6 |
| 16 | Hape Shape Sorter Xylophone | Hape | https://amazon.com/dp/B0079PC6AE |
| 17 | Infantino Flip & Peek Phone | Infantino | https://amazon.com/dp/B075XGSL4X |
| 18 | Crayola Washable Finger Paints | Crayola | https://amazon.com/dp/B000REI1FU |

### Outdoor Toys (cat-outdoor)

| # | Product Name | Brand | Amazon URL |
|---|---|---|---|
| 1 | Water Table | Generic | (original seed) |
| 2 | Radio Flyer Classic Red Wagon | Radio Flyer | https://amazon.com/dp/B00000K1VS |
| 3 | Little Tikes Cozy Coupe | Little Tikes | https://amazon.com/dp/B001NQHNA4 |
| 4 | Piccalio Pikler Triangle | Piccalio | https://amazon.com/dp/B09NNKDTVC |
| 5 | Little Tikes First Slide | Little Tikes | https://amazon.com/dp/B004OR1TLA |
| 6 | Step2 Naturally Playful Sandbox | Step2 | https://amazon.com/dp/B001BADJNK |
| 7 | Green Toys Dump Truck | Green Toys | https://amazon.com/dp/B001Q2Z2IK |

## Tips for Best Results

- **Use official product images** from brand press kits when possible
- **Maintain consistent sizing** — crop all images to square before uploading
- **Optimize file size** — use TinyPNG or Squoosh to compress before upload
- **Write meaningful alt text** — describe what's visible in the image for screen readers
- **Check mobile preview** — images should look clear at small card sizes (200×200px)

## Automating with the Upload Script

To bulk upload images you've downloaded locally:

```bash
# Place images in a folder named by review ID
# e.g., images/review-lego-duplo-brick-box.jpg

SANITY_API_TOKEN="your-token" node scripts/upload-images.mjs
```

The script will match filenames to review IDs and upload + attach them automatically.
