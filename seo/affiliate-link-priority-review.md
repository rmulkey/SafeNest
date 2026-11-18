# SafeNest affiliate-link candidate review

Prepared November 17, 2026 (America/New_York). **Review only — no production changes, commits, pushes, pull requests, or publication.**

Six evidence-backed candidate ASINs were identified, but **zero passed live Amazon verification**. Every direct probe returned HTTP 503. Amazon's browser page also rejected the session/client. These results are inconclusive, not proof that the products are unavailable or the ASINs are dead. Keep all six search fallbacks in place.

## Baseline and priority

The current main commit is [76b1419dea6144c804a0a80217b482cf814a4c5e](https://github.com/rmulkey/SafeNest/commit/76b1419dea6144c804a0a80217b482cf814a4c5e), dated November 4. Both the checked-in inventories and the live public Sanity query show **148 reviews: 134 search links and 14 direct links**. All six target records still contain search URLs with `safeneststore-20` stored separately.

Priority below is descending **historical impressions**, not estimated earnings or current rank. The [GSC findings](https://github.com/rmulkey/SafeNest/blob/76b1419dea6144c804a0a80217b482cf814a4c5e/seo/gsc-findings.md) cover June 2–August 23, 2026 (83 days), reported August 25. These six rows sum to 269 impressions. Impressions are not visits, outbound clicks or orders. The Hape historical row is the www URL; do not silently merge host variants. Current GSC performance and conversion rates remain unverified.

| Priority | Review | Historical impressions / avg position | Candidate Amazon link — unverified | Required model or variant | Release status |
| --- | --- | --- | --- | --- | --- |
| 1 | Manhattan Toy Skwish Classic Rattle | 80 / 11.6 | [B000GI0S4E](https://www.amazon.com/dp/B000GI0S4E) | Skwish Classic; maker SKU 200970, candidate metadata 200980 | HOLD: HTTP 503 |
| 2 | Fat Brain Toys Dimpl Baby Toy | 58 / 9.9 | [B079CH7PLF](https://www.amazon.com/dp/B079CH7PLF) | Original Dimpl FA192-1; UPC 811802023230 | HOLD: HTTP 503 |
| 3 | Hape Pound & Tap Bench with Xylophone | 39 / 8.4 | [B00712O2D6](https://www.amazon.com/dp/B00712O2D6) | E0305 Pound & Tap Bench | HOLD: HTTP 503 |
| 4 | LeapFrog Learning Friends 100 Words Book | 37 / 8.0 | [B07CCFDZZ3](https://www.amazon.com/dp/B07CCFDZZ3) | Green Learning Friends, English/Spanish; candidate 80-601541 (frustration-free packaging) | HOLD: HTTP 503 |
| 5 | Janod Translucent Sensory Stacking Blocks | 35 / 7.3 | [B0DTQC82NN](https://www.amazon.com/dp/B0DTQC82NN) | J05306; 18 blocks plus six model cards | HOLD: HTTP 503 |
| 6 | Bright Starts Oball Shaker Toy | 20 / 8.1 | [B008J1QP7Y](https://www.amazon.com/dp/B008J1QP7Y) | 81107 / 81107-000; UPC 074451811072 | HOLD: HTTP 503 |

## Product matching and unresolved variants

The six live Sanity product images were inspected alongside the review fields. They establish what the reviews depict; they do not establish the live Amazon selection.

### 1. Manhattan Toy Skwish Classic Rattle

Required match: Single multicolored rubberwood/elastic Skwish Classic with sliding beads. SafeNest's image matches the Classic design; exclude Natural, Color Burst, Colorpop and gift bundles.

Candidate: [B000GI0S4E](https://www.amazon.com/dp/B000GI0S4E). Product identity confidence: medium. Live Amazon ASIN verification: **not verified**.

- Review name and live image identify the multicolored Classic design.
- Current maker page identifies the Classic as 200970.
- Secondary metadata prints B000GI0S4E for model 200980.

Remaining checks:

- Confirm whether the candidate is boxed Classic 200980 and physically equivalent to the pictured 200970. Cached packaging evidence supports this explanation, but the live Amazon selection remains inaccessible.
- Do not equate differing SKU, dimensions or packaging without checking the selected child ASIN and actual model.
- Maker describes a teether; SafeNest's current cons say it is not suitable for teething. This editorial discrepancy is flagged, not changed.

Conversion hypothesis, unmeasured: Removing the search step could keep safety-focused readers on the intended Classic product instead of sibling variants. This page had the most historical impressions in this six-page cohort.

Evidence: [M-SKWISH](https://www.manhattantoy.com/products/skwish-classic); [A-SKWISH](https://pricehistory.app/p/manhattan-toy-skwish-classic-af8qvxce); [P-SKWISH](https://www.esptoysales.com/pricelist/manhattan-toy-2025-price-list.pdf).

### 2. Fat Brain Toys Dimpl Baby Toy

Required match: One white ABS frame containing five differently sized colorful silicone bubbles, as shown in the review image. Exclude Dimpl Digits, Duo, Simpl Dimpl, Bright, Pops and multipacks.

Candidate: [B079CH7PLF](https://www.amazon.com/dp/B079CH7PLF). Product identity confidence: high product identity not live asin. Live Amazon ASIN verification: **not verified**.

- SafeNest's live image shows the original five-bubble toy.
- Retailer specifications connect the five-bubble toy to UPC 811802023230 and model FA192-1.
- Secondary ASIN metadata identifies B079CH7PLF for the Original Dimpl.

Remaining checks:

- The manufacturer detail page was inaccessible (403); retailer evidence supports product identity but is not a live Amazon check.
- Age labeling differs between the reviewed 10 months+ product and Target's 6 months+ display; confirm the current package/model before deployment.
- Confirm single-unit quantity, maker identity, selected child ASIN and current Amazon.com offer.

Conversion hypothesis, unmeasured: A direct Original Dimpl destination could reduce accidental selection of Digits, Duo or Simpl Dimpl after an outbound click.

Evidence: [R-DIMPL](https://www.target.com/p/fat-brain-toys-dimpl-baby-and-toddler-learning-toy/-/A-76544054); [R-DIMPL-MODEL](https://kazootoysatlanta.com/product/dimpl/); [A-DIMPL](https://montessoritoys.info/toys/fat-brain-toys-original-dimpl-brand-baby-toy-sensory-toys-for-babies/).

### 3. Hape Pound & Tap Bench with Xylophone

Required match: Yellow/natural wooden pounding bench, three colored balls, mallet and slide-out xylophone, matching SafeNest's image. Exclude E0334 Shape Sorter Xylophone and Piano, which has a separate review and direct link.

Candidate: [B00712O2D6](https://www.amazon.com/dp/B00712O2D6). Product identity confidence: high product identity not live asin. Live Amazon ASIN verification: **not verified**.

- SafeNest's image shows the bench, three balls, mallet and removable xylophone.
- Hape identifies that product as E0305.
- Secondary metadata explicitly pairs E0305 with B00712O2D6.

Remaining checks:

- Confirm the live Amazon child ASIN is E0305 with all components, rather than a bare instrument or sibling product.
- The maker page includes a small-parts warning; the review currently states no small parts. Reconcile the actual current package warning before treating this as ready.
- Stock, seller, US delivery and current availability were not verified.

Conversion hypothesis, unmeasured: A direct E0305 link could reduce confusion with Hape's different shape-sorter/xylophone products.

Evidence: [M-HAPE](https://toys.hape.com/products/e0305); [A-HAPE](https://device.report/hape/e0305).

### 4. LeapFrog Learning Friends 100 Words Book

Required match: Green handle, blue front cover, white body, Turtle/Tiger/Monkey and English/Spanish switch, visible in SafeNest's live image. Exclude pink/purple, English/Chinese, 100 Animals, Places I Go, Things That Go and Scout & Violet.

Candidate: [B07CCFDZZ3](https://www.amazon.com/dp/B07CCFDZZ3). Product identity confidence: high product family packaging unconfirmed. Live Amazon ASIN verification: **not verified**.

- Review pros specify English/Spanish and the live image confirms those labels.
- LeapFrog's US page corroborates the Learning Friends characters, language pair, age range and controls.
- B07CCFDZZ3 is independently documented as the green frustration-free-packaging edition, model 80-601541.

Remaining checks:

- SafeNest does not record a packaging SKU. The primary candidate is frustration-free packaging, not the maker page's standard model 80-601540.
- The likely standard-package alternative B07B6ZN7P8 should be preferred if an exact 80-601540 listing is required, but it also needs a live check.
- Physical/content equivalence across packaging codes is supported by descriptions, not confirmed by a live Amazon variant comparison.

Alternative to investigate: [B07B6ZN7P8](https://www.amazon.com/dp/B07B6ZN7P8) — 80-601540, standard packaging, green English/Spanish. unverified alternative not probed.

Conversion hypothesis, unmeasured: A direct green English/Spanish Learning Friends link could prevent readers selecting another language, book title or color family.

Evidence: [M-LEAP](https://store.leapfrog.com/en-us/store/p/learning-friends-100-words-book/_/A-prod80-601540); [A-LEAP-FFP](https://www.slashskill.com/deals/product/B07CCFDZZ3/leapfrog-learning-friends-100-words-book-frustration-free-packaging-green/); [A-LEAP-STANDARD](https://pricehistory.app/p/leapfrog-learning-friends-100-words-book-RTnGzrmb).

### 5. Janod Translucent Sensory Stacking Blocks

Required match: 12 translucent geometric wooden-framed blocks plus six printed wooden pieces and six activity cards. SafeNest's image shows the translucent shapes and printed animal pieces.

Candidate: [B0DTQC82NN](https://www.amazon.com/dp/B0DTQC82NN). Product identity confidence: high model match low us catalog confirmation. Live Amazon ASIN verification: **not verified**.

- Janod identifies the reviewed set as J05306.
- Maker and secondary catalog agree on the 12+6 blocks and six cards.
- Secondary metadata explicitly prints candidate ASIN B0DTQC82NN for J05306.

Remaining checks:

- No accessible first-party US Amazon catalog evidence confirms that B0DTQC82NN exists or is offered on Amazon.com; an overseas ASIN is not sufficient.
- Some listings say 24 pieces because they include six cards; confirm contents rather than treating that count alone as a different product.
- Exclude generic sensory blocks, 16-block sets, other Janod sets and multipacks; verify the pictured printed pieces.

Conversion hypothesis, unmeasured: A direct exact-set link could avoid generic sensory-block substitutions, but a missing or import-only US offer could worsen the funnel. Keep the fallback until US catalog presence is confirmed.

Evidence: [M-JANOD](https://www.janod.us/1140-sensory-translucent-stacking-blocks.html); [A-JANOD](https://www.desertcart.in/products/772107545-sensory-translucent-blocks-sensory-toy-baby-toy-from-12-months).

### 6. Bright Starts Oball Shaker Toy

Required match: One blue/green dumbbell-shaped Oball Shaker with clear rattling-bead handle and two flexible ends, matching the current review photo.

Candidate: [B008J1QP7Y](https://www.amazon.com/dp/B008J1QP7Y). Product identity confidence: high product identity not live asin. Live Amazon ASIN verification: **not verified**.

- SafeNest's image matches the blue/green two-ended shaker.
- Kids2 identifies that form as 81107-000; Target supplies matching UPC 074451811072.
- A US catalog tracker explicitly prints B008J1QP7Y for the Oball Shaker.

Remaining checks:

- Do not reuse the repository's review-oball-rattle ASIN B00ZRD99C0; that is a different review/product.
- Exclude the round Oball Rattle (81031), Easy-Grasp ball, barbell look-alikes and gift sets.
- Confirm selected color, single-item quantity, model/UPC and actual Amazon.com availability. Maker age guidance differs from SafeNest, so check the package.

Conversion hypothesis, unmeasured: A direct shaker link could prevent confusion with the round Oball or gift bundles. This page has the lowest historical exposure of the six, so it is last in the exposure-based queue.

Evidence: [M-OBALL](https://shop.kids2.com/collections/bright-starts-0-3-months/products/bright-starts-shaker-toy); [R-OBALL](https://www.target.com/p/-/A-76152378); [A-OBALL](https://app.parseshelf.com/best-sellers/asin/B008J1QP7Y/).


## Exact proposed production scope — conditional, not applied

Only replace the selected Amazon entry's `url` after all exact-match/access checks pass and production approval is given. Preserve the existing tag, keys, other link fields, other merchants and review content. The master JSON records old URL, proposed URL, document ID, current revision and keyed field path for each review.

| Review slug | Sanity document | Existing Amazon key | Before | Proposed after — on hold |
| --- | --- | --- | --- | --- |
| `manhattan-toy-skwish-rattle` | `review-manhattan-toy-skwish` | `amazon-direct` | [current search](https://www.amazon.com/s?k=Manhattan%20Toy%20Skwish%20Classic%20Rattle) | [candidate B000GI0S4E](https://www.amazon.com/dp/B000GI0S4E) |
| `fat-brain-dimpl` | `review-fat-brain-dimpl` | `amazon-search` | [current search](https://www.amazon.com/s?k=Fat%20Brain%20Toys%20Dimpl%20Baby%20Toy) | [candidate B079CH7PLF](https://www.amazon.com/dp/B079CH7PLF) |
| `hape-pound-tap-xylophone` | `review-hape-xylophone` | `amazon-search` | [current search](https://www.amazon.com/s?k=Hape%20Pound%20%26%20Tap%20Bench%20with%20Xylophone) | [candidate B00712O2D6](https://www.amazon.com/dp/B00712O2D6) |
| `leapfrog-learning-friends-book` | `review-leapfrog-learning-friends` | `amazon-direct` | [current search](https://www.amazon.com/s?k=LeapFrog%20Learning%20Friends%20100%20Words%20Book) | [candidate B07CCFDZZ3](https://www.amazon.com/dp/B07CCFDZZ3) |
| `janod-translucent-sensory-stacking-blocks` | `review-janod-translucent-stacking-blocks` | `amazon-search` | [current search](https://www.amazon.com/s?k=Janod%20Translucent%20Sensory%20Stacking%20Blocks) | [candidate B0DTQC82NN](https://www.amazon.com/dp/B0DTQC82NN) |
| `bright-starts-oball-shaker-toy` | `review-bright-starts-oball-shaker-toy` | `amazon` | [current search](https://www.amazon.com/s?k=Bright%20Starts%20Oball%20Shaker%20Toy) | [candidate B008J1QP7Y](https://www.amazon.com/dp/B008J1QP7Y) |

Every proposal has `apply: false` and status `HOLD`. `approved-asins.json` is intentionally empty. If all six eventually clear, the hypothetical inventory becomes 128 search / 20 direct, still 148 reviews. That change has not occurred.

Before any write, re-read the live document and require a fresh revision precondition plus the expected old URL. Change only the keyed link URL. The existing verifier builds a replacement affiliateLinks array from its read; a future apply should avoid overwriting concurrent edits.

## Verification performed

| Check | Result | Interpretation |
| --- | --- | --- |
| Pinned GitHub inventories | 134 search / 14 direct | Reproduced the supplied November 4 baseline. |
| Live public Sanity GET | 148 reviews; same inventory; all six still search links | No token needed for these public reads. |
| Six live review images | Inspected | Supports product identity and variant exclusions. |
| ASIN format and input mapping | Six valid, unique 10-character ASINs | Syntax only; not product verification. |
| Existing make-asin-worksheet CLI | Exit 1: missing SANITY_API_TOKEN | The unchanged script cannot run here; public reads supplied the research worksheet. |
| Existing verify-asins CLI with --dry-run | Exit 1: missing SANITY_API_TOKEN | No dry-run success is claimed. |
| Existing probeAsin logic in isolated GET-only harness | Six HTTP 503 / inconclusive, zero OK | q/mutate functions and the production loop were excluded. Raw results are bundled. |
| Browser inspection of Dimpl candidate | Redirected to amazon.com/error/500; unsupported session/client | No product or selected variant was visible. No further Amazon routes were tried in the browser. |
| Production mutations / repository commits / publishing | Zero / zero / zero | Approval boundary preserved. |

The read-only harness reuses the repository's constants, tokenization and probe function. Its `inconclusive` verdict is preserved for every candidate. The initial materialized script had an extra trailing newline; the extracted probe code is unchanged, and the bundled original is restored byte-for-byte with Git blob SHA `c71c64add5b0d3f9866a5ec16feb932a25d739fa`.

The [repository verifier](https://github.com/rmulkey/SafeNest/blob/76b1419dea6144c804a0a80217b482cf814a4c5e/scripts/verify-asins.mjs) accepts a 50% significant-title-word overlap. That is useful for obvious transcription errors, but cannot establish language, color, model, bundle quantity, current availability, or the selected child ASIN. A title-match OK would still require those checks.

## Checks blocked by access or credentials

- **Sanity workflow:** `SANITY_API_TOKEN` is absent. It is required by the unmodified worksheet and verifier even for dry runs. The public records were readable; no production write was attempted.
- **Amazon:** all six direct page probes returned 503; the browser rejected the session. Need a live first-party product/catalog response confirming child ASIN, brand/model/UPC, exact variant, components and current US offer. The overseas Janod mapping particularly needs Amazon.com confirmation.
- **Amazon catalog API:** `AMAZON_CREATORS_CLIENT_ID` and `AMAZON_CREATORS_CLIENT_SECRET` are absent. API eligibility was not tested.
- **Current search performance:** `GSC_SERVICE_ACCOUNT_KEY` is absent. The existing `scripts/pull-search-console.mjs` workflow needs a service account with property read access; no current rankings are asserted.
- **Purchase measurement:** no Amazon Associates purchase-report access or analytics dashboards were available. Repository code shows outbound `affiliate_click` events, not observed Amazon purchases.

## Expected benefit: hypotheses and measurement

The hypothesis is that removing the results-page selection step increases qualifying orders or commission per eligible Amazon click. The direction and size are not measured. Direct links may perform poorly if a selected variant is unavailable, mismatched or an import offer; those risks explain the holds.

The existing `affiliate_click` event includes product ID, source page and partner. That can measure outbound-click rate once dashboard data is accessible, but an outbound click is not a purchase. The shared `safeneststore-20` tag does not independently identify each review's resulting orders.

After verification and approval, retain comparable traffic/affiliate-click baselines, refresh GSC for canonical and www pages, and compare equivalent periods/cohorts using qualifying orders, returns and net commission. Per-page purchase attribution would need separately approved tracking/reporting changes. Wait for adequate observations rather than declaring a result from the tiny historical cohort.

A planning identity, not a forecast: incremental earnings = eligible outbound clicks × (direct purchase rate − search purchase rate) × mean qualifying commission per order. All three inputs are currently unmeasured.

## Proposed repository additions for approval

These are proposed local additions only; no tracked repository was edited or committed:

1. `seo/affiliate-link-priority-candidates.json` — full prioritized candidates, evidence, uncertainties and holds.
2. `seo/affiliate-link-priority-review.md` — this audit report.
3. `seo/affiliate-link-priority-verification.json` — credential checks, raw probe results and live inventory evidence.
4. `scripts/asin-priority-dry-run.json` — six slug/ASIN rows in the existing verifier's input shape, explicitly marked unverified. **Use only with --dry-run; its extra metadata is ignored by that script.**

The bundle includes a patch adding those four files, a GET-only probe harness, the pinned verifier, public source snapshots, raw results, and an empty approved-ASIN file. It includes no executable production mutation.

Approval can cover committing these research files only. Production replacement and publication require separate explicit approval after the live checks and variant holds are resolved.

## Evidence directory

Evidence was accessed November 17, 2026. Manufacturer and retailer pages establish product descriptions; secondary ASIN records are corroboration, never substituted for live Amazon verification. No quoted prices, stock, seller, sales volume or safety certification claims from secondary pages were accepted as verified current facts.

- **M-SKWISH** (manufacturer): [source](https://www.manhattantoy.com/products/skwish-classic). Skwish Classic is identified as SKU 200970, with multicolored rubberwood rods, sliding beads, elastic cords, and a 0+ age label.
- **A-SKWISH** (secondary asin metadata): [source](https://pricehistory.app/p/manhattan-toy-skwish-classic-af8qvxce). Maps Amazon.com identifier B000GI0S4E to Skwish Classic, model 200980. This differs from the current maker's SKU; it does not establish the selected live Amazon variant.
- **P-SKWISH** (cached manufacturer branded price list on sales representative site): [source](https://www.esptoysales.com/pricelist/manhattan-toy-2025-price-list.pdf). The retrieved 2025 list distinguishes 200970 unboxed (UPC 011964408924) and 200980 boxed (UPC 011964419630). A subsequent fetch returned 404; treat this as cached historical packaging evidence, not current catalog verification.
- **R-DIMPL** (retailer product specification): [source](https://www.target.com/p/fat-brain-toys-dimpl-baby-and-toddler-learning-toy/-/A-76544054). Describes one toy with five silicone bubbles in an ABS frame, UPC 811802023230. Its displayed age is 6 months+, while the review and candidate metadata use 10 months+; the current package label must resolve that difference.
- **R-DIMPL-MODEL** (retailer product specification): [source](https://kazootoysatlanta.com/product/dimpl/). Identifies Dimpl as manufacturer SKU FA192-1 and UPC 811802023230, with five bubbles and an ABS frame.
- **A-DIMPL** (secondary asin metadata): [source](https://montessoritoys.info/toys/fat-brain-toys-original-dimpl-brand-baby-toy-sensory-toys-for-babies/). Lists ASIN B079CH7PLF for the Original Dimpl, one piece, with a 10-month+ description. Its prices, availability and review counts were not used as verified Amazon facts.
- **M-HAPE** (manufacturer): [source](https://toys.hape.com/products/e0305). Identifies E0305 as the Pound & Tap Bench with removable xylophone, suitable for 12M+. Its warning section includes a small-parts warning, which conflicts with the review's no-small-parts wording.
- **A-HAPE** (secondary asin metadata): [source](https://device.report/hape/e0305). Explicitly associates E0305 with ASIN B00712O2D6. This is ID corroboration only; unrelated document matches, battery data and safety claims on the aggregator are not verification.
- **M-LEAP** (manufacturer): [source](https://store.leapfrog.com/en-us/store/p/learning-friends-100-words-book/_/A-prod80-601540). The US Learning Friends book teaches English and Spanish, for ages 18–48 months, with Turtle, Tiger and Monkey, a language switch and star button. The standard product path identifies the 80-601540 family.
- **A-LEAP-FFP** (secondary asin metadata): [source](https://www.slashskill.com/deals/product/B07CCFDZZ3/leapfrog-learning-friends-100-words-book-frustration-free-packaging-green/). Associates B07CCFDZZ3 with green, English/Spanish Learning Friends, frustration-free packaging, model 80-601541. Its stock, seller and price claims were not treated as current verified facts.
- **A-LEAP-STANDARD** (secondary asin metadata): [source](https://pricehistory.app/p/leapfrog-learning-friends-100-words-book-RTnGzrmb). Associates standard model 80-601540 with Amazon.com identifier B07B6ZN7P8 and the English/Spanish book. This alternative was not directly probed after Amazon rejected access.
- **M-JANOD** (manufacturer): [source](https://www.janod.us/1140-sensory-translucent-stacking-blocks.html). Identifies J05306: 12 translucent blocks plus six printed wooden blocks and six model cards, for children from 12 months. There are 18 blocks; counting the cards explains some 24-piece descriptions.
- **A-JANOD** (secondary cross border catalog metadata): [source](https://www.desertcart.in/products/772107545-sensory-translucent-blocks-sensory-toy-baby-toy-from-12-months). Associates B0DTQC82NN with J05306 and the same 12 translucent blocks, six printed blocks and six cards. It is a non-US catalog page and does not prove Amazon.com listing existence or US availability.
- **M-OBALL** (manufacturer): [source](https://shop.kids2.com/collections/bright-starts-0-3-months/products/bright-starts-shaker-toy). Identifies the single blue/green dumbbell-shaped shaker as SKU 81107-000, with a transparent bead handle and two flexible ends. The maker lists ages 0–36 months; SafeNest currently says 3–18 months.
- **R-OBALL** (retailer product specification): [source](https://www.target.com/p/-/A-76152378). The Oball Shaker listing supplies UPC 074451811072 and matches the clear handle/two-ended design.
- **A-OBALL** (secondary us asin metadata): [source](https://app.parseshelf.com/best-sellers/asin/B008J1QP7Y/). Explicitly associates US Amazon ASIN B008J1QP7Y with Bright Starts Oball Shaker Rattle Toy. The latest displayed snapshot was November 9, 2026; this does not confirm present stock or the live selected variant.
