import { auth } from "@clerk/nextjs/server";
import { prisma, withRetry, handleDatabaseError } from "@/lib/db/prisma";

export async function GET() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const favorites = await withRetry(async () => {
      const user = await prisma.user.findUnique({
        where: { clerkId },
        include: {
          favorites: {
            orderBy: { createdAt: "desc" },
          },
        },
      });

      return user?.favorites ?? [];
    });

    return Response.json({ favorites });
  } catch (error) {
    const { message } = handleDatabaseError(error);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { reviewSlug } = body;

  if (!reviewSlug || typeof reviewSlug !== "string") {
    return Response.json(
      { error: "reviewSlug is required" },
      { status: 400 }
    );
  }

  try {
    const favorite = await withRetry(async () => {
      const user = await prisma.user.findUnique({
        where: { clerkId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      return prisma.favorite.create({
        data: {
          userId: user.id,
          reviewSlug,
        },
      });
    });

    return Response.json({ favorite }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "User not found"
    ) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    const { message } = handleDatabaseError(error);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { reviewSlug } = body;

  if (!reviewSlug || typeof reviewSlug !== "string") {
    return Response.json(
      { error: "reviewSlug is required" },
      { status: 400 }
    );
  }

  try {
    await withRetry(async () => {
      const user = await prisma.user.findUnique({
        where: { clerkId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      await prisma.favorite.delete({
        where: {
          userId_reviewSlug: {
            userId: user.id,
            reviewSlug,
          },
        },
      });
    });

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "User not found"
    ) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    const { message } = handleDatabaseError(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
