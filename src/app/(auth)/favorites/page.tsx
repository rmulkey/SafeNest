import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";

export const metadata = {
  title: "My Favorites - SafeNest Toys",
  description: "Your saved toy reviews",
};

export default async function FavoritesPage() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect("/sign-in?redirect_url=/favorites");
  }

  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: {
      favorites: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const favorites = user?.favorites ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-8">
        My Favorites
      </h1>

      {favorites.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-4">
            You haven&apos;t saved any reviews yet.
          </p>
          <Link
            href="/"
            className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Browse Reviews
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {favorites.map((favorite) => (
            <li key={favorite.id} className="py-4">
              <div className="flex items-center justify-between">
                <Link
                  href={`/reviews/${favorite.reviewSlug}`}
                  className="text-lg font-medium text-indigo-600 hover:text-indigo-500"
                >
                  {favorite.reviewSlug
                    .split("-")
                    .map(
                      (word) =>
                        word.charAt(0).toUpperCase() + word.slice(1)
                    )
                    .join(" ")}
                </Link>
                <span className="text-sm text-gray-500">
                  Saved{" "}
                  {new Date(favorite.createdAt).toLocaleDateString()}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
