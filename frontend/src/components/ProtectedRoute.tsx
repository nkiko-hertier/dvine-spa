import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Guards /dashboard/* routes. Redirects unauthenticated visitors to
// /login, preserving where they were headed so Login can send them back.
export default function ProtectedRoute({ children }: ProtectedRouteProps): React.ReactElement | null {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();

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
