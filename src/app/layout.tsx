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
  title: "SafeNest Toys - Toy Safety Intelligence for Parents",
  description:
    "Trusted toy safety reviews, developmental play guides, and transparent safety scores for parents of babies and toddlers.",
  metadataBase: new URL(SITE_URL),
  ...generateOpenGraphMeta({
    title: "SafeNest Toys - Toy Safety Intelligence for Parents",
    description:
      "Trusted toy safety reviews, developmental play guides, and transparent safety scores for parents of babies and toddlers.",
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
        <Suspense>
          <AnalyticsProvider>
            <Header />
            <main className="flex-1">{children}</main>
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
