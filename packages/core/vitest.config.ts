import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    pool: "threads",
    reporters: ["default", "junit", "github-actions"],
    silent: true,
    outputFile: {
      junit: "junit.xml",
    },
    coverage: {
      enabled: true,
      provider: "v8",
      reportsDirectory: "./coverage",
      include: ["src/**/*"],
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
  },
});
