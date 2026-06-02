"use client";

import React from "react";

export interface AffiliateLinkProps {
  productId: string;
  partnerId: string;
  destinationUrl: string;
  affiliateTag: string;
  children: React.ReactNode;
  sourcePageUrl: string;
}

/**
 * Renders an affiliate link that routes clicks through the tracking API before redirect.
 * Applies rel="nofollow sponsored noopener" and target="_blank" per FTC/SEO requirements.
 */
export function AffiliateLink({
  productId,
  partnerId,
  destinationUrl,
  affiliateTag,
  children,
  sourcePageUrl,
}: AffiliateLinkProps) {
  const trackingUrl = `/api/affiliate/click?productId=${encodeURIComponent(productId)}&partnerId=${encodeURIComponent(partnerId)}&destinationUrl=${encodeURIComponent(destinationUrl)}&affiliateTag=${encodeURIComponent(affiliateTag)}&sourcePageUrl=${encodeURIComponent(sourcePageUrl)}`;

  return (
    <a
      href={trackingUrl}
      rel="nofollow sponsored noopener"
      target="_blank"
      className="inline-flex items-center text-primary underline hover:text-primary/80 transition-colors"
    >
      {children}
    </a>
  );
}
