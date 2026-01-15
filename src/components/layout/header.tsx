"use client";

import { useAuth } from "@/hooks/use-auth";
import { Bell, Search } from "lucide-react";
import { getInitials } from "@/lib/utils";

export function Header() {
  const { user, isAdmin } = useAuth();

  return (
    <header className="h-14 md:h-16 glass border-b border-white/10 flex items-center justify-between px-4 md:px-6">
      {/* Search - hidden on small mobile, visible from sm up */}
      <div className="hidden sm:flex items-center gap-4 flex-1 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full h-9 pl-10 pr-4 rounded-lg bg-dark-400 border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-neon-cyan/50 transition-colors"
          />
        </div>
      </div>

      {/* Spacer for mobile to push content right */}
      <div className="flex-1 sm:hidden" />

      {/* Right side */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-white/5 transition-colors">
          <Bell className="h-5 w-5 text-gray-400" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-neon-cyan pulse-glow" />
        </button>

        {/* User */}
        <div className="flex items-center gap-2 md:gap-3">
          <div className="h-8 w-8 md:h-9 md:w-9 rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center text-dark-600 font-semibold text-xs md:text-sm">
            {user ? getInitials(user.firstName, user.lastName) : "?"}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-white">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-500">
              {isAdmin ? "Administrator" : "Employee"}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
