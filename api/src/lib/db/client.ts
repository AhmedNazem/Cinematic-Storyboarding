import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

/**
 * Creates a PrismaClient instance configured with the Neon serverless adapter.
 * Prisma 7 requires a driver adapter — PrismaClient no longer auto-reads DATABASE_URL.
 */
export function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

/** Singleton instance for the application */
export const prisma = createPrismaClient();
