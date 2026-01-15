"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Clock,
  History,
  FolderKanban,
  Users,
  CheckSquare,
  FileBarChart,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["EMPLOYEE", "COMPANY_ADMIN", "SUPER_ADMIN"],
  },
  {
    title: "Time Entry",
    href: "/time-entry",
    icon: Clock,
    roles: ["EMPLOYEE", "COMPANY_ADMIN"],
  },
  {
    title: "History",
    href: "/history",
    icon: History,
    roles: ["EMPLOYEE", "COMPANY_ADMIN"],
  },
  {
    title: "divider",
    href: "",
    icon: null,
    roles: ["COMPANY_ADMIN", "SUPER_ADMIN"],
  },
  {
    title: "Projects",
    href: "/admin/projects",
    icon: FolderKanban,
    roles: ["COMPANY_ADMIN", "SUPER_ADMIN"],
  },
  {
    title: "Employees",
    href: "/admin/employees",
    icon: Users,
    roles: ["COMPANY_ADMIN", "SUPER_ADMIN"],
  },
  {
    title: "Approvals",
    href: "/admin/approvals",
    icon: CheckSquare,
    roles: ["COMPANY_ADMIN", "SUPER_ADMIN"],
  },
  {
    title: "Reports",
    href: "/admin/reports",
    icon: FileBarChart,
    roles: ["COMPANY_ADMIN", "SUPER_ADMIN"],
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: Settings,
    roles: ["COMPANY_ADMIN", "SUPER_ADMIN"],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const filteredNavItems = navItems.filter((item) => {
    if (!user) return false;
    return item.roles.some((role) => user.roles.includes(role));
  });

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 80 : 260 }}
      className="fixed left-0 top-0 h-full glass border-r border-white/10 z-40 flex flex-col"
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center shadow-glow">
            <Clock className="h-5 w-5 text-dark-600" />
          </div>
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xl font-bold gradient-text"
            >
              Tyotrack
            </motion.span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {filteredNavItems.map((item, index) => {
            if (item.title === "divider") {
              return (
                <li key={index} className="py-2">
                  <div className="border-t border-white/10" />
                </li>
              );
            }

            const Icon = item.icon!;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-r from-neon-cyan/20 to-neon-purple/10 text-neon-cyan border border-neon-cyan/30"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-neon-cyan")} />
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm font-medium"
                    >
                      {item.title}
                    </motion.span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User & Logout */}
      <div className="border-t border-white/10 p-3">
        {!isCollapsed && user && (
          <div className="mb-3 px-3 py-2">
            <p className="text-sm font-medium text-white truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="h-5 w-5" />
          {!isCollapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 h-6 w-6 rounded-full bg-surface border border-white/20 flex items-center justify-center hover:border-neon-cyan/50 transition-colors"
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>
    </motion.aside>
  );
}
