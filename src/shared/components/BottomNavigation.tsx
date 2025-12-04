import { Link, useLocation } from "react-router-dom";
import { useAuthStatus } from "@/features/auth/hooks/useAuth";
import { motion } from "framer-motion";
import { Map, List, Heart, User } from "lucide-react";
import type { ComponentType } from "react";

interface NavItem {
  path: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  authRequired?: boolean;
}

const navItems: NavItem[] = [
  {
    path: "/",
    label: "Карта",
    icon: Map,
  },
  {
    path: "/stations",
    label: "Списком",
    icon: List,
  },
  {
    path: "/favorites",
    label: "Избранное",
    icon: Heart,
    authRequired: false,
  },
  {
    path: "/profile",
    label: "Профиль",
    icon: User,
  },
];

export function BottomNavigation() {
  const location = useLocation();
  const { isAuthenticated } = useAuthStatus();

  // Hide navigation on auth pages
  if (location.pathname.startsWith("/auth")) {
    return null;
  }

  return (
    <nav
      className="fixed left-0 right-0 bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/30 z-50 transition-colors"
      style={{
        bottom: "0",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          // Skip auth-required items if not authenticated
          if (item.authRequired && !isAuthenticated) {
            return null;
          }

          const isActive = location.pathname === item.path;

          const target =
            item.path === "/history" || item.path === "/payments"
              ? isAuthenticated
                ? item.path
                : `${item.path}?auth=required`
              : item.path;

          const IconComponent = item.icon;

          return (
            <Link
              key={item.path}
              to={target}
              className="relative flex flex-col items-center justify-center flex-1 py-2"
            >
              {isActive && (
                <motion.div
                  layoutId="bottomNav"
                  className="absolute inset-0 bg-primary-50 dark:bg-primary-900/30 rounded-xl"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <motion.div
                whileTap={{ scale: 0.95 }}
                className="relative z-10 flex flex-col items-center"
              >
                <IconComponent
                  size={24}
                  className={`mb-1 transition-colors ${
                    isActive ? "text-primary-500 dark:text-primary-400" : "text-gray-400 dark:text-gray-500"
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span
                  className={`text-xs font-medium transition-colors ${
                    isActive ? "text-primary-600 dark:text-primary-400" : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {item.label}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
