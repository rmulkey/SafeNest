import { ImageResponse } from "next/og";
import { formatAgeParamLabel } from "@/lib/seo/programmatic-pages";

/**
 * Per-age-group Open Graph / Pinterest image (1200×630). Each "best toys for
 * [age]" page gets a tailored, branded card so pins and social shares read
 * clearly (e.g. "Best Toys for 1–2 years") instead of a generic site card.
 */
export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "SafeNest Toys — best toys by age";

export default async function BestToysAgeOgImage({
  params,
}: {
  params: Promise<{ age: string }>;
}) {
  const { age } = await params;
  let label = "Every Age";
  try {
    label = formatAgeParamLabel(age);
  } catch {
    // fall back to generic label
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "linear-gradient(135deg, #F0F7F4 0%, #E2EDE7 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand row */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "60px",
              height: "60px",
              borderRadius: "9999px",
              background: "#2D6B5A",
              color: "white",
              fontSize: "32px",
            }}
          >
            🛡️
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "32px", fontWeight: 700, color: "#2D6B5A", lineHeight: 1.1 }}>
              SafeNest
            </span>
            <span style={{ fontSize: "15px", fontWeight: 600, letterSpacing: "4px", color: "#8B7355" }}>
              TOYS
            </span>
          </div>
        </div>

        {/* Title block */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ display: "flex", fontSize: "30px", color: "#4a6357", fontWeight: 600 }}>
            Parent-researched picks for
          </span>
          <div
            style={{
              display: "flex",
              fontSize: "82px",
              fontWeight: 800,
              color: "#1f3b33",
              lineHeight: 1.05,
              marginTop: "10px",
            }}
          >
            Best Toys for {label}
          </div>
        </div>

        {/* Footer trust line */}
        <div style={{ display: "flex", fontSize: "26px", color: "#2D6B5A", fontWeight: 600 }}>
          Independently safety-scored · Recall-checked · Built by parents
        </div>
      </div>
    ),
    { ...size }
  );
}
