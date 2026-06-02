import { Prisma } from "@prisma/client";

/**
 * Determines if a Prisma error is a connection/transient error that can be retried.
 */
function isConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return true;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P1xxx errors are connection-related
    const code = error.code;
    return code.startsWith("P1");
  }
  // Network-level errors
  if (error instanceof Error && error.message.includes("connect")) {
    return true;
  }
  return false;
}

/**
 * Sanitizes a database error so no internal details are exposed to the client.
 * Logs the full error for debugging, returns a safe user-facing message.
 */
export function handleDatabaseError(error: unknown): {
  message: string;
  isRetriable: boolean;
} {
  // Log the full error for debugging (server-side only)
  console.error("[Database Error]", error);

  if (isConnectionError(error)) {
    return {
      message: "The service is temporarily unavailable. Please try again later.",
      isRetriable: true,
    };
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      message: "The operation could not be completed due to invalid data.",
      isRetriable: false,
    };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Constraint violations, unique conflicts, etc.
    return {
      message: "The operation could not be completed.",
      isRetriable: false,
    };
  }

  return {
    message: "An unexpected error occurred. Please try again later.",
    isRetriable: false,
  };
}

/**
 * Wraps a database operation with retry logic.
 * Retries up to 3 times with a 2-second delay between attempts.
 * Only retries on connection errors — validation and constraint errors fail immediately.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: { maxRetries?: number; delayMs?: number } = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const delayMs = options.delayMs ?? 2000;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!isConnectionError(error)) {
        // Non-retriable error — fail immediately
        throw error;
      }

      if (attempt < maxRetries) {
        console.warn(
          `[Database Retry] Attempt ${attempt}/${maxRetries} failed (connection error). Retrying in ${delayMs}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  // All retries exhausted
  throw lastError;
}
