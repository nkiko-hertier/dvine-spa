import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, User, Settings, ChevronDown } from "lucide-react";

interface DashboardHeaderProps {
  title?: string;
  subtitle?: string;
}

export default function DashboardHeader({
  title = "Today's Overview",
  subtitle = "Welcome back. The sanctuary is active.",
}: DashboardHeaderProps): React.ReactElement {
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    navigate("/login");
  };

  return (
    <header className="bg-[#F8F6F0] border-b border-stone-300/60 px-6 py-3.5 flex items-center justify-between font-['Work_Sans',sans-serif] relative">
      
      {/* TITLE & SUBTITLE */}
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl text-[#1C3A27] tracking-tight">
          {title}
        </h1>
        <p className="text-[11px] text-stone-600 font-light mt-0.5">
          {subtitle}
        </p>
      </div>

      {/* ADMIN PROFILE & DROPDOWN */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center space-x-2.5 focus:outline-none group p-1 hover:bg-stone-200/50 transition-colors"
          aria-label="Open profile menu"
        >
          <img
            src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop"
            alt="Admin Profile"
            className="w-9 h-9 rounded-full object-cover border border-stone-300 shadow-sm"
          />
          <div className="hidden sm:block text-left">
            <span className="block text-xs font-semibold text-[#1C3A27]">Admin User</span>
            <span className="block text-[9px] text-stone-500 uppercase tracking-widest">Manager</span>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-stone-500 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
        </button>

        {/* DROPDOWN MENU */}
        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-[#EFECE6] border border-stone-300 shadow-lg py-2 z-50 text-xs">
            <div className="px-4 py-2 border-b border-stone-300/65 mb-1">
              <p className="font-semibold text-[#1C3A27]">Signed in as</p>
              <p className="text-[10px] text-stone-600 truncate">dvinespa2@gmail.com</p>
            </div>

            <Link
              to="/admin/profile"
              onClick={() => setIsDropdownOpen(false)}
              className="flex items-center space-x-2 px-4 py-2 text-stone-700 hover:bg-[#1C3A27] hover:text-[#F8F6F0] transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              <span>Your Profile</span>
            </Link>

            <Link
              to="/admin/settings"
              onClick={() => setIsDropdownOpen(false)}
              className="flex items-center space-x-2 px-4 py-2 text-stone-700 hover:bg-[#1C3A27] hover:text-[#F8F6F0] transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </Link>

            <div className="border-t border-stone-300/65 my-1" />

            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-2 px-4 py-2 text-red-700 hover:bg-red-50 transition-colors text-left font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        )}
      </div>

    </header>
  );
}