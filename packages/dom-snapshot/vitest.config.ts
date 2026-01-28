import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    pool: "threads",
    silent: true,
    environment: "jsdom",
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
