import { groq } from "next-sanity";

// ─── Toy Reviews ────────────────────────────────────────────────────────────────

export const allToyReviewsQuery = groq`
  *[_type == "toyReview"] | order(_createdAt desc) {
    _id,
    productName,
    slug,
    ageRange,
    category->{_id, title, slug},
    safetyScore,
    developmentScore,
    materials,
    certifications,
    hasActiveRecall,
    affiliateLinks
  }
`;

export const toyReviewBySlugQuery = groq`
  *[_type == "toyReview" && slug.current == $slug][0] {
    _id,
    productName,
    slug,
    ageRange,
    category->{_id, title, slug},
    materialSafety,
    chokingRisk,
    recallHistory,
    certificationPresence,
    motorSkills,
    cognitiveSkills,
    sensoryEngagement,
    safetyScore,
    developmentScore,
    materials,
    chokingHazardAssessment,
    certifications,
    pros,
    cons,
    alternatives[]->{_id, productName, slug, safetyScore, developmentScore, mainImage},
    affiliateLinks,
    body,
    hasActiveRecall,
    needsReview,
    mainImage,
    brand,
    // Evidence-quality fields surfaced by EvidenceDisclosure.
    reviewedBy,
    lastReviewedAt,
    recallCheckedAt,
    publishedAt,
    // Evidence provenance per factor; absent on legacy rows and defaulted in code.
    factorEvidence,
    certificationEvidence[]{certification, status, sourceUrl}
  }
`;

export const toyReviewsByCategoryQuery = groq`
  *[_type == "toyReview" && category._ref == $categoryId] | order(_createdAt desc) [$start...$end] {
    _id,
    productName,
    slug,
    ageRange,
    safetyScore,
    developmentScore,
    materials,
    hasActiveRecall,
    affiliateLinks,
    mainImage
  }
`;

export const toyReviewsByAgeRangeQuery = groq`
  *[_type == "toyReview" && ageRange.minMonths <= $maxMonths && ageRange.maxMonths >= $minMonths] | order(safetyScore desc) {
    _id,
    productName,
    slug,
    ageRange,
    category->{_id, title, slug},
    safetyScore,
    developmentScore
  }
`;

export const featuredToyReviewsQuery = groq`
  *[_type == "toyReview"] | order(safetyScore desc) [0...6] {
    _id,
    productName,
    slug,
    ageRange,
    category->{_id, title, slug},
    safetyScore,
    developmentScore,
    materials,
    hasActiveRecall,
    affiliateLinks,
    mainImage
  }
`;

// Lightweight projection of ALL reviews for the global client-side search.
// Returns only the fields the search UI needs to render results.
export const searchableToyReviewsQuery = groq`
  *[_type == "toyReview"] | order(safetyScore desc) {
    _id,
    productName,
    slug,
    "category": category->title,
    safetyScore,
    ageRange,
    mainImage
  }
`;

// ─── Buying Guides ──────────────────────────────────────────────────────────────

export const allBuyingGuidesQuery = groq`
  *[_type == "buyingGuide"] | order(_createdAt desc) {
    _id,
    title,
    slug,
    targetAgeRange,
    _createdAt
  }
`;

/**
 * A buying guide plus the reviews it recommends.
 *
 * TWO FIELD NAMES, DELIBERATELY
 * The schema declares `reviewReferences`, but the seed scripts wrote `reviews`
 * and this query only ever read `reviews`. Documents therefore exist in both
 * shapes, and a guide authored against the schema rendered an empty product list
 * — silently, because a missing field is null rather than an error. `coalesce`
 * accepts either, so both old and new documents work.
 *
 * `affiliateLinks` is projected because guides carry buy buttons: they are the
 * highest commercial-intent pages on the site, and previously every one of them
 * sent readers to a review before they could buy anything.
 */
export const buyingGuideBySlugQuery = groq`
  *[_type == "buyingGuide" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    targetAgeRange,
    "reviews": coalesce(
      reviews[]->{
        _id, productName, slug, safetyScore, developmentScore, brand,
        ageRange, mainImage, hasActiveRecall, affiliateLinks
      },
      reviewReferences[]->{
        _id, productName, slug, safetyScore, developmentScore, brand,
        ageRange, mainImage, hasActiveRecall, affiliateLinks
      },
      []
    ),
    body,
    _createdAt
  }
`;

// ─── Safety Articles ────────────────────────────────────────────────────────────

// No query reads `safetyArticle`, because no route serves one. The type predates
// /blog and its content was folded in there, which is why app/sitemap.ts and the
// IndexNow webhook's PATH_BY_TYPE map both skip it.
//
// The homepage's "Latest safety articles" list used to read this type and link
// each item to `/blog/{slug}` — a route that resolves `blogPost` only. One
// `safetyArticle` document survives, so the homepage, the highest-authority page
// on the site, carried a link to a page that renders "Post Not Found" under
// HTTP 200. A soft 404 answers with a success status, so neither a status-code
// link check nor Semrush's broken-link report would flag it.
//
// The schema stays registered so the surviving document is still visible and
// editable in the Studio.

/**
 * Latest posts for the homepage list. Mirrors allBlogPostsQuery's filter so a
 * scheduled post cannot surface on the homepage before it appears on /blog.
 */
export const latestBlogPostsQuery = groq`
  *[_type == "blogPost" && (!defined(publishedAt) || publishedAt <= now())]
    | order(publishedAt desc) [0...5] {
    _id,
    title,
    slug,
    publishedAt,
    excerpt
  }
`;

// ─── Age-Based Guides ───────────────────────────────────────────────────────────

export const allAgeBasedGuidesQuery = groq`
  *[_type == "ageBasedGuide"] | order(ageRange.minMonths asc) {
    _id,
    title,
    slug,
    ageRange
  }
`;

export const ageBasedGuideBySlugQuery = groq`
  *[_type == "ageBasedGuide" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    ageRange,
    body,
    recommendedReviews[]->{_id, productName, slug, safetyScore, developmentScore}
  }
`;

// ─── Recall Alerts ──────────────────────────────────────────────────────────────

// Provenance fields (cpscRecallNumber, hazards, affectedModels, manufacturers,
// sourceAttribution) are selected so the page can show WHERE each fact came from
// rather than presenting CPSC data as SafeNest's own determination.
export const activeRecallAlertsQuery = groq`
  *[_type == "recallAlert" && !isResolved] | order(recallDate desc) [$start...$end] {
    _id,
    affectedProduct,
    recallDate,
    recallReason,
    issuingAuthority,
    recommendedAction,
    officialNoticeUrl,
    affectedReviews[]->{_id, productName, slug},
    publishedAt,
    cpscRecallNumber,
    hazards,
    affectedModels,
    manufacturers,
    sourceAttribution
  }
`;

/** Recalls matching a free-text query, for the on-page search. */
export const searchRecallAlertsQuery = groq`
  *[_type == "recallAlert" && !isResolved && (
      affectedProduct match $q ||
      recallReason match $q ||
      cpscRecallNumber match $q ||
      $q in manufacturers ||
      count(manufacturers[@ match $q]) > 0 ||
      count(hazards[@ match $q]) > 0
    )] | order(recallDate desc) [$start...$end] {
    _id,
    affectedProduct,
    recallDate,
    recallReason,
    issuingAuthority,
    recommendedAction,
    officialNoticeUrl,
    affectedReviews[]->{_id, productName, slug},
    publishedAt,
    cpscRecallNumber,
    hazards,
    affectedModels,
    manufacturers,
    sourceAttribution
  }
`;

export const searchRecallAlertCountQuery = groq`
  count(*[_type == "recallAlert" && !isResolved && (
      affectedProduct match $q ||
      recallReason match $q ||
      cpscRecallNumber match $q ||
      count(manufacturers[@ match $q]) > 0 ||
      count(hazards[@ match $q]) > 0
    )])
`;

export const recallAlertsByReviewQuery = groq`
  *[_type == "recallAlert" && !isResolved && references($reviewId)] | order(publishedAt desc) {
    _id,
    affectedProduct,
    recallDate,
    recallReason,
    issuingAuthority,
    recommendedAction,
    officialNoticeUrl,
    publishedAt
  }
`;

// ─── Categories ─────────────────────────────────────────────────────────────────

export const allCategoriesQuery = groq`
  *[_type == "category"] | order(title asc) {
    _id,
    title,
    slug,
    description
  }
`;

export const categoryBySlugQuery = groq`
  *[_type == "category" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    description
  }
`;

// ─── Blog Posts ─────────────────────────────────────────────────────────────────

// Scheduled posts (publishedAt in the future) are excluded from the listing so
// they stay hidden until their publish date. Posts with no publishedAt are kept
// rather than silently dropped.
export const allBlogPostsQuery = groq`
  *[_type == "blogPost" && (!defined(publishedAt) || publishedAt <= now())]
    | order(publishedAt desc) [$start...$end] {
    _id,
    title,
    slug,
    publishedAt,
    excerpt,
    author,
    seasonal
  }
`;

// Seasonal posts whose annually recurring window is currently open are featured
// at the top of the blog. Filtering happens in app code (see lib/content/seasonal)
// because the window is month/day based and recurs yearly, which GROQ cannot
// express cleanly. Fetches a small pool of seasonal candidates only.
export const seasonalBlogPostsQuery = groq`
  *[_type == "blogPost"
      && defined(seasonal.startMonthDay)
      && defined(seasonal.endMonthDay)
      && (!defined(publishedAt) || publishedAt <= now())]
    | order(publishedAt desc) [0...20] {
    _id,
    title,
    slug,
    publishedAt,
    excerpt,
    seasonal
  }
`;

// `excerpt` is required here: the detail page uses it as the meta description
// and falls back to the body's first paragraph without it. Auto-generated
// roundups share an identical opening paragraph per category, so omitting
// excerpt produced duplicate meta descriptions across posts.
/**
 * `relatedReviews` is projected because the roundup posts are the highest
 * purchase-intent pages on the site and previously carried no buy path at all:
 * every product mention linked to a review page, so a reader had to make an extra
 * hop before they could buy anything. The generator has always written this field;
 * the page simply never read it.
 *
 * Affiliate URLs stay out of the article body deliberately. A link mark inside
 * Portable Text renders through the generic external-link path, which does not
 * carry rel="nofollow sponsored" — required by the Associates agreement. Keeping
 * the commerce in a component means it inherits BuyButton's attributes.
 */
export const blogPostBySlugQuery = groq`
  *[_type == "blogPost" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    publishedAt,
    excerpt,
    body,
    author,
    "relatedReviews": relatedReviews[]->{
      _id, productName, slug, brand, safetyScore, developmentScore,
      ageRange, mainImage, hasActiveRecall, affiliateLinks
    }
  }
`;

// ─── Count Queries (for pagination and programmatic pages) ──────────────────────

export const toyReviewCountByCategoryQuery = groq`
  count(*[_type == "toyReview" && category._ref == $categoryId])
`;

export const toyReviewCountByAgeRangeQuery = groq`
  count(*[_type == "toyReview" && ageRange.minMonths <= $maxMonths && ageRange.maxMonths >= $minMonths])
`;

export const recallAlertCountQuery = groq`
  count(*[_type == "recallAlert" && !isResolved])
`;

// Must mirror allBlogPostsQuery's filter or pagination counts will disagree
// with the number of posts actually rendered.
export const blogPostCountQuery = groq`
  count(*[_type == "blogPost" && (!defined(publishedAt) || publishedAt <= now())])
`;

// ─── Internal Links (Related Content) ───────────────────────────────────────────

/**
 * Related buying guides, queried separately from reviews so that 138 reviews
 * cannot crowd out 12 guides in a single `[0...6]` slice.
 *
 * Two things were wrong with matching guides in the combined query:
 *
 *   1. It tested `ageRange`, which no buyingGuide has — the field on that type
 *      is `targetAgeRange`, populated on all 12. So the age clause could never
 *      match a guide, leaving `category` as the only route in, and only 4 of 12
 *      guides carry a category reference. The 4 that do ended up with 38, 12, 8
 *      and 7 inbound internal links; the other 8 got exactly one each, from the
 *      /guides index. That is measured, not inferred.
 *   2. Ordering by `_createdAt desc` across both types meant reviews won the
 *      slice on volume alone.
 *
 * This matters more than it looks. Guides are the only pages on the site with
 * meaningful organic search visibility, and the ones that rank are the ones that
 * happened to have internal links. `/guides/best-sensory-toys-babies` (38 links)
 * ranks for 18 keywords; `/guides/best-toys-6-12-months` (1 link, same template,
 * same length) ranks for none.
 */
/**
 * Returns every matching guide, unsliced, because ranking them needs to happen
 * in app code. There are only 12 buying guides, so this is cheap.
 *
 * Ordering in GROQ is not enough: sorting by `targetAgeRange.minMonths` and
 * taking the first two handed almost every slot to the three guides that start
 * at 0 months, which just moved the concentration rather than fixing it. Whether
 * a guide belongs next to *this* page depends on how tightly its age range fits
 * and whether its category matches — see pickGuides in InternalLinks.
 */
export const relatedGuidesQuery = groq`
  *[
    _id != $currentDocId &&
    _type == "buyingGuide" &&
    (
      category._ref == $categoryId ||
      (targetAgeRange.minMonths <= $maxMonths && targetAgeRange.maxMonths >= $minMonths)
    )
  ] {
    _id,
    _type,
    title,
    slug,
    "categoryId": category._ref,
    targetAgeRange
  }
`;

/**
 * How many reviews match, so the window below can be rotated without running off
 * the end of the result set.
 */
export const relatedReviewsCountQuery = groq`
  count(*[
    _id != $currentDocId &&
    _type == "toyReview" &&
    (
      category._ref == $categoryId ||
      (ageRange.minMonths <= $maxMonths && ageRange.maxMonths >= $minMonths)
    )
  ])
`;

/**
 * A rotating window over the matching reviews.
 *
 * This used to be `order(_createdAt desc) [0...6]`, which handed the six newest
 * matching reviews to every page that asked. Measured on the built site, four
 * reviews from the most recent import were collecting 124–147 inbound internal
 * links each while the buying guides sat on one. The category/age filter above
 * already establishes relevance, so ordering inside the matched set is arbitrary
 * — and any fixed ordering concentrates. `order(_id)` with a per-page offset is
 * stable per document and spread across the catalog.
 */
export const relatedReviewsQuery = groq`
  *[
    _id != $currentDocId &&
    _type == "toyReview" &&
    (
      category._ref == $categoryId ||
      (ageRange.minMonths <= $maxMonths && ageRange.maxMonths >= $minMonths)
    )
  ] | order(_id) [$reviewOffset...($reviewOffset + 6)] {
    _id,
    _type,
    "title": coalesce(productName, title),
    slug
  }
`;

// Fallback used by InternalLinks when the category/age match yields too few
// results, so a page still offers real internal links.
//
// Ordering by safetyScore made this the single biggest distorter of internal
// link equity on the site: the same 6 top-scoring reviews were linked from
// roughly 147 pages, while the guides that actually rank got one link each.
// Seeding the order from the requesting document's id spreads the fallback
// across the catalog instead of pointing every page at the same six.
// `_id` is a stable per-document value, so a given page's fallback set does not
// churn between builds.
export const fallbackRelatedReviewsQuery = groq`
  *[_type == "toyReview" && _id != $currentDocId]
    | order(_id) [$fallbackOffset...($fallbackOffset + 6)] {
    _id,
    _type,
    "title": coalesce(productName, title),
    slug
  }
`;

export const toyReviewCountQuery = groq`count(*[_type == "toyReview"])`;

// ─── Trust: Testimonials & Expert Endorsements ──────────────────────────────────
// Only approved + consent-verified entries are ever returned. If none exist,
// the homepage simply omits those sections (no fabricated social proof).

export const approvedTestimonialsQuery = groq`
  *[_type == "testimonial" && approved == true && consentVerified == true]
    | order(order asc, _createdAt desc) {
    _id,
    quote,
    authorName,
    authorContext,
    avatar
  }
`;

export const approvedEndorsementsQuery = groq`
  *[_type == "expertEndorsement" && approved == true && consentVerified == true]
    | order(order asc, _createdAt desc) {
    _id,
    name,
    credentials,
    affiliation,
    quote,
    headshot,
    profileUrl
  }
`;
