import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { withSoftDeleteFilter } from "./soft-delete";

/**
 * Creates a PrismaClient with Neon serverless adapter + soft-delete filtering.
 * Prisma 7 requires a driver adapter — PrismaClient no longer auto-reads DATABASE_URL.
 */
function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const adapter = new PrismaNeon({ connectionString });
  const baseClient = new PrismaClient({ adapter });

  return withSoftDeleteFilter(baseClient);
}

/** Singleton instance — with soft-delete read filtering baked in */
export const prisma = createPrismaClient();
