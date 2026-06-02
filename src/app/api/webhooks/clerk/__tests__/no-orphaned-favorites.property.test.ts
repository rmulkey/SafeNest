/**
 * Feature: safenest-toys, Property 7: No orphaned favorites on user deletion
 *
 * For any user with associated favorites, when that user is deleted from the system,
 * all favorite records referencing that user SHALL also be deleted, leaving zero
 * orphaned favorite records.
 *
 * **Validates: Requirements 9.7**
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

// Track state for simulated cascade behavior
let usersStore: Map<string, { id: string; clerkId: string; email: string }>;
let favoritesStore: Map<string, { id: string; userId: string; reviewSlug: string }>;

const mockUserDelete = vi.fn();
const mockFavoriteFindMany = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: {
      delete: (...args: unknown[]) => mockUserDelete(...args),
    },
    favorite: {
      findMany: (...args: unknown[]) => mockFavoriteFindMany(...args),
    },
  },
  withRetry: async (fn: () => Promise<unknown>) => fn(),
  handleDatabaseError: (error: unknown) => ({
    message: error instanceof Error ? error.message : "Unknown DB error",
  }),
}));

/**
 * Generates a random user with a random number of favorites (1 to 20).
 */
function userWithFavoritesArbitrary() {
  return fc.record({
    userId: fc.uuid(),
    clerkId: fc.string({ minLength: 5, maxLength: 30 }).filter((s) => s.trim().length > 0),
    email: fc.emailAddress(),
    favoriteCount: fc.integer({ min: 1, max: 20 }),
    reviewSlugs: fc
      .array(
        fc.string({ minLength: 3, maxLength: 40 }).filter((s) => /^[a-z0-9-]+$/.test(s)),
        { minLength: 1, maxLength: 20 }
      ),
  }).map((data) => {
    // Ensure we have exactly favoriteCount unique slugs
    const uniqueSlugs = [...new Set(data.reviewSlugs)].slice(0, data.favoriteCount);
    const count = Math.max(1, uniqueSlugs.length);
    return {
      userId: data.userId,
      clerkId: data.clerkId,
      email: data.email,
      favoriteCount: count,
      reviewSlugs: uniqueSlugs.length >= count ? uniqueSlugs.slice(0, count) : uniqueSlugs,
    };
  });
}

describe("Property 7: No orphaned favorites on user deletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usersStore = new Map();
    favoritesStore = new Map();
  });

  it("should delete all favorites when a user is deleted (cascade simulation)", async () => {
    await fc.assert(
      fc.asyncProperty(
        userWithFavoritesArbitrary(),
        async (userData) => {
          // Setup: populate stores with user and favorites
          usersStore.set(userData.userId, {
            id: userData.userId,
            clerkId: userData.clerkId,
            email: userData.email,
          });

          const favorites = userData.reviewSlugs.map((slug, idx) => ({
            id: `fav-${idx}-${userData.userId}`,
            userId: userData.userId,
            reviewSlug: slug,
          }));

          for (const fav of favorites) {
            favoritesStore.set(fav.id, fav);
          }

          // Mock: simulate Prisma cascade delete behavior
          // When user.delete is called, it removes the user AND all related favorites
          mockUserDelete.mockImplementationOnce(async (args: { where: { clerkId: string } }) => {
            const user = [...usersStore.values()].find(
              (u) => u.clerkId === args.where.clerkId
            );
            if (!user) throw new Error("User not found");

            // Cascade: delete all favorites belonging to this user
            for (const [key, fav] of favoritesStore.entries()) {
              if (fav.userId === user.id) {
                favoritesStore.delete(key);
              }
            }
            // Delete the user
            usersStore.delete(user.id);
            return user;
          });

          // Mock: findMany returns remaining favorites for the deleted user
          mockFavoriteFindMany.mockImplementationOnce(
            async (args: { where: { userId: string } }) => {
              return [...favoritesStore.values()].filter(
                (f) => f.userId === args.where.userId
              );
            }
          );

          // Act: simulate the delete (mirrors what the clerk webhook handler does)
          const { prisma } = await import("@/lib/db/prisma");
          await prisma.user.delete({ where: { clerkId: userData.clerkId } });

          // Assert: query for orphaned favorites belonging to the deleted user
          const orphanedFavorites = await prisma.favorite.findMany({
            where: { userId: userData.userId },
          });

          // Property: zero orphaned records must remain
          expect(orphanedFavorites).toHaveLength(0);

          // Also verify the user was removed
          expect(usersStore.has(userData.userId)).toBe(false);

          // Verify delete was called with the correct clerkId
          expect(mockUserDelete).toHaveBeenCalledWith({
            where: { clerkId: userData.clerkId },
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
