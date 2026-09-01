
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import base44 from '@base44/vite-plugin'
import path from 'path'

// All `/api/*` calls are proxied straight to the D'Vine Spa API. The `/api`
// prefix is stripped, so `/api/categories` -> `http://5.189.175.8:4000/categories`.
// Same rule lives in vercel.json for production.
const apiProxy = {
  '/api': {
    target: 'http://5.189.175.8:4000',
    changeOrigin: true,
    secure: false,
    rewrite: (p) => p.replace(/^\/api/, ''),
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    base44({
      // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
      // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      analyticsTracker: true,
      visualEditAgent: true
    }),
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: apiProxy,
    watch: {
      ignored: ['**/medias/**', '**/*.mp4', '**/*.tar.gz', '**/imgs/**'],
    },
  },
  preview: {
    proxy: apiProxy,
  },
});
