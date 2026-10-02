import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  // Set VITE_BASE (e.g. "/aybashim_mobile/") when the app is served from a sub path such as GitHub Pages.
  base: process.env.VITE_BASE || '/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    // Short commit hash in CI, so a report shows exactly which build a device runs.
    __APP_BUILD__: JSON.stringify(process.env.GITHUB_SHA?.slice(0, 7) || 'dev')
  },
  worker: {
    // The pdf.js worker is an ES module; keep it as a module worker.
    format: 'es'
  },
  build: {
    target: ['es2020', 'safari15'],
    // pdf.js and SheetJS are large but lazy-loaded only when a statement is imported.
    chunkSizeWarningLimit: 1500
  },
  plugins: [
    vue(),
    VitePWA({
      // New versions activate on the next load without waiting for a tap, so phones do not
      // keep running an outdated cached build.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: './',
        name: 'aybashim · Kişisel finans',
        short_name: 'aybashim',
        description: 'Banka ekstrelerini cihazında okuyan, gelir ve giderini kategorilere ayıran kişisel finans uygulaması.',
        lang: 'tr',
        dir: 'ltr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f6faf8',
        theme_color: '#f6faf8',
        categories: ['finance', 'productivity'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // The app shell and the pdf.js worker are precached so statements can be read offline.
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,webp,ico}'],
        globIgnores: ['pdfjs/**'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // CMaps and standard fonts are only needed by some PDFs; cache them on first use.
            urlPattern: /\/pdfjs\/(cmaps|standard_fonts)\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pdfjs-assets',
              expiration: { maxEntries: 400 }
            }
          }
        ]
      }
    })
  ]
});
