import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

/**
 * Singleton PrismaClient. Import `prisma` from here everywhere — never
 * `new PrismaClient()` directly, or you'll exhaust the connection pool
 * under `tsx watch`'s module reloading in dev.
 */
export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export async function disconnectPrisma() {
  await prisma.$disconnect();
}
