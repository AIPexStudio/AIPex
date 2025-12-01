import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "json-summary", "html"],
    },
    css: {
      modules: {
        classNameStrategy: "non-scoped",
      },
    },
    sequence: {
      concurrent: false,
    },
    deps: {
      // Inline dependencies that have CSS imports
      inline: [/katex/, /streamdown/],
    },
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
      "@": path.resolve(__dirname, "./"),
      "@aipexstudio/aipex-core": path.resolve(
        __dirname,
        "../core/src/index.ts",
      ),
    },
  },
});
