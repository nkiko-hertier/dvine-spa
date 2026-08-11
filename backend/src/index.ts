import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { disconnectPrisma } from './lib/prisma.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`D'Vine Spa API listening on port ${env.PORT} [${env.NODE_ENV}]`);
});

// Phase 7 will attach Socket.IO to this same `server` instance
// (see API_DOCUMENTATION.md §12) instead of creating a second HTTP server.

function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully...`);
  server.close(async () => {
    await disconnectPrisma();
    logger.info('Server closed.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
