import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 30000,
    pool: "threads",
    sequence: {
      concurrent: false,
    },
    silent: false,
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
