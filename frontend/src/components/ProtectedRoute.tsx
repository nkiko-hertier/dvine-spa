import React from "react";
import { Navigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { CLERK_PUBLISHABLE_KEY } from "../lib/clerk";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Clerk-backed guard. Only mounted when a real Clerk publishable key is
 * configured, so useAuth() is always safe here.
 */
function ClerkProtected({ children, location }: ProtectedRouteProps & { location: ReturnType<typeof useLocation> }): React.ReactElement | null {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F6F0]">
        <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Loading...</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

/**
 * Guards /dashboard/* routes.
 *
 * - When Clerk is enabled (a real publishable key is configured), renders
 *   ClerkProtected which redirects unauthenticated visitors to /login.
 * - When Clerk is NOT enabled (dev mode with the placeholder key), shows a
 *   friendly notice instead of hanging on a loading spinner.
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps): React.ReactElement {
  const location = useLocation();

  // No Clerk configured — show a message with a link back home.
  if (!CLERK_PUBLISHABLE_KEY) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F6F0] p-8">
        <div className="max-w-md w-full bg-[#EFECE6] border border-stone-300 p-8 text-center">
          <h1 className="font-serif text-2xl text-[#1C3A27] mb-3">Admin Access</h1>
          <p className="text-xs text-stone-600 mb-6">
            Authentication is disabled in development because no Clerk
            publishable key is configured. To access the admin dashboard,
            add a valid <code className="text-[#1C3A27]">VITE_CLERK_PUBLISHABLE_KEY</code> to{" "}
            <code className="text-[#1C3A27]">.env</code> and restart the dev server.
          </p>
          <Link
            to="/"
            className="inline-block bg-[#1C3A27] text-[#F8F6F0] px-6 py-2.5 text-[10px] uppercase tracking-[0.2em] font-semibold"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  return <ClerkProtected location={location}>{children}</ClerkProtected>;
}