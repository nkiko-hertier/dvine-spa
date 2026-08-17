import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      // String option: forwards requests starting with /api to the target server
      '/api': {
        target: 'http://5.189.175.8:4444', // Your backend API URL
        changeOrigin: true,             // Needed for virtual hosted sites
        secure: false,                  // Set to true if using HTTPS with a valid certificate
        rewrite: (path) => path.replace(/^\/api/, ''), // Removes '/api' prefix before forwarding
      }
  },
  preview: {
    port: 5173,
    host: true,
  },
 }
});
