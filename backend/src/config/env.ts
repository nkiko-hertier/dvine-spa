import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DASHBOARD_URL: z.string().url().default('http://localhost:3000'),

  // Optional until Phase 1 / Phase 2 wire these in — validated as present-or-empty here
  // so the app can boot in Phase 0 without a DB or Clerk configured yet.
  DATABASE_URL: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),
  CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_WEBHOOK_SECRET: z.string().optional(),
  REDIS_URL: z.string().optional(),

  // SendGrid email — all optional so the app boots fine in dev without them.
  // When SENDGRID_API_KEY is unset, every send is a no-op with a warning log.
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().email().optional(),
  SENDGRID_FROM_NAME: z.string().default("d'Vine Spa"),

  // Public site origin — used in email links (booking confirmation, etc.).
  // Separate from DASHBOARD_URL which is the *admin* dashboard origin used for CORS.
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  // Google Business Profile (or other) review link. Dropped into the
  // "booking completed" thank-you email. Template renders without the CTA
  // block if this is unset, so it doesn't block shipping the rest.
  REVIEW_LINK_URL: z.string().url().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
