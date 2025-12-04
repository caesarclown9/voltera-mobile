/**
 * Нижняя навигация для операторов и администраторов
 */

import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboard, Zap, Settings, Users, Wallet } from "lucide-react";
import type { ComponentType } from "react";
import { useUserType } from "@/features/auth/hooks/useUserType";

interface NavItem {
  path: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  requiredRole?: ("operator" | "admin" | "superadmin")[];
}

const navItems: NavItem[] = [
  {
    path: "/admin",
    label: "Обзор",
    icon: LayoutDashboard,
  },
  {
    path: "/admin/stations",
    label: "Станции",
    icon: Zap,
  },
  {
    path: "/admin/clients",
    label: "Клиенты",
    icon: Wallet,
    requiredRole: ["admin", "superadmin"],
  },
  {
    path: "/admin/users",
    label: "Операторы",
    icon: Users,
    requiredRole: ["admin", "superadmin"],
  },
  {
    path: "/admin/settings",
    label: "Настройки",
    icon: Settings,
  },
];

export function AdminBottomNavigation() {
  const location = useLocation();
  const { role } = useUserType();

  // Скрываем на странице авторизации
  if (location.pathname.startsWith("/auth")) {
    return null;
  }

  // Фильтруем элементы по роли
  const visibleItems = navItems.filter((item) => {
    if (!item.requiredRole) return true;
    return role && item.requiredRole.includes(role);
  });

  return (
    <nav
      className="fixed left-0 right-0 bg-white shadow-lg z-50 border-t border-accent-100"
      style={{
        bottom: "0",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex justify-around items-center h-16 px-2">
        {visibleItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== "/admin" && location.pathname.startsWith(item.path));

          const IconComponent = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center justify-center flex-1 py-2"
            >
              {isActive && (
                <motion.div
                  layoutId="adminBottomNav"
                  className="absolute inset-0 bg-accent-50 rounded-xl"
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
                    isActive ? "text-accent-500" : "text-gray-400"
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span
                  className={`text-xs font-medium transition-colors ${
                    isActive ? "text-accent-600" : "text-gray-500"
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
