import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Layers, Briefcase, CalendarCheck, Plus } from "lucide-react";

export default function Sidebar(): React.ReactElement {
  const location = useLocation();

  // Updated paths to match /dashboard/... structure
  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Categories", path: "/dashboard/categories", icon: Layers },
    { name: "Services", path: "/dashboard/services", icon: Briefcase },
    { name: "Bookings", path: "/dashboard/bookings", icon: CalendarCheck },
  ];

  return (
    <aside className="w-64 bg-[#0A2619] text-[#F8F6F0] flex flex-col justify-between p-6 shrink-0 font-['Work_Sans',sans-serif] min-h-screen">
      
      {/* BRAND & LOGO */}
      <div>
        <div className="mb-10 pt-2">
          <h1 className="font-serif text-2xl tracking-wide text-white">
            D'vine Admin
          </h1>
          <p className="text-[10px] uppercase tracking-[0.25em] text-emerald-300/80 font-light mt-1">
            Management Portal
          </p>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            // Active state handling for exact match or nested child routes
            const isActive = location.pathname === item.path || 
              (item.path !== "/dashboard" && location.pathname.startsWith(item.path));
            
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 text-xs uppercase tracking-wider transition-colors ${
                  isActive
                    ? "bg-[#1C3A27] text-white font-semibold border-l-2 border-emerald-300"
                    : "text-stone-300 hover:bg-[#1C3A27]/60 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4 text-emerald-300" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* BOTTOM ACTION BUTTON */}
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
  );
}