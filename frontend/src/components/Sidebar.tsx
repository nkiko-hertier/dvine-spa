import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useLocation, matchPath } from "react-router-dom";
import {
  LayoutDashboard,
  Layers,
  Briefcase,
  CalendarCheck,
  Users,
  ShieldCheck,
  Plus,
  X,
} from "lucide-react";
import { useCurrentStaff } from "../lib/helpers";

// Custom event for toggling the mobile sidebar from the DashboardHeader
export function toggleSidebar(): void {
  window.dispatchEvent(new CustomEvent("toggle-sidebar"));
}

// Reusable Tailwind classes
const LINK_BASE =
  "flex items-center space-x-3 px-4 py-3 text-xs uppercase tracking-wider transition-colors";
const LINK_ACTIVE =
  "bg-[#1C3A27] text-white font-semibold border-l-2 border-emerald-300";
const LINK_INACTIVE =
  "text-stone-300 hover:bg-[#1C3A27]/60 hover:text-white";

export default function Sidebar(): React.ReactElement {
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const { data: me } = useCurrentStaff();
  const isAdmin = me?.role === "admin";

  // Listen for toggle events from DashboardHeader
  useEffect(() => {
    const handler = () => setIsMobileOpen((prev) => !prev);
    window.addEventListener("toggle-sidebar", handler);
    return () => window.removeEventListener("toggle-sidebar", handler);
  }, []);

  // Close mobile sidebar when route changes
  useEffect(() => {
    // This is a standard UI pattern – closing a menu on navigation.
    // It does NOT cause cascading renders here; the linter warning is a false positive.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Lock body scroll and move focus when mobile sidebar opens/closes
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
      closeButtonRef.current?.focus();
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileOpen]);

  const navItems = useMemo(
    () => [
      { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { name: "Categories", path: "/dashboard/categories", icon: Layers },
      { name: "Services", path: "/dashboard/services", icon: Briefcase },
      { name: "Bookings", path: "/dashboard/bookings", icon: CalendarCheck },
      { name: "Clients", path: "/dashboard/customers", icon: Users },
      ...(isAdmin
        ? [{ name: "User Management", path: "/dashboard/users", icon: ShieldCheck }]
        : []),
    ],
    [isAdmin]
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#0A2619] text-[#F8F6F0]
          flex flex-col justify-between p-6 shrink-0 font-['Work_Sans',sans-serif]
          min-h-screen transition-transform duration-300 ease-in-out
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Close button (mobile only) */}
        <button
          ref={closeButtonRef}
          onClick={() => setIsMobileOpen(false)}
          className="absolute top-4 right-4 p-1.5 text-stone-300 hover:text-white transition-colors lg:hidden"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand */}
        <div>
          <div className="mb-10 pt-2">
            <h1 className="font-serif text-2xl tracking-wide text-white">
              D'vine Admin
            </h1>
            <p className="text-[10px] uppercase tracking-[0.25em] text-emerald-300/80 font-light mt-1">
              Management Portal
            </p>
          </div>

          {/* Navigation */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              // React Router v6 matchPath signature: (pattern, pathname)
              const isActive = !!matchPath(
                {
                  path: item.path,
                  end: item.path === "/dashboard", // exact match only for dashboard
                },
                location.pathname
              );

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`${LINK_BASE} ${
                    isActive ? LINK_ACTIVE : LINK_INACTIVE
                  }`}
                >
                  <Icon className="w-4 h-4 text-emerald-300" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* New Booking button */}
        <div className="pt-6 border-t border-emerald-900/60">
          <Link
            to="/dashboard/booking/new"
            className="flex items-center justify-center space-x-2 w-full bg-[#F8F6F0] text-[#1C3A27] py-3 text-[10px] uppercase tracking-[0.2em] font-semibold hover:bg-white transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Booking</span>
          </Link>
        </div>
      </aside>
    </>
  );
}