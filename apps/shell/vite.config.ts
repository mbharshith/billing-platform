import { defineConfig } from 'vite';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

/**
 * Shell (host).
 *
 * Design note (2026-07-12): we WERE using federation for pos + storefront,
 * but React Context objects are per-bundle instances - two copies of
 * @billing/shared/store/AuthContext (one bundled into shell, one into the
 * pos remote) meant Providers in the shell couldn't feed hooks in the
 * remote. Root cause: the vite-federation `shared` config only shares
 * npm-published packages by name; it can't share workspace source aliased
 * via tsconfig paths.
 *
 * Fix: pos is now imported DIRECTLY via a source alias (posApp -> apps/pos/src).
 * Both apps still live in their own folders and can be split into real
 * remotes later if independent deployment ever becomes a requirement.
 * Storefront can remain a candidate for federation because it's public and
 * never touches admin auth state - but we bundle it inline too until proven
 * otherwise.
 */
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'shell',
      // No remotes - both sub-apps imported directly (see aliases below).
      remotes: {},
      shared: {
        react:              { singleton: true, requiredVersion: '^18' },
        'react-dom':        { singleton: true, requiredVersion: '^18' },
        'react-router-dom': { singleton: true, requiredVersion: '^6' },
      },
    }),
  ],
  server: { port: 5000, open: false },
  resolve: {
    alias: {
      '@':                path.resolve(__dirname, 'src'),
      '@billing/shared':  path.resolve(__dirname, '../../packages/@billing/shared/src'),
      '@billing/ui':      path.resolve(__dirname, '../../packages/@billing/ui/src'),
      // Direct-import sub-apps (was federation; see rationale above).
      'posApp':           path.resolve(__dirname, '../pos/src'),
      'storefrontApp':    path.resolve(__dirname, '../storefront/src'),
    },
  },
  build: {
    target: 'esnext',
    sourcemap: false,
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 200,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
