import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Routes that require authentication.
 * All routes under the (auth) route group require a signed-in user.
 */
const isProtectedRoute = createRouteMatcher(["/(auth)(.*)"]);

/**
 * Public routes that should always be accessible without authentication.
 * Includes public pages, API routes, and static assets.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const isPublicRoute = createRouteMatcher([
  "/(public)(.*)",
  "/api(.*)",
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  // If Clerk keys are not configured, allow all requests through
  // This handles Clerk unavailability gracefully
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    return NextResponse.next();
  }

  // Protect authenticated routes
  if (isProtectedRoute(req)) {
    try {
      await auth.protect();
    } catch {
      // Session expired or unauthenticated — redirect to sign-in
      // Preserve the intended destination URL for post-login redirect
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("redirect_url", req.url);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
