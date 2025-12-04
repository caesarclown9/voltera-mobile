/**
 * Страница управления станциями для операторов
 *
 * ВАЖНО: Использует Admin API вместо прямых Supabase запросов.
 * Данные фильтруются на бэкенде по роли оператора.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Zap,
  AlertTriangle,
  CheckCircle,
  WifiOff,
  Wrench,
  ChevronRight,
  RefreshCw,
  Search,
  MapPin,
  Plug,
} from "lucide-react";
import { AdminBottomNavigation } from "../components/AdminBottomNavigation";
import { adminApi, type AdminStation } from "@/services/adminApi";

type StatusFilter = "all" | "online" | "offline" | "error" | "maintenance";

/**
 * Получить иконку и цвет для статуса станции
 */
function getStatusInfo(station: AdminStation) {
  // Проверяем heartbeat для определения online/offline
  const isOnline = station.last_heartbeat_at
    ? Date.now() - new Date(station.last_heartbeat_at).getTime() < 5 * 60 * 1000
    : false;

  if (station.status === "maintenance") {
    return {
      icon: Wrench,
      color: "text-warning-500",
      bgColor: "bg-warning-50",
      label: "Обслуживание",
    };
  }

  if (station.status === "error" || !station.is_available) {
    return {
      icon: AlertTriangle,
      color: "text-error-500",
      bgColor: "bg-error-50",
      label: "Ошибка",
    };
  }

  if (!isOnline) {
    return {
      icon: WifiOff,
      color: "text-gray-400",
      bgColor: "bg-gray-100",
      label: "Офлайн",
    };
  }

  return {
    icon: CheckCircle,
    color: "text-success-500",
    bgColor: "bg-success-50",
    label: "Онлайн",
  };
}

/**
 * Карточка станции
 */
function StationCard({
  station,
  onClick,
}: {
  station: AdminStation;
  onClick: () => void;
}) {
  const statusInfo = getStatusInfo(station);
  const StatusIcon = statusInfo.icon;

  // Считаем коннекторы по статусам
  const availableConnectors = station.connectors.filter(
    (c) => c.status === "Available"
  ).length;
  const chargingConnectors = station.connectors.filter(
    (c) => c.status === "Charging" || c.status === "Occupied"
  ).length;

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-left"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${statusInfo.bgColor}`}>
            <Zap size={20} className={statusInfo.color} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {station.serial_number || `Станция ${station.id.slice(0, 8)}`}
            </h3>
            <p className="text-sm text-gray-500">
              {station.model || "Неизвестная модель"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${statusInfo.bgColor}`}>
            <StatusIcon size={14} className={statusInfo.color} />
            <span className={`text-xs font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
          <ChevronRight size={20} className="text-gray-400" />
        </div>
      </div>

      {/* Локация */}
      {station.location_name && (
        <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
          <MapPin size={14} />
          <span>{station.location_name}</span>
          {station.location_address && (
            <span className="text-gray-400">• {station.location_address}</span>
          )}
        </div>
      )}

      {/* Коннекторы и цена */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Plug size={14} className="text-gray-400" />
            <span className="text-gray-600">
              {availableConnectors}/{station.connectors_count} своб.
            </span>
          </div>
          {chargingConnectors > 0 && (
            <div className="flex items-center gap-1">
              <Zap size={14} className="text-primary-500" />
              <span className="text-primary-600">{chargingConnectors} заряж.</span>
            </div>
          )}
        </div>
        <div className="text-gray-600">
          <span className="font-medium text-gray-900">
            {station.price_per_kwh ?? "—"}
          </span>{" "}
          сом/кВт·ч
        </div>
      </div>
    </button>
  );
}

export function AdminStationsPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Получаем станции через Admin API
  const {
    data: stationsData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["adminStations", statusFilter],
    queryFn: () => {
      const params: Parameters<typeof adminApi.getStations>[0] = {
        limit: 100,
      };

      // Маппинг фильтра на параметры API
      if (statusFilter === "online") {
        params.is_online = true;
      } else if (statusFilter === "offline") {
        params.is_online = false;
      } else if (statusFilter === "maintenance") {
        params.status = "maintenance";
      }
      // "error" и "all" не требуют дополнительных параметров

      return adminApi.getStations(params);
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    retry: 2,
  });

  const handleRefresh = () => {
    refetch();
  };

  const handleStationClick = (stationId: string) => {
    navigate(`/admin/stations/${stationId}`);
  };

  // Фильтрация по поисковому запросу (локально)
  const filteredStations = stationsData?.data.filter((station) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      station.serial_number?.toLowerCase().includes(query) ||
      station.model?.toLowerCase().includes(query) ||
      station.location_name?.toLowerCase().includes(query) ||
      station.location_address?.toLowerCase().includes(query)
    );
  });

  // Дополнительная фильтрация по статусу "error" (локально)
  const displayStations = filteredStations?.filter((station) => {
    if (statusFilter === "error") {
      return station.status === "error" || !station.is_available;
    }
    return true;
  });

  // Группировка по статусам для отображения счетчиков
  const statusCounts = {
    all: stationsData?.total ?? 0,
    online: stationsData?.data.filter((s) => {
      const isOnline = s.last_heartbeat_at
        ? Date.now() - new Date(s.last_heartbeat_at).getTime() < 5 * 60 * 1000
        : false;
      return isOnline && s.status !== "maintenance" && s.is_available;
    }).length ?? 0,
    offline: stationsData?.data.filter((s) => {
      const isOnline = s.last_heartbeat_at
        ? Date.now() - new Date(s.last_heartbeat_at).getTime() < 5 * 60 * 1000
        : false;
      return !isOnline && s.status !== "maintenance";
    }).length ?? 0,
    error: stationsData?.data.filter((s) => s.status === "error" || !s.is_available).length ?? 0,
    maintenance: stationsData?.data.filter((s) => s.status === "maintenance").length ?? 0,
  };

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
            {error instanceof Error ? error.message : "Не удалось загрузить станции"}
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
            <h1 className="text-xl font-bold">Станции</h1>
            <button
              onClick={handleRefresh}
              disabled={isFetching}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={20} className={isFetching ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
            <input
              type="text"
              placeholder="Поиск по названию, модели, локации..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {(
            [
              { key: "all", label: "Все" },
              { key: "online", label: "Онлайн" },
              { key: "offline", label: "Офлайн" },
              { key: "error", label: "Ошибки" },
              { key: "maintenance", label: "Обслуживание" },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                statusFilter === key
                  ? "bg-primary-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label}
              <span
                className={`text-xs ${
                  statusFilter === key ? "text-white/80" : "text-gray-400"
                }`}
              >
                {statusCounts[key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Stations List */}
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
              <div className="flex justify-between">
                <div className="w-24 h-4 bg-gray-100 rounded" />
                <div className="w-20 h-4 bg-gray-100 rounded" />
              </div>
            </div>
          ))
        ) : displayStations && displayStations.length > 0 ? (
          displayStations.map((station) => (
            <StationCard
              key={station.id}
              station={station}
              onClick={() => handleStationClick(station.id)}
            />
          ))
        ) : (
          <div className="text-center py-12">
            <Zap size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchQuery
                ? "Станции не найдены"
                : statusFilter !== "all"
                  ? `Нет станций со статусом "${statusFilter}"`
                  : "Нет доступных станций"}
            </p>
          </div>
        )}
      </div>

      {/* Admin Navigation */}
      <AdminBottomNavigation />
    </div>
  );
}
