import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { ExitIntentModal } from "@/components/marketing/ExitIntentModal";
import { generateOpenGraphMeta } from "@/components/seo/OpenGraphMeta";
import { SITE_URL } from "@/lib/seo/site-config";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
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
  // Google Search Console HTML-tag verification. Set GOOGLE_SITE_VERIFICATION
  // to the token from the "HTML tag" method and redeploy; Next.js renders it as
  // <meta name="google-site-verification" content="..."/>. Optional — DNS TXT
  // verification via Vercel works without this.
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
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
