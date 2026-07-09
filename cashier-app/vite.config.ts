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
    // Per-sub-app chunks are already handled by React.lazy(); Vite splits
    // dynamically-imported modules automatically. No manual chunking needed.
    sourcemap: false,
  },
});
