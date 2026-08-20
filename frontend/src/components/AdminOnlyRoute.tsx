import React from "react";
import { Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import Sidebar from "./Sidebar";
import DashboardHeader from "./DashboardHeader";
import { ShieldAlert } from "lucide-react";
import { useCurrentStaff } from "../lib/helpers";

interface AdminOnlyRouteProps {
  children: React.ReactNode;
}

/**
 * Frontend-side RBAC for admin-only pages (currently just User
 * Management). This is a UX convenience, NOT the security boundary —
 * the real enforcement is `requireRole(UserRole.admin)` on the backend
 * (see backend/src/routes/admin/index.ts, mounted on /admin/staff/*).
 * Even if this component were bypassed entirely, the API would still
 * reject a non-admin's requests with 403 FORBIDDEN.
 *
 * Wraps ProtectedRoute first (must be signed in at all), then checks
 * GET /admin/me for role === "admin" before rendering children.
 */
export default function AdminOnlyRoute({ children }: AdminOnlyRouteProps): React.ReactElement {
  return (
    <ProtectedRoute>
      <RoleGate>{children}</RoleGate>
    </ProtectedRoute>
  );
}

function RoleGate({ children }: AdminOnlyRouteProps): React.ReactElement {
  const { data: me, isLoading, isError } = useCurrentStaff();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F6F0]">
        <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Loading...</p>
      </div>
    );
  }

  // A resolved session with no matching/active staff row, or any other
  // fetch failure — the backend itself would reject requests too, so
  // there's nothing useful to show here.
  if (isError || !me) {
    return <Navigate to="/dashboard" replace />;
  }

  if (me.role !== "admin") {
    return (
      <div className="min-h-screen bg-[#F8F6F0] flex font-['Work_Sans',sans-serif] text-[#1C3A27]">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <DashboardHeader
            title="User Management"
            subtitle="Staff accounts and access control."
          />
          <main className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-md w-full bg-[#EFECE6] border border-stone-300 p-8 text-center">
              <ShieldAlert className="w-8 h-8 text-amber-700 mx-auto mb-4" />
              <h1 className="font-serif text-2xl text-[#1C3A27] mb-3">Admin Access Required</h1>
              <p className="text-xs text-stone-600">
                User management is restricted to admin accounts. You're signed in as{" "}
                <span className="font-semibold text-[#1C3A27]">{me.full_name}</span> ({me.role}).
                Ask an admin if you need access.
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
