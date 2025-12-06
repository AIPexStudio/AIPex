import path from "node:path";
import { crx, type ManifestV3Export } from "@crxjs/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import manifest from "./manifest.json";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    crx({ manifest: manifest as unknown as ManifestV3Export }),
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
    alias: [
      { find: "~", replacement: path.resolve(__dirname, "./src") },
      { find: "@", replacement: path.resolve(__dirname, "./") },
      // Point to workspace packages source code directly for better dev experience
      {
        find: "@aipexstudio/aipex-core",
        replacement: path.resolve(__dirname, "../core/src/index.ts"),
      },
      {
        find: /^@aipexstudio\/aipex-react\/(.*)$/,
        replacement: path.resolve(__dirname, "../aipex-react/src/$1"),
      },
      {
        find: "@aipexstudio/aipex-react",
        replacement: path.resolve(__dirname, "../aipex-react/src/index.ts"),
      },
      {
        find: /^@aipexstudio\/browser-runtime\/(.*)$/,
        replacement: path.resolve(__dirname, "../browser-runtime/src/$1"),
      },
      {
        find: "@aipexstudio/browser-runtime",
        replacement: path.resolve(__dirname, "../browser-runtime/src/index.ts"),
      },
    ],
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
