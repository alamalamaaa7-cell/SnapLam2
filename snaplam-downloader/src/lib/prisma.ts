import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient across hot-reloads / lambda invocations
// to avoid exhausting MongoDB connections and to keep memory low.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
