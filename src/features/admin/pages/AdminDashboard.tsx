/**
 * Главная страница админ-панели
 * Показывает обзор системы: статистику станций, активные сессии, быстрые действия
 *
 * ВАЖНО: Использует Admin API вместо прямых Supabase запросов.
 * Данные фильтруются на бэкенде по роли оператора.
 */

import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  Battery,
  Users,
  TrendingUp,
  Settings,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { useAuthStore } from "@/features/auth/store";
import { useUserType } from "@/features/auth/hooks/useUserType";
import { useLogout } from "@/features/auth/hooks/useAuth";
import { AdminBottomNavigation } from "../components/AdminBottomNavigation";
import { adminApi, type AdminDashboardStats } from "@/services/adminApi";
import { logger } from "@/shared/utils/logger";

/**
 * Карточка статистики
 */
function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color = "primary",
}: {
  icon: typeof Zap;
  label: string;
  value: string | number;
  subValue?: string;
  color?: "primary" | "success" | "warning" | "error" | "accent";
}) {
  const colorClasses = {
    primary: "bg-primary-50 text-primary-600",
    success: "bg-success-50 text-success-600",
    warning: "bg-warning-50 text-warning-600",
    error: "bg-error-50 text-error-600",
    accent: "bg-accent-50 text-accent-600",
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon size={20} />
        </div>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {subValue && <div className="text-xs text-gray-400 mt-1">{subValue}</div>}
    </div>
  );
}

/**
 * Быстрое действие
 */
function QuickAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Zap;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full p-4 bg-white rounded-xl shadow-sm hover:bg-gray-50 transition-colors text-left"
    >
      <div className="p-2 bg-accent-50 rounded-lg">
        <Icon size={20} className="text-accent-600" />
      </div>
      <span className="font-medium text-gray-700">{label}</span>
    </button>
  );
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { role, operatorData } = useUserType();
  const logoutMutation = useLogout();

  // Получаем статистику через Admin API
  const {
    data: stats,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<AdminDashboardStats>({
    queryKey: ["adminDashboardStats"],
    queryFn: () => adminApi.getStats(1),
    staleTime: 30 * 1000, // 30 секунд
    refetchInterval: 60 * 1000, // Обновлять каждую минуту
    retry: 2,
  });

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      navigate("/", { replace: true });
    } catch (err) {
      logger.error("[AdminDashboard] Logout error:", err);
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  const roleLabels: Record<string, string> = {
    operator: "Оператор",
    admin: "Администратор",
    superadmin: "Суперадмин",
  };

  // Показываем ошибку если API недоступен
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 shadow-sm max-w-sm w-full text-center">
          <AlertTriangle size={48} className="text-error-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Ошибка загрузки
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            {error instanceof Error ? error.message : "Не удалось загрузить данные"}
          </p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Повторить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-dark text-white">
        <div className="p-4 pt-safe">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold">Панель управления</h1>
              <p className="text-white/70 text-sm">
                {roleLabels[role ?? "operator"]} - {operatorData?.email ?? user?.email}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isFetching}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={20} className={isFetching ? "animate-spin" : ""} />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-4 -mt-4">
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Zap}
            label="Всего станций"
            value={isLoading ? "..." : stats?.stations.total ?? 0}
            color="primary"
          />
          <StatCard
            icon={CheckCircle}
            label="Онлайн"
            value={isLoading ? "..." : stats?.stations.online ?? 0}
            color="success"
          />
          <StatCard
            icon={Clock}
            label="Офлайн"
            value={isLoading ? "..." : stats?.stations.offline ?? 0}
            color="warning"
          />
          <StatCard
            icon={AlertTriangle}
            label="Ошибки"
            value={isLoading ? "..." : stats?.stations.error ?? 0}
            color="error"
          />
        </div>
      </div>

      {/* Active Sessions */}
      <div className="px-4 mb-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent-50 rounded-lg">
                <Battery size={20} className="text-accent-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Активных сессий</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? "..." : stats?.sessions.active ?? 0}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/admin/sessions")}
              className="text-sm text-accent-600 font-medium"
            >
              Подробнее
            </button>
          </div>
        </div>
      </div>

      {/* Today Stats */}
      <div className="px-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">
          Сегодня
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={TrendingUp}
            label="Энергия"
            value={
              isLoading
                ? "..."
                : `${(stats?.today.energy_kwh ?? 0).toFixed(1)} кВт·ч`
            }
            color="accent"
          />
          <StatCard
            icon={TrendingUp}
            label="Выручка"
            value={
              isLoading
                ? "..."
                : `${(stats?.today.revenue_som ?? 0).toFixed(0)} сом`
            }
            color="success"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">
          Быстрые действия
        </h2>
        <div className="space-y-2">
          <QuickAction
            icon={Zap}
            label="Управление станциями"
            onClick={() => navigate("/admin/stations")}
          />
          <QuickAction
            icon={Users}
            label="Клиенты и баланс"
            onClick={() => navigate("/admin/clients")}
          />
          <QuickAction
            icon={Settings}
            label="Настройки системы"
            onClick={() => navigate("/admin/settings")}
          />
        </div>
      </div>

      {/* Admin Navigation */}
      <AdminBottomNavigation />
    </div>
  );
}
