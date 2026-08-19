// Clerk publishable key, provided via Vite env vars.
// Add it to a local .env file (see .env.example):
//   VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxx
//
// The .env ships with a placeholder ("pk_test_xxxxxxxx...").
// Clerk's <ClerkProvider> throws if it receives a key that isn't real.
// To let the app boot in development (and only activate Clerk in
// production once a genuine key is configured), we treat only a
// real-looking key as configured. `null` means "no Clerk".
const PLACEHOLDER_KEY = "xxxxxxxx";

const rawKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

function isRealKey(key: string | undefined): key is string {
  if (!key) return false;
  // Real Clerk keys start with pk_test_ or pk_live_ and never contain
  // the "xxxxxxxx" placeholder.
  return /^pk_(test|live)_/.test(key) && !key.includes(PLACEHOLDER_KEY);
}

export const CLERK_PUBLISHABLE_KEY: string | null = isRealKey(rawKey)
  ? (rawKey as string)
  : null;