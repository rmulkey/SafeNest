import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { ExitIntentModal } from "@/components/marketing/ExitIntentModal";
import { generateOpenGraphMeta } from "@/components/seo/OpenGraphMeta";
import { SITE_URL } from "@/lib/seo/site-config";
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
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  const shell = (
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
      </body>
    </html>
  );

  // Only wrap in ClerkProvider when a publishable key is configured. Without a
  // key, Clerk throws at render in production; gating it keeps the public site
  // fully functional and lets auth activate automatically once keys are added.
  if (clerkEnabled) {
    return <ClerkProvider>{shell}</ClerkProvider>;
  }

  return shell;
}
