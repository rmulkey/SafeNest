/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, within, cleanup } from "@testing-library/react";
import type { ToyReviewSummary } from "@/lib/seo/programmatic-pages";
import type { AwardVariant } from "@/components/reviews/AwardBadge";

// next/image and next/link are not available in the jsdom test environment, so
// replace them with simple DOM-friendly stand-ins. urlForImage is mocked so the
// component never reaches the real Sanity client.
vi.mock("next/image", () => ({
  default: (props: any) => {
    const { fill, ...rest } = props;
    return <img {...rest} />;
  },
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/sanity/client", () => ({
  urlForImage: () => ({
    width: () => ({ height: () => ({ url: () => "https://cdn.sanity.io/test.jpg" }) }),
  }),
}));

// Import after the mocks are registered.
import { ComparisonTable } from "./ComparisonTable";

const AMAZON_TAG = "safeneststore-20";

function makeReview(
  overrides: Partial<ToyReviewSummary> & Pick<ToyReviewSummary, "_id" | "safetyScore">
): ToyReviewSummary {
  return {
    productName: `Toy ${overrides._id}`,
    slug: { current: overrides._id },
    ageRange: { minMonths: 0, maxMonths: 24 },
    category: null,
    developmentScore: 70,
    materials: [],
    hasActiveRecall: false,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe("ComparisonTable", () => {
  it("renders every review (in both the table and the stacked card list)", () => {
    const reviews: ToyReviewSummary[] = [
      makeReview({ _id: "a", productName: "Alpha Blocks", safetyScore: 90 }),
      makeReview({ _id: "b", productName: "Beta Stacker", safetyScore: 70 }),
    ];

    render(<ComparisonTable reviews={reviews} awards={{}} />);

    // The component renders both layouts in the DOM (toggled by CSS), so each
    // product name appears exactly twice — once per layout.
    expect(screen.getAllByText("Alpha Blocks")).toHaveLength(2);
    expect(screen.getAllByText("Beta Stacker")).toHaveLength(2);
  });

  it("sorts reviews by safetyScore descending in the table", () => {
    const reviews: ToyReviewSummary[] = [
      makeReview({ _id: "mid", productName: "Mid Toy", safetyScore: 70 }),
      makeReview({ _id: "high", productName: "High Toy", safetyScore: 95 }),
      makeReview({ _id: "low", productName: "Low Toy", safetyScore: 40 }),
    ];

    const { container } = render(
      <ComparisonTable reviews={reviews} awards={{}} />
    );

    const table = container.querySelector("table") as HTMLTableElement;
    expect(table).toBeTruthy();

    const rows = Array.from(table.querySelectorAll("tbody tr"));
    const orderedNames = rows.map((row) => {
      if (row.textContent?.includes("High Toy")) return "High Toy";
      if (row.textContent?.includes("Mid Toy")) return "Mid Toy";
      return "Low Toy";
    });

    expect(orderedNames).toEqual(["High Toy", "Mid Toy", "Low Toy"]);
  });

  it("renders a BuyButton (amazon link with the affiliate tag) for reviews that have affiliateLinks", () => {
    const reviews: ToyReviewSummary[] = [
      makeReview({
        _id: "withlink",
        productName: "Linked Toy",
        safetyScore: 88,
        affiliateLinks: [
          {
            partnerId: "amazon",
            url: "https://www.amazon.com/s?k=linked-toy",
            tag: AMAZON_TAG,
          },
        ],
      }),
    ];

    const { container } = render(
      <ComparisonTable reviews={reviews} awards={{}} />
    );

    const buyLinks = Array.from(
      container.querySelectorAll('a[href*="amazon.com"]')
    ) as HTMLAnchorElement[];

    // One in the table layout and one in the card layout.
    expect(buyLinks.length).toBe(2);
    for (const link of buyLinks) {
      expect(link.getAttribute("href")).toContain("amazon.com");
      expect(link.getAttribute("href")).toContain(`tag=${AMAZON_TAG}`);
    }
  });

  it("falls back to the affiliate tag when a link has no explicit tag", () => {
    const reviews: ToyReviewSummary[] = [
      makeReview({
        _id: "notag",
        productName: "No Tag Toy",
        safetyScore: 80,
        affiliateLinks: [
          {
            partnerId: "amazon",
            url: "https://www.amazon.com/s?k=no-tag-toy",
            tag: "",
          },
        ],
      }),
    ];

    const { container } = render(
      <ComparisonTable reviews={reviews} awards={{}} />
    );

    const buyLinks = Array.from(
      container.querySelectorAll('a[href*="amazon.com"]')
    ) as HTMLAnchorElement[];

    expect(buyLinks.length).toBeGreaterThan(0);
    for (const link of buyLinks) {
      expect(link.getAttribute("href")).toContain(`tag=${AMAZON_TAG}`);
    }
  });

  it("renders the award badge when an award is supplied for a review", () => {
    const reviews: ToyReviewSummary[] = [
      makeReview({ _id: "winner", productName: "Winner Toy", safetyScore: 92 }),
      makeReview({ _id: "other", productName: "Other Toy", safetyScore: 60 }),
    ];
    const awards: Record<string, AwardVariant> = { winner: "top-pick" };

    render(<ComparisonTable reviews={reviews} awards={awards} />);

    // The award badge label is rendered (in both layouts) for the winning review.
    const badges = screen.getAllByText(/Top Pick/);
    expect(badges.length).toBeGreaterThan(0);
  });

  it('shows a "View review" fallback when a review has no affiliateLinks', () => {
    const reviews: ToyReviewSummary[] = [
      makeReview({
        _id: "noaffiliate",
        productName: "Unlinked Toy",
        safetyScore: 75,
        affiliateLinks: undefined,
      }),
    ];

    const { container } = render(
      <ComparisonTable reviews={reviews} awards={{}} />
    );

    // No amazon BuyButton should be rendered for this review.
    expect(container.querySelectorAll('a[href*="amazon.com"]').length).toBe(0);

    // The table layout uses "View review →" as its fallback CTA.
    const table = container.querySelector("table") as HTMLTableElement;
    expect(within(table).getByText(/View review/)).toBeTruthy();
  });

  it("renders an empty table body when there are no reviews", () => {
    const { container } = render(
      <ComparisonTable reviews={[]} awards={{}} />
    );
    const table = container.querySelector("table") as HTMLTableElement;
    expect(table).toBeTruthy();
    expect(table.querySelectorAll("tbody tr").length).toBe(0);
  });
});
