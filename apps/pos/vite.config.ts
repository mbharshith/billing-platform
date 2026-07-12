import { defineConfig } from 'vite';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

/**
 * POS remote — exposes CashierApp + AdminApp to the shell.
 *
 * The shared config MUST match shell/storefront exactly. singleton: true
 * on react/react-dom/react-router-dom means the shell's Provider tree
 * (Auth, Toast, Stores...) is visible inside this remote's components.
 */
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'posApp',
      filename: 'remoteEntry.js',
      exposes: {
        './CashierApp': './src/CashierApp.tsx',
        './AdminApp':   './src/AdminApp.tsx',
      },
      shared: {
        react:              { singleton: true, requiredVersion: '^18' },
        'react-dom':        { singleton: true, requiredVersion: '^18' },
        'react-router-dom': { singleton: true, requiredVersion: '^6' },
      },
    }),
  ],
  server: { port: 5001, open: false, cors: true },
  preview: { port: 5001 },
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
