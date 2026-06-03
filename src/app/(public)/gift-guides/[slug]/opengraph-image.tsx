import { ImageResponse } from "next/og";
import { getGiftGuideBySlug } from "@/lib/seo/gift-guides";

/**
 * Per-guide Open Graph / Pinterest image (1200×630). Generated dynamically so
 * each gift guide gets a branded, occasion-specific card when shared or pinned,
 * instead of the generic site card.
 */
export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "SafeNest Toys gift guide";

export default async function GiftGuideOgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getGiftGuideBySlug(slug);
  const title = guide?.title ?? "Safe Toy Gift Guide";
  const emoji = guide?.emoji ?? "🎁";

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
          <span style={{ fontSize: "120px", lineHeight: 1 }}>{emoji}</span>
          <div
            style={{
              display: "flex",
              fontSize: "68px",
              fontWeight: 800,
              color: "#1f3b33",
              lineHeight: 1.05,
              marginTop: "16px",
              maxWidth: "1000px",
            }}
          >
            {title}
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
