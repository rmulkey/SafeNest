import { ImageResponse } from "next/og";

/**
 * Dynamically generated default Open Graph image (1200×630).
 * Replaces the previously-referenced /og-default.png which never existed,
 * so social shares (Facebook, X, iMessage, LinkedIn) now render a branded card.
 */
export const runtime = "edge";
export const alt = "SafeNest Toys — Toy safety reviews built by parents";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #F0F7F4 0%, #E2EDE7 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand mark */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "72px",
              height: "72px",
              borderRadius: "9999px",
              background: "#2D6B5A",
              color: "white",
              fontSize: "40px",
            }}
          >
            🛡️
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "40px", fontWeight: 700, color: "#2D6B5A", lineHeight: 1.1 }}>
              SafeNest
            </span>
            <span style={{ fontSize: "18px", fontWeight: 600, letterSpacing: "4px", color: "#8B7355" }}>
              TOYS
            </span>
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", fontSize: "60px", fontWeight: 700, color: "#1f3b33", lineHeight: 1.1, marginBottom: "24px" }}>
          Safer toys, smarter play
        </div>

        {/* Subhead */}
        <div style={{ display: "flex", fontSize: "30px", color: "#4a6357", lineHeight: 1.3, maxWidth: "900px" }}>
          Independent toy safety scores and developmental ratings — built by parents, for parents.
        </div>

        {/* Footer chips */}
        <div style={{ display: "flex", gap: "16px", marginTop: "44px" }}>
          {["50+ expert reviews", "Independent scoring", "Daily recall checks"].map((t) => (
            <div
              key={t}
              style={{
                display: "flex",
                fontSize: "22px",
                color: "#2D6B5A",
                background: "white",
                border: "1px solid #cfe0d8",
                borderRadius: "9999px",
                padding: "10px 22px",
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
