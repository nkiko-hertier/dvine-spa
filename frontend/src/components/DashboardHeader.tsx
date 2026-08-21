import React from "react";
import { UserButton } from "@clerk/clerk-react";
import { Menu } from "lucide-react";
import NotificationPanel from "./NotificationPanel";
import { toggleSidebar } from "./Sidebar"; // adjust the import path as needed

interface DashboardHeaderProps {
  title?: string;
  subtitle?: string;
}

export default function DashboardHeader({
  title = "Today's Overview",
  subtitle = "Welcome back. The sanctuary is active.",
}: DashboardHeaderProps): React.ReactElement {
  return (
    <header className="bg-[#F8F6F0] border-b border-stone-300/60 px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-['Work_Sans',sans-serif] relative">
      {/* LEFT SECTION: Menu button + Titles */}
      <div className="flex items-center min-w-0 gap-3">
        {/* Mobile menu toggle — hidden on large screens */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-1 -ml-1 text-stone-700 hover:text-[#1C3A27] transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h1 className="font-serif text-xl sm:text-2xl lg:text-3xl text-[#1C3A27] tracking-tight truncate">
            {title}
          </h1>
          <p className="text-[11px] text-stone-600 font-light mt-0.5 truncate">
            {subtitle}
          </p>
        </div>
      </div>

      {/* RIGHT SECTION: Notifications + User profile */}
      <div className="flex items-center space-x-2 shrink-0">
        <NotificationPanel />
        <UserButton />
      </div>
    </header>
  );
}