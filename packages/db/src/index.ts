import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __founderosPrisma: PrismaClient | undefined;
}

/**
 * Single shared Prisma client. Reused across hot reloads in dev so we don't
 * exhaust Postgres connections; a fresh instance per process in production.
 */
export const prisma = globalThis.__founderosPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__founderosPrisma = prisma;
}

export * from "@prisma/client";
