import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    reporters: ["default", "junit", "github-actions"],
    silent: true,
    outputFile: {
      junit: "junit.xml",
    },
    coverage: {
      enabled: true,
      reportsDirectory: "./coverage",
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/**/__tests__/**"],
      reportOnFailure: true,
      reporter: [
        ["text", { file: "full-text-summary.txt" }],
        "html",
        "json",
        "lcov",
        "cobertura",
        ["json-summary", { outputFile: "coverage-summary.json" }],
      ],
    },
    css: {
      modules: {
        classNameStrategy: "non-scoped",
      },
    },
    sequence: {
      concurrent: false,
    },
    server: {
      deps: {
        inline: [/katex/, /streamdown/],
      },
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
