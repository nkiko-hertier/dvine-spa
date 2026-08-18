// Clerk publishable key, provided via Vite env vars.
// Add it to a local .env file (see .env.example):
//   VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxx
const rawKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

if (!rawKey) {
  throw new Error(
    "Missing VITE_CLERK_PUBLISHABLE_KEY. Add it to a .env file in /frontend (see .env.example)."
  );
}

export const CLERK_PUBLISHABLE_KEY: string = rawKey;
