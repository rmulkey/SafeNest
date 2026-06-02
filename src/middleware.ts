import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const clerkEnabled =
  Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
  Boolean(process.env.CLERK_SECRET_KEY);

/**
 * Routes that require authentication.
 * All routes under the (auth) route group require a signed-in user.
 */
const isProtectedRoute = createRouteMatcher(["/(auth)(.*)"]);

/**
 * Clerk-enabled middleware: protects (auth) routes, lets everything else through.
 */
const authMiddleware = clerkMiddleware(async (auth, req: NextRequest) => {
  if (isProtectedRoute(req)) {
    try {
      await auth.protect();
    } catch {
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("redirect_url", req.url);
      return NextResponse.redirect(signInUrl);
    }
  }
  return NextResponse.next();
});

/**
 * Pass-through middleware used when Clerk keys are not configured. This keeps
 * the public site fully functional in environments without auth credentials.
 * `clerkMiddleware()` requires a publishable key at initialization, so we must
 * avoid invoking it at all when keys are absent — not just guard inside it.
 */
function passthroughMiddleware() {
  return NextResponse.next();
}

export default clerkEnabled ? authMiddleware : passthroughMiddleware;

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
