import type { Staff } from '@prisma/client';
import { prisma } from './prisma.js';

/**
 * Resolves a Clerk user id to an active local staff row, or null.
 * Shared by src/middleware/auth.ts (HTTP) and src/realtime/socket.ts
 * (Socket.IO handshake) so "who is this session" is defined once.
 */
export async function resolveActiveStaff(clerkUserId: string): Promise<Staff | null> {
  const staff = await prisma.staff.findUnique({ where: { clerkUserId } });
  if (!staff || !staff.isActive) return null;
  return staff;
}
