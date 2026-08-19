import { ClerkProvider } from "@clerk/clerk-react";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import App from "./App.tsx";
import { CLERK_PUBLISHABLE_KEY } from "./lib/clerk";

/**
 * Root entry component.
 *
 * Only wraps the app in ClerkProvider when a real Clerk publishable key is
 * configured. In dev without a key (the .env placeholder), the app boots
 * without Clerk so public pages work; admin routes requiring auth will
 * redirect to /login, which renders a friendly notice.
 */
export default function Root(): React.ReactElement {
  const app = (
    <>
      <App />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </>
  );

  if (!CLERK_PUBLISHABLE_KEY) {
    return app;
  }

  return <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>{app}</ClerkProvider>;
}