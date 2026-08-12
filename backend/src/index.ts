import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { disconnectPrisma } from './lib/prisma.js';
import { initRealtime } from './realtime/socket.js';

if (!env.CLERK_SECRET_KEY || !env.CLERK_PUBLISHABLE_KEY) {
  logger.warn(
    'CLERK_SECRET_KEY / CLERK_PUBLISHABLE_KEY not set — /admin/* routes and realtime socket auth will fail until these are configured.',
  );
}
if (!env.CLERK_WEBHOOK_SECRET) {
  logger.warn('CLERK_WEBHOOK_SECRET not set — POST /webhooks/clerk will reject every delivery until this is configured.');
}

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`D'Vine Spa API listening on port ${env.PORT} [${env.NODE_ENV}]`);
});

// Socket.IO mounts on this same HTTP server (never a second one) — see
// API_DOCUMENTATION.md §12. The Postgres LISTEN bridge is started
// separately so it can be awaited/stopped cleanly on shutdown below.
const { pgListener } = initRealtime(server);
pgListener.start().catch((err: unknown) => {
  logger.error({ err }, 'Failed to start Postgres LISTEN bridge.');
});

function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully...`);
  server.close(async () => {
    await pgListener.stop();
    await disconnectPrisma();
    logger.info('Server closed.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
