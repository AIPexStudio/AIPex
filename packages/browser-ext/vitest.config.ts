import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    passWithNoTests: true,
    silent: true,
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
    exclude: ["**/node_modules/**", "**/dist/**"],
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
