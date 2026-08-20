import { io, type Socket } from "socket.io-client";

/**
 * Realtime Socket.IO client for the admin dashboard.
 *
 * Mirrors apiClient's origin resolution: VITE_API_BASE_URL is usually a
 * relative "/api" path proxied by Vite in dev (see vite.config.ts, which
 * also proxies "/socket.io" alongside "/api"), so the socket just connects
 * to the current page's origin in that case. In production, if
 * VITE_API_BASE_URL is an absolute URL on a different origin, we connect
 * the socket to that same origin (Socket.IO always uses the default
 * "/socket.io" path regardless of the REST API's path prefix).
 *
 * Auth: the backend's Socket.IO handshake (backend/src/realtime/socket.ts)
 * expects the same Clerk session token used for REST calls, passed as
 * `auth.token` — there is no separate realtime token.
 */

function resolveSocketOrigin(): string {
  const explicit = import.meta.env.VITE_SOCKET_URL as string | undefined;
  if (explicit) return explicit;

  const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) || "http://localhost:4000";
  try {
    return new URL(apiBase, window.location.origin).origin;
  } catch {
    return window.location.origin;
  }
}

let socket: Socket | null = null;

/**
 * Returns the shared dashboard socket, creating (and connecting) it on
 * first call. Safe to call from multiple hooks/components — they all get
 * the same connection.
 */
export function getDashboardSocket(): Socket {
  if (socket) return socket;

  socket = io(resolveSocketOrigin(), {
    autoConnect: false,
    withCredentials: true,
    auth: async (cb) => {
      const token = await window.Clerk?.session?.getToken();
      cb({ token });
    },
  });

  return socket;
}

/**
 * Connects the shared socket if it isn't already connected/connecting.
 * Call this once a Clerk session exists — connecting without a valid
 * token just gets the handshake rejected by the backend.
 */
export function connectDashboardSocket(): Socket {
  const s = getDashboardSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectDashboardSocket(): void {
  socket?.disconnect();
}
