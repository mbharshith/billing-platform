import { defineConfig } from 'vite';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

/**
 * Shell (host) — consumes pos + storefront as federated remotes at runtime.
 *
 * Alias contract:
 *   @billing/shared, @billing/ui  → workspace packages (compiled by pnpm)
 *   @/*                            → src/ inside this app
 *
 * The shared block must be identical across every app so React, Router,
 * Dexie, and every shared Context resolve to a single instance. Without
 * `singleton: true` on react the useAuth() call inside a remote returns
 * undefined (see MICROFRONTEND_MIGRATION.md § Known Risks).
 */
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'shell',
      remotes: {
        posApp:        'http://localhost:5001/assets/remoteEntry.js',
        storefrontApp: 'http://localhost:5002/assets/remoteEntry.js',
      },
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
      '@':               path.resolve(__dirname, 'src'),
      '@billing/shared': path.resolve(__dirname, '../../packages/@billing/shared/src'),
      '@billing/ui':     path.resolve(__dirname, '../../packages/@billing/ui/src'),
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
