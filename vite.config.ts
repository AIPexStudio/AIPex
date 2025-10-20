import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import path from 'path'
import manifest from './manifest.json'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    crx({ manifest: manifest as any }),
    viteStaticCopy({
      targets: [
        {
          src: 'assets/*',
          dest: 'assets'
        },
        {
          src: 'host-access-config.json',
          dest: '.'
        }
      ]
    })
  ],
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './src'),
      '@': path.resolve(__dirname, './')
    }
  },
  css: {
    postcss: './postcss.config.js', // Use config file instead of inline
    devSourcemap: true // Enable sourcemaps for debugging
  },
  build: {
    rollupOptions: {
      input: {
        sidepanel: path.resolve(__dirname, 'src/sidepanel.html'),
      }
    },
    // Ensure CSS is extracted properly
    cssCodeSplit: false
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
      // Improve HMR reliability
      overlay: true
    },
    // Force watch Tailwind files for better HMR
    watch: {
      ignored: ['!**/node_modules/@tailwindcss/**']
    }
  }
})

