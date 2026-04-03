import { defineConfig } from "vitest/config";

/**
 * Integration tests — requires a migrated Neon database.
 * Run: npm run test:integration
 * Prereq: DATABASE_URL set + `npx prisma db push` applied.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/__tests__/integration/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    reporters: ["verbose"],
  },
});
