import type { Staff } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      /**
       * Set by requireAuth (src/middleware/auth.ts) after verifying the
       * Clerk session and resolving it to a local staff row. Only present
       * on routes behind requireAuth — undefined everywhere else.
       */
      staff?: Staff;
    }
  }
}

export {};
