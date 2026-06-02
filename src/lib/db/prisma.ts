import { PrismaClient } from "@prisma/client";

/**
 * Lazily-instantiated Prisma client.
 *
 * We avoid `new PrismaClient()` at module load because Next.js evaluates route
 * modules during the production build (to collect page data) when no valid
 * DATABASE_URL may be present. Instantiating eagerly would throw a
 * PrismaClientInitializationError and fail the build. The Proxy defers
 * construction until the client is actually used at request time.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }
  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    // Bind functions to the real client so `this` is correct.
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export { withRetry, handleDatabaseError } from "./utils";
