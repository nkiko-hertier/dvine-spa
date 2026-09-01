import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env.js';

const isServerless = process.env.VERCEL === '1';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  // On Vercel each warm function instance keeps its own pool, and many can
  // run concurrently — keep each pool tiny so we don't blow past Postgres
  // max_connections. Point DATABASE_URL at a pooler (Neon/Supabase pooled
  // connection string, PgBouncer, or Prisma Accelerate) for real scale.
  max: isServerless ? 1 : 10,
});

/**
 * Singleton PrismaClient.
 *
 * Cached on `globalThis` so a reused serverless invocation (and `tsx watch`
 * module reloads in dev) share one client instead of opening a fresh pool
 * every time. Import `prisma` from here everywhere — never `new PrismaClient()`.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

globalForPrisma.prisma = prisma;

export async function disconnectPrisma() {
  await prisma.$disconnect();
}
