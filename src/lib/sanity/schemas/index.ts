import { type SchemaTypeDefinition } from "sanity";

import { affiliateLink } from "./affiliateLink";
import { ageBasedGuide } from "./ageBasedGuide";
import { blockContent } from "./blockContent";
import { blogPost } from "./blogPost";
import { buyingGuide } from "./buyingGuide";
import { category } from "./category";
import { expertEndorsement } from "./expertEndorsement";
import { recallAlert } from "./recallAlert";
import { safetyArticle } from "./safetyArticle";
import { testimonial } from "./testimonial";
import { toyReview } from "./toyReview";
import { queuedProduct } from "./queuedProduct";

export const schemaTypes: SchemaTypeDefinition[] = [
  // Object types (must be registered before documents that reference them)
  blockContent,
  affiliateLink,
  // Document types
  category,
  toyReview,
  buyingGuide,
  safetyArticle,
  ageBasedGuide,
  recallAlert,
  blogPost,
  testimonial,
  expertEndorsement,
  queuedProduct,
];

export {
  affiliateLink,
  ageBasedGuide,
  blockContent,
  blogPost,
  buyingGuide,
  category,
  expertEndorsement,
  recallAlert,
  safetyArticle,
  testimonial,
  toyReview,
  queuedProduct,
};
