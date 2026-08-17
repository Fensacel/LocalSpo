import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Point @/ to the Desktop src/ so all components, stores, pages are shared
      '@': path.resolve(__dirname, '../src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 5174,
    fs: {
      // Allow serving files from Desktop src/ (one level up)
      allow: ['..'],
    },
  },
  define: {
    // Prevent Electron-specific process.env checks from breaking
    'process.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
    'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY),
  },
});
