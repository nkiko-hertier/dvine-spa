// @clerk/clerk-react loads clerk-js in the background and attaches the
// live Clerk instance to `window.Clerk`. This lets us read the current
// session token from plain modules (like apiClient.ts) that aren't React
// components and can't call the useAuth()/useClerk() hooks.
// We only type the small surface we actually use.
export {};

declare global {
  interface Window {
    Clerk?: {
      session?: {
        getToken: (options?: { template?: string }) => Promise<string | null>;
      } | null;
    };
  }
}
