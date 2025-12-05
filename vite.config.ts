import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load environment variables from .env and Vercel
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // ⚡ Ensures correct asset paths on Vercel
    base: '/',

    server: {
      port: 3000,
      host: '0.0.0.0',
    },

    plugins: [react()],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    // ❌ Remove 'define' for process.env
    // We will use import.meta.env in your React code
  };
});
