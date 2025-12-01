import path from "node:path";
import { crx } from "@crxjs/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import manifest from "./manifest.json";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    crx({ manifest: manifest as any }),
    viteStaticCopy({
      targets: [
        {
          src: "assets/*",
          dest: "assets",
        },
        {
          src: "host-access-config.json",
          dest: ".",
        },
      ],
    }),
  ],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
      "@": path.resolve(__dirname, "./"),
      // Point to core source code directly for better dev experience
      "@aipexstudio/aipex-core": path.resolve(
        __dirname,
        "../core/src/index.ts",
      ),
    },
  },
  css: {
    postcss: "./postcss.config.js", // Use config file instead of inline
    devSourcemap: true, // Enable sourcemaps for debugging
  },
  build: {
    rollupOptions: {
      input: {
        sidepanel: path.resolve(__dirname, "src/pages/sidepanel/index.html"),
        options: path.resolve(__dirname, "src/pages/options/index.html"),
      },
    },
    // Ensure CSS is extracted properly
    cssCodeSplit: false,
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
      // Improve HMR reliability
      overlay: true,
    },
    // Force watch Tailwind files for better HMR
    watch: {
      ignored: ["!**/node_modules/@tailwindcss/**"],
    },
  },
});
