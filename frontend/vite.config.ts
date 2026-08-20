import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Frontend calls /api/... (VITE_API_BASE_URL=/api). The dev server
      // forwards them to the real backend and strips the /api prefix so
      // the backend's root-level routes (/categories, /treatments,
      // /admin/*, /booking-requests) are hit correctly. This avoids
      // browser CORS entirely — all requests are same-origin.
      "/api": {
        target: "http://5.189.175.8:4000",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api/, ""),
      },
      // Socket.IO's own handshake path — proxied straight through (no
      // rewrite; the backend mounts Socket.IO at the default /socket.io
      // path) with ws: true so the upgrade to a websocket connection works
      // through the dev server too, not just the initial HTTP handshake.
      "/socket.io": {
        target: "http://5.189.175.8:4000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});