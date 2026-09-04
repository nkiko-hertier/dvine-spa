
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import base44 from '@base44/vite-plugin'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Third arg "" loads every var in .env / .env.local (not just VITE_-prefixed
  // ones) so API_URL is readable here even though it's never exposed to the browser.
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = env.API_URL || 'https://cms-api.pixelspringmarketing.com';

  // All `/api/*` calls are proxied straight to the D'Vine Spa API. Override
  // the target by setting API_URL in .env.local (this repo's .gitignore
  // excludes all .env* files, so there's no committed .env.example here —
  // see README.md's "Use The Hosted Backend" section for the pattern). The
  // `/api` prefix is stripped, so `/api/categories` -> `<API_URL>/categories`.
  // Same rule lives in vercel.json for production.
  const apiProxy = {
    '/api': {
      target: apiUrl,
      changeOrigin: true,
      secure: false,
      rewrite: (p) => p.replace(/^\/api/, ''),
    },
  };

  return {
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
  };
});
