import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

/**
 * Layout for authenticated routes.
 * Wraps children with Clerk's server-side auth check.
 * Redirects unauthenticated users to sign-in.
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if Clerk is configured
  if (
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    !process.env.CLERK_SECRET_KEY
  ) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] p-8">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Authentication Temporarily Unavailable
          </h2>
          <p className="text-muted-foreground">
            We&apos;re experiencing issues with our authentication service.
            Please try again later. You can still browse all public content.
          </p>
        </div>
      </div>
    );
  }

  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <>{children}</>;
}
