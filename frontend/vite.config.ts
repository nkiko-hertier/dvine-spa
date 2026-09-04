import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Third arg "" loads every var in .env (not just VITE_-prefixed ones) so
  // API_URL is readable here even though it's never exposed to the browser.
  const env = loadEnv(mode, process.cwd(), "");
  const apiUrl = env.API_URL || "https://cms-api.pixelspringmarketing.com";

  return {
    plugins: [react()],
    server: {
      proxy: {
        // Frontend calls /api/... (VITE_API_BASE_URL=/api). The dev server
        // forwards them to the real backend (API_URL, see .env.example) and
        // strips the /api prefix so the backend's root-level routes
        // (/categories, /treatments, /admin/*, /booking-requests) are hit
        // correctly. This avoids browser CORS entirely — all requests are
        // same-origin.
        "/api": {
          target: apiUrl,
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api/, ""),
        },
        // Socket.IO's own handshake path — proxied straight through (no
        // rewrite; the backend mounts Socket.IO at the default /socket.io
        // path) with ws: true so the upgrade to a websocket connection works
        // through the dev server too, not just the initial HTTP handshake.
        "/socket.io": {
          target: apiUrl,
          changeOrigin: true,
          ws: true,
        },
      },
    },
  };
});
