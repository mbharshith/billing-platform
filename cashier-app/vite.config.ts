import { defineConfig } from 'vite';
import path from 'node:path';
import react from '@vitejs/plugin-react';

/**
 * Path aliases mirror tsconfig.json's `paths` so both toolchains see the
 * same import world. To add a new alias: update BOTH files.
 */
export default defineConfig({
  plugins: [react()],
  server: { port: 4173, open: false },
  resolve: {
    alias: {
      '@shell':  path.resolve(__dirname, 'src/shell'),
      '@apps':   path.resolve(__dirname, 'src/apps'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@styles': path.resolve(__dirname, 'src/styles'),
    },
  },
  build: {
    // Target modern browsers only — eliminates legacy-compat polyfills and
    // lets esbuild output smaller, cleaner code (no IE transform overhead).
    target: ['es2020', 'chrome89', 'firefox89', 'safari14'],

    sourcemap: false,

    // Separate CSS per chunk so each sub-app only loads its own styles.
    cssCodeSplit: true,

    // Inline tiny assets (<4 KB) as base64 to save round-trips.
    assetsInlineLimit: 4096,

    // Warn earlier (default 500 KB) — keeps individual chunks honest.
    chunkSizeWarningLimit: 175,

    rollupOptions: {
      output: {
        // ── Stable vendor chunk names ────────────────────────────────────
        // Splitting vendors from app code means browsers can cache React and
        // Dexie across deploys — only changed app chunks invalidate.
        manualChunks: {
          'vendor-react':  ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
          'vendor-dexie':  ['dexie', 'dexie-react-hooks'],
        },
        // Content-hash filenames → immutable cache headers safe to set on CDN.
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        // Drop dead code more aggressively.
        compact: true,
      },
    },
  },
});
