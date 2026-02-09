import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 30000,
    pool: "threads",
    sequence: {
      concurrent: false,
    },
    silent: true,
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      // Puppeteer tests require Chrome browser installation - run separately with: vitest run --config vitest.puppeteer.config.ts
      "**/*.puppeteer.test.ts",
    ],
  },
});
