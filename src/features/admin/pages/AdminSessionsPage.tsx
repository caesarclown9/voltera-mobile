/**
 * Страница просмотра сессий зарядки для операторов
 *
 * Показывает активные сессии и историю зарядок.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Search,
  Battery,
  User,
  MapPin,
  ChevronRight,
  Activity,
} from "lucide-react";
import { AdminBottomNavigation } from "../components/AdminBottomNavigation";
import { adminApi, type AdminSession } from "@/services/adminApi";

type ViewMode = "active" | "history";
type StatusFilter = "all" | "started" | "stopped" | "error";

/**
 * Форматирование длительности
 */
function formatDuration(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours} ч ${mins} мин` : `${hours} ч`;
}

/**
 * Получить информацию о статусе сессии
 */
function getSessionStatusInfo(status: string) {
  switch (status) {
    case "started":
      return {
        icon: Activity,
        color: "text-primary-500",
        bgColor: "bg-primary-50",
        label: "Заряжается",
      };
    case "stopped":
      return {
        icon: CheckCircle,
        color: "text-success-500",
        bgColor: "bg-success-50",
        label: "Завершена",
      };
    case "error":
      return {
        icon: AlertTriangle,
        color: "text-error-500",
        bgColor: "bg-error-50",
        label: "Ошибка",
      };
    default:
      return {
        icon: Clock,
        color: "text-gray-400",
        bgColor: "bg-gray-100",
        label: "Неизвестно",
      };
  }
}

/**
 * Карточка сессии
 */
function SessionCard({
  session,
  onClick,
}: {
  session: AdminSession;
  onClick: () => void;
}) {
  const statusInfo = getSessionStatusInfo(session.status);
  const StatusIcon = statusInfo.icon;

  const startTime = session.start_time
    ? new Date(session.start_time).toLocaleString("ru-RU", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-left"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${statusInfo.bgColor}`}>
            <StatusIcon size={20} className={statusInfo.color} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {session.station_name || `Станция ${session.station_id.slice(0, 8)}`}
            </h3>
            <p className="text-sm text-gray-500">{startTime}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${statusInfo.bgColor}`}>
            <span className={`text-xs font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
          <ChevronRight size={20} className="text-gray-400" />
        </div>
      </div>

      {/* Клиент */}
      <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
        <User size={14} />
        <span>{session.client_email || session.client_phone || "Неизвестный клиент"}</span>
      </div>

      {/* Локация */}
      {session.location_name && (
        <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
          <MapPin size={14} />
          <span>{session.location_name}</span>
        </div>
      )}

      {/* Метрики */}
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100">
        <div>
          <p className="text-xs text-gray-400 mb-1">Энергия</p>
          <p className="font-semibold text-gray-900">
            {session.energy_kwh.toFixed(2)} <span className="text-xs font-normal">кВт·ч</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Сумма</p>
          <p className="font-semibold text-gray-900">
            {session.amount_som.toFixed(0)} <span className="text-xs font-normal">сом</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Время</p>
          <p className="font-semibold text-gray-900">
            {formatDuration(session.duration_minutes)}
          </p>
        </div>
      </div>
    </button>
  );
}

export function AdminSessionsPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>("active");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Активные сессии
  const {
    data: activeData,
    isLoading: activeLoading,
    error: activeError,
    refetch: refetchActive,
    isFetching: activeFetching,
  } = useQuery({
    queryKey: ["adminActiveSessions"],
    queryFn: () => adminApi.getActiveSessions({ limit: 100 }),
    enabled: viewMode === "active",
    staleTime: 15 * 1000, // Чаще обновляем активные
    refetchInterval: 30 * 1000,
    retry: 2,
  });

  // История сессий
  const {
    data: historyData,
    isLoading: historyLoading,
    error: historyError,
    refetch: refetchHistory,
    isFetching: historyFetching,
  } = useQuery({
    queryKey: ["adminSessionsHistory", statusFilter],
    queryFn: () => {
      const params: Parameters<typeof adminApi.getSessionsHistory>[0] = {
        limit: 100,
      };
      if (statusFilter !== "all") {
        params.status = statusFilter as "started" | "stopped" | "error";
      }
      return adminApi.getSessionsHistory(params);
    },
    enabled: viewMode === "history",
    staleTime: 30 * 1000,
    retry: 2,
  });

  const isLoading = viewMode === "active" ? activeLoading : historyLoading;
  const isFetching = viewMode === "active" ? activeFetching : historyFetching;
  const error = viewMode === "active" ? activeError : historyError;
  const sessions = viewMode === "active" ? activeData?.data : historyData?.data;

  const handleRefresh = () => {
    if (viewMode === "active") {
      refetchActive();
    } else {
      refetchHistory();
    }
  };

  const handleSessionClick = (sessionId: string) => {
    navigate(`/admin/sessions/${sessionId}`);
  };

  // Локальная фильтрация по поиску
  const filteredSessions = sessions?.filter((session) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      session.station_name?.toLowerCase().includes(query) ||
      session.client_email?.toLowerCase().includes(query) ||
      session.client_phone?.includes(query) ||
      session.location_name?.toLowerCase().includes(query)
    );
  });

  // Ошибка загрузки
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 shadow-sm max-w-sm w-full text-center">
          <AlertTriangle size={48} className="text-error-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Ошибка загрузки
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            {error instanceof Error ? error.message : "Не удалось загрузить сессии"}
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
            <h1 className="text-xl font-bold">Сессии зарядки</h1>
            <button
              onClick={handleRefresh}
              disabled={isFetching}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={20} className={isFetching ? "animate-spin" : ""} />
            </button>
          </div>

          {/* View Mode Tabs */}
          <div className="flex bg-white/10 rounded-lg p-1">
            <button
              onClick={() => setViewMode("active")}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === "active"
                  ? "bg-white text-gray-900"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Активные
              {activeData && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-primary-500 text-white text-xs">
                  {activeData.total}
                </span>
              )}
            </button>
            <button
              onClick={() => setViewMode("history")}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === "history"
                  ? "bg-white text-gray-900"
                  : "text-white/70 hover:text-white"
              }`}
            >
              История
            </button>
          </div>
        </div>
      </div>

      {/* Search (only for history) */}
      {viewMode === "history" && (
        <div className="px-4 py-3 bg-white border-b border-gray-100">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по клиенту, станции, локации..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      )}

      {/* Status Filter (only for history) */}
      {viewMode === "history" && (
        <div className="px-4 py-3 bg-white border-b border-gray-100 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {(
              [
                { key: "all", label: "Все" },
                { key: "stopped", label: "Завершенные" },
                { key: "started", label: "Активные" },
                { key: "error", label: "Ошибки" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  statusFilter === key
                    ? "bg-primary-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sessions List */}
      <div className="p-4 space-y-3">
        {isLoading ? (
          // Skeleton loader
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm animate-pulse">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                  <div>
                    <div className="w-32 h-5 bg-gray-200 rounded mb-1" />
                    <div className="w-24 h-4 bg-gray-100 rounded" />
                  </div>
                </div>
                <div className="w-20 h-6 bg-gray-200 rounded-full" />
              </div>
              <div className="w-48 h-4 bg-gray-100 rounded mb-3" />
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100">
                <div className="w-16 h-8 bg-gray-100 rounded" />
                <div className="w-16 h-8 bg-gray-100 rounded" />
                <div className="w-16 h-8 bg-gray-100 rounded" />
              </div>
            </div>
          ))
        ) : filteredSessions && filteredSessions.length > 0 ? (
          filteredSessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onClick={() => handleSessionClick(session.id)}
            />
          ))
        ) : (
          <div className="text-center py-12">
            <Battery size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {viewMode === "active"
                ? "Нет активных сессий"
                : searchQuery
                  ? "Сессии не найдены"
                  : "История сессий пуста"}
            </p>
          </div>
        )}
      </div>

      {/* Admin Navigation */}
      <AdminBottomNavigation />
    </div>
  );
}
