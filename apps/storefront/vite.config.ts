import { defineConfig } from 'vite';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

/**
 * Storefront remote — public customer-facing shop.
 * Exposes StorefrontApp to the shell. CSP is looser here (no auth), so
 * this app runs on its own origin in production (see MICROFRONTEND_MIGRATION.md).
 */
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'storefrontApp',
      filename: 'remoteEntry.js',
      exposes: {
        './StorefrontApp': './src/StorefrontApp.tsx',
      },
      shared: {
        react:              { singleton: true, requiredVersion: '^18' },
        'react-dom':        { singleton: true, requiredVersion: '^18' },
        'react-router-dom': { singleton: true, requiredVersion: '^6' },
      },
    }),
  ],
  server: { port: 5002, open: false, cors: true },
  preview: { port: 5002 },
  resolve: {
    alias: {
      '@':               path.resolve(__dirname, 'src'),
      '@billing/shared': path.resolve(__dirname, '../../packages/@billing/shared/src'),
      '@billing/ui':     path.resolve(__dirname, '../../packages/@billing/ui/src'),
    },
  },
  build: {
    target: 'esnext',
    minify: true,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
