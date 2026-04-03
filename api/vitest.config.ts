import { defineConfig } from "vitest/config";

/** Unit + schema tests — no DB required */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: [
      "node_modules/**",
      "src/__tests__/integration/**",
    ],
  },
});
