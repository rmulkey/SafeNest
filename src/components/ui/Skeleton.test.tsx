import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  it("renders a pulsing, muted, rounded block", () => {
    const html = renderToStaticMarkup(<Skeleton />);
    expect(html).toContain("animate-pulse");
    expect(html).toContain("bg-muted");
    expect(html).toContain("rounded-xl");
  });

  it("is hidden from assistive tech (decorative placeholder)", () => {
    const html = renderToStaticMarkup(<Skeleton />);
    expect(html).toContain('aria-hidden="true"');
  });

  it("merges custom classNames alongside the defaults", () => {
    const html = renderToStaticMarkup(<Skeleton className="h-9 w-1/2" />);
    expect(html).toContain("h-9");
    expect(html).toContain("w-1/2");
    expect(html).toContain("animate-pulse");
  });

  it("forwards arbitrary props to the underlying div", () => {
    const html = renderToStaticMarkup(<Skeleton data-testid="sk" />);
    expect(html).toContain('data-testid="sk"');
  });
});
