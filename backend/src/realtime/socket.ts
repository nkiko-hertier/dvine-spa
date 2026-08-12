import type { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer, type Socket } from 'socket.io';
import { verifyToken } from '@clerk/express';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { resolveActiveStaff } from '../lib/resolveStaff.js';
import { PgListener } from './pgListener.js';

const DASHBOARD_ROOM = 'dashboard';

// socket.io types Socket.data as `any` by default (it's a generic
// SocketData type param) — this just documents the shape we rely on
// rather than trying to (incorrectly) re-declare Socket, which is a
// class in socket.io's types and doesn't merge via `interface` augmentation.
interface DashboardSocketData {
  staffId: string;
  role: string;
}

/**
 * Mounts Socket.IO on the same HTTP server as Express (never a second
 * server — see API_DOCUMENTATION.md §12.2) and wires it to Postgres
 * LISTEN/NOTIFY so any DB write reaches connected dashboards, not just
 * ones made through this API instance.
 *
 * Auth happens once at handshake using the same Clerk session token as
 * REST calls (§12.2) — there is no separate realtime token. All staff
 * currently join one shared room; see API_DOCUMENTATION.md's Open
 * Decisions table re: role-scoped rooms, deliberately not built yet.
 */
export function initRealtime(httpServer: HttpServer): { io: SocketIOServer; pgListener: PgListener } {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: env.DASHBOARD_URL, credentials: true },
  });

  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) {
        next(new Error('unauthorized'));
        return;
      }
      if (!env.CLERK_SECRET_KEY) {
        logger.warn('CLERK_SECRET_KEY not set — rejecting socket handshake.');
        next(new Error('unauthorized'));
        return;
      }

      const payload = await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY });
      const staff = await resolveActiveStaff(payload.sub);
      if (!staff) {
        next(new Error('unauthorized'));
        return;
      }

      const data = socket.data as DashboardSocketData;
      data.staffId = staff.id;
      data.role = staff.role;
      next();
    } catch (err) {
      logger.warn({ err }, 'Socket handshake auth failed.');
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const data = socket.data as DashboardSocketData;
    void socket.join(DASHBOARD_ROOM);
    logger.debug({ staffId: data.staffId }, 'Dashboard socket connected.');

    socket.on('disconnect', () => {
      logger.debug({ staffId: data.staffId }, 'Dashboard socket disconnected.');
    });
  });

  // §12.3 — bridges Postgres pg_notify to Socket.IO events. `booking_updates`
  // carries the full row diff; `dashboard_notifications` is the lighter
  // "toast" feed (new requests, cancellations, no-shows).
  const pgListener = new PgListener((channel, payload) => {
    const event = channel === 'booking_updates' ? 'booking:updated' : 'notification:new';
    io.to(DASHBOARD_ROOM).emit(event, payload);
  });

  return { io, pgListener };
}
