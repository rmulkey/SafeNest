import React from "react";

/**
 * Displays the affiliate transparency disclosure.
 * Must be positioned as a sibling within 50px of affiliate links.
 */
export function AffiliateDisclosure() {
  return (
    <p className="text-sm text-muted-foreground mt-2 mb-2">
      SafeNest Toys earns a commission from qualifying purchases made through
      affiliate links on this page
    </p>
  );
}
