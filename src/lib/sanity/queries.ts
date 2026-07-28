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
    mainImage
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

export const buyingGuideBySlugQuery = groq`
  *[_type == "buyingGuide" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    targetAgeRange,
    reviews[]->{_id, productName, slug, safetyScore, developmentScore},
    body,
    _createdAt
  }
`;

// ─── Safety Articles ────────────────────────────────────────────────────────────

export const latestSafetyArticlesQuery = groq`
  *[_type == "safetyArticle"] | order(publishedAt desc) [0...5] {
    _id,
    title,
    slug,
    publishedAt,
    excerpt
  }
`;

export const safetyArticleBySlugQuery = groq`
  *[_type == "safetyArticle" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    publishedAt,
    body
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

export const activeRecallAlertsQuery = groq`
  *[_type == "recallAlert" && !isResolved] | order(publishedAt desc) [$start...$end] {
    _id,
    affectedProduct,
    recallDate,
    recallReason,
    issuingAuthority,
    recommendedAction,
    officialNoticeUrl,
    affectedReviews[]->{_id, productName, slug},
    publishedAt
  }
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
    author
  }
`;

export const blogPostBySlugQuery = groq`
  *[_type == "blogPost" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    publishedAt,
    body,
    author
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

export const relatedContentQuery = groq`
  *[
    _id != $currentDocId &&
    _type in ["toyReview", "buyingGuide", "ageBasedGuide"] &&
    (
      category._ref == $categoryId ||
      (ageRange.minMonths <= $maxMonths && ageRange.maxMonths >= $minMonths)
    )
  ] | order(_createdAt desc) [0...6] {
    _id,
    _type,
    "title": coalesce(productName, title),
    slug
  }
`;

// Fallback used by InternalLinks when the category/age match yields too few
// results. Returns the highest-scoring reviews (excluding the current doc) so
// every review/guide page still surfaces useful internal links for crawlers
// and readers. Never fabricates content — only re-surfaces real reviews.
export const fallbackRelatedReviewsQuery = groq`
  *[_type == "toyReview" && _id != $currentDocId] | order(safetyScore desc) [0...6] {
    _id,
    _type,
    "title": coalesce(productName, title),
    slug
  }
`;

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
