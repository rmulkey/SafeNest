import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { ExitIntentModal } from "@/components/marketing/ExitIntentModal";
import { generateOpenGraphMeta } from "@/components/seo/OpenGraphMeta";
import { SITE_URL } from "@/lib/seo/site-config";
import { buildVerification } from "@/lib/seo/verification";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AmazonGlyphSprite } from "@/components/affiliate/BuyButton";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SafeNest Toys — Safer Toys, Smarter Play, Built by Parents",
  description:
    "Independent toy safety reviews, transparent safety scores, and developmental play guides — built by Rodrigo and Vanessa, homeschooling parents of three in Kennesaw, Georgia, to help families choose safer, smarter toys with confidence.",
  metadataBase: new URL(SITE_URL),
  // Search-engine webmaster verification, one env var per engine. Each is
  // optional and only emitted when set, so an unconfigured engine adds no tag.
  //
  //   GOOGLE_SITE_VERIFICATION -> <meta name="google-site-verification">
  //   BING_SITE_VERIFICATION   -> <meta name="msvalidate.01">
  //   YANDEX_SITE_VERIFICATION -> <meta name="yandex-verification">
  //
  // The HTML-tag method is only one option: Google is already verified here by
  // DNS/Vercel, and Bing can import an existing Google Search Console property
  // instead of verifying separately. These exist for the cases where the tag is
  // the easiest route.
  ...buildVerification(),
  ...generateOpenGraphMeta({
    title: "SafeNest Toys — Safer Toys, Smarter Play, Built by Parents",
    description:
      "Independent toy safety reviews and developmental play guides, built by parents to help families choose safer, smarter toys with confidence.",
    url: SITE_URL,
    type: "website",
  }),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Defines the Amazon glyph once so every BuyButton can <use> it instead
            of inlining 1,220 bytes of path data per button. Must precede the
            content that references it. See AmazonGlyphSprite for the measurements. */}
        <AmazonGlyphSprite />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2"
        >
          Skip to main content
        </a>
        <Suspense>
          <AnalyticsProvider>
            <Header />
            <main id="main-content" tabIndex={-1} className="flex-1">
              {children}
            </main>
            <Footer />
            <ExitIntentModal />
          </AnalyticsProvider>
        </Suspense>
        {/* Vercel Web Analytics (cookieless, privacy-friendly) + Speed Insights.
            Render outside Suspense so they always mount on every route. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
