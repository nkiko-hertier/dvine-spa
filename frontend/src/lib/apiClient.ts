import axios from "axios";

// Base URL for the backend API. Set VITE_API_BASE_URL in your .env
// (see .env.example). Falls back to the local dev server.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

/**
 * Every request made through `apiClient` automatically carries the
 * signed-in user's Clerk session token (the default session token,
 * i.e. no custom JWT template) as `Authorization: Bearer <token>`.
 *
 * You never need to call `getToken()` or set headers yourself — just
 * use `apiClient.get(...)`, `apiClient.post(...)`, etc. anywhere,
 * including inside React Query query/mutation functions.
 *
 * How: @clerk/clerk-react loads clerk-js and exposes the live session
 * on `window.Clerk.session`, so this works even outside React
 * components/hooks. Public (unauthenticated) requests just won't have
 * a session yet — the header is silently skipped and the backend's
 * public routes don't require it anyway.
 */
apiClient.interceptors.request.use(async (config) => {
  const token = await window.Clerk?.session?.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
