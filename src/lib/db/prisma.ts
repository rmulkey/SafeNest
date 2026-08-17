import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Lazily-instantiated Prisma client.
 *
 * WHY AN ADAPTER
 * Prisma 7 removed the implicit `datasource.url` lookup and the `datasourceUrl`
 * constructor option. A client must now be given a driver adapter. This project
 * had neither: `prisma/schema.prisma` declares `datasource db` with a provider
 * but no `url`, and this file called `new PrismaClient()` with no options, so
 * every query threw:
 *
 *   PrismaClientInitializationError: `PrismaClient` needs to be constructed
 *   with a non-empty, valid `PrismaClientOptions`
 *
 * `prisma generate` still succeeded because `prisma.config.ts` supplies the URL
 * for CLI work, which is why the build never caught it. The failure only
 * appeared at request time, and only on the paths that touch Postgres:
 * newsletter signup returned 500, affiliate click recording failed silently
 * behind a catch, and both dashboard pages rendered an error as HTTP 200.
 *
 * WHY STILL LAZY
 * Next.js evaluates route modules during the production build to collect page
 * data, when no DATABASE_URL need be present. Constructing eagerly would throw
 * and fail the build, so the Proxy defers construction until first real use.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      // Fail loudly and specifically. The previous generic initialization error
      // gave no hint that the cause was configuration.
      throw new Error(
        "DATABASE_URL is not set. Postgres-backed features (newsletter signup, " +
          "affiliate click recording, the admin dashboards) cannot work without it."
      );
    }
    globalForPrisma.prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
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
