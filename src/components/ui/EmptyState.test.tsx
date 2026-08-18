import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EmptyState } from "./EmptyState";

/**
 * Like RecallFlag, this renders nowhere in production right now — every listing
 * has content. The nine hand-rolled versions it replaced were therefore invisible
 * too, which is how their punctuation ended up disagreeing three ways and how
 * three of them shipped with no way for the reader to continue.
 */
describe("EmptyState", () => {
  it("renders the title as a heading, not a bare paragraph", () => {
    const html = renderToStaticMarkup(
      <EmptyState title="No reviews published yet" body="Body copy." />
    );
    // Two of the versions this replaced were unstyled <p> tags with no heading,
    // so the page had a gap in its heading outline where a section should be.
    expect(html).toMatch(/<h2[^>]*>No reviews published yet<\/h2>/);
  });

  it("renders an action when given one", () => {
    const html = renderToStaticMarkup(
      <EmptyState
        title="T"
        body="B"
        action={{ href: "/reviews", label: "Browse the reviews" }}
      />
    );
    expect(html).toContain('href="/reviews"');
    expect(html).toContain("Browse the reviews");
  });

  it("hides the action's arrow from assistive tech", () => {
    const html = renderToStaticMarkup(
      <EmptyState title="T" body="B" action={{ href: "/x", label: "Go" }} />
    );
    expect(html).toMatch(/aria-hidden="true"/);
  });

  it("renders no link at all when no action is given", () => {
    const html = renderToStaticMarkup(<EmptyState title="T" body="B" />);
    expect(html).not.toContain("<a ");
  });

  it("uses no exclamation marks", () => {
    // "Check back soon!" appeared on three pages. An empty shelf is not
    // exciting news, and nothing else on the site shouts.
    const html = renderToStaticMarkup(
      <EmptyState title="Nothing posted yet" body="We write these in bursts." />
    );
    expect(html).not.toContain("!");
  });
});
