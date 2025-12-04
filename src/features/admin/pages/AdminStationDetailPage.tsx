/**
 * Страница деталей станции для операторов
 *
 * Позволяет просматривать детали и редактировать настройки станции.
 */

import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  WifiOff,
  Wrench,
  RefreshCw,
  MapPin,
  Plug,
  Settings,
  Save,
  Clock,
  DollarSign,
} from "lucide-react";
import { AdminBottomNavigation } from "../components/AdminBottomNavigation";
import { adminApi, type AdminStation, type StationUpdateRequest } from "@/services/adminApi";
import { logger } from "@/shared/utils/logger";

/**
 * Получить информацию о статусе
 */
function getStatusInfo(station: AdminStation) {
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
 * Получить цвет статуса коннектора
 */
function getConnectorStatusColor(status: string) {
  switch (status) {
    case "Available":
      return "bg-success-100 text-success-700";
    case "Charging":
    case "Occupied":
      return "bg-primary-100 text-primary-700";
    case "Unavailable":
    case "Faulted":
      return "bg-error-100 text-error-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export function AdminStationDetailPage() {
  const navigate = useNavigate();
  const { stationId } = useParams<{ stationId: string }>();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<StationUpdateRequest>({});

  // Получаем данные станции
  const {
    data: station,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["adminStation", stationId],
    queryFn: () => adminApi.getStation(stationId!),
    enabled: !!stationId,
    staleTime: 30 * 1000,
    retry: 2,
  });

  // Мутация для обновления
  const updateMutation = useMutation({
    mutationFn: (data: StationUpdateRequest) =>
      adminApi.updateStation(stationId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminStation", stationId] });
      queryClient.invalidateQueries({ queryKey: ["adminStations"] });
      setIsEditing(false);
      setEditData({});
    },
    onError: (error) => {
      logger.error("[AdminStationDetail] Update error:", error);
    },
  });

  const handleBack = () => {
    navigate("/admin/stations");
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleStartEdit = () => {
    if (station) {
      setEditData({
        status: station.status as StationUpdateRequest["status"],
        is_available: station.is_available,
        price_per_kwh: station.price_per_kwh ?? undefined,
        session_fee: station.session_fee ?? undefined,
      });
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    updateMutation.mutate(editData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({});
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
            {error instanceof Error ? error.message : "Станция не найдена"}
          </p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Назад к списку
          </button>
        </div>
      </div>
    );
  }

  // Загрузка
  if (isLoading || !station) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="bg-gradient-dark text-white p-4 pt-safe">
          <div className="flex items-center gap-3">
            <button onClick={handleBack} className="p-2 -ml-2">
              <ArrowLeft size={24} />
            </button>
            <div className="w-48 h-6 bg-white/20 rounded animate-pulse" />
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-xl p-4 shadow-sm animate-pulse">
            <div className="w-full h-32 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(station);
  const StatusIcon = statusInfo.icon;

  const lastHeartbeat = station.last_heartbeat_at
    ? new Date(station.last_heartbeat_at).toLocaleString("ru-RU")
    : "Никогда";

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-dark text-white">
        <div className="p-4 pt-safe">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={handleBack} className="p-2 -ml-2">
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-lg font-bold">
                  {station.serial_number || `Станция ${station.id.slice(0, 8)}`}
                </h1>
                <p className="text-white/70 text-sm">
                  {station.model || "Модель не указана"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isFetching}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={20} className={isFetching ? "animate-spin" : ""} />
              </button>
              {!isEditing && (
                <button
                  onClick={handleStartEdit}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <Settings size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Status Card */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Статус</h2>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${statusInfo.bgColor}`}>
              <StatusIcon size={16} className={statusInfo.color} />
              <span className={`text-sm font-medium ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Доступность</span>
              {isEditing ? (
                <select
                  value={editData.is_available ? "true" : "false"}
                  onChange={(e) =>
                    setEditData({ ...editData, is_available: e.target.value === "true" })
                  }
                  className="px-3 py-1 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="true">Доступна</option>
                  <option value="false">Недоступна</option>
                </select>
              ) : (
                <span className={station.is_available ? "text-success-600" : "text-error-600"}>
                  {station.is_available ? "Доступна" : "Недоступна"}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500">Режим работы</span>
              {isEditing ? (
                <select
                  value={editData.status || station.status}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      status: e.target.value as StationUpdateRequest["status"],
                    })
                  }
                  className="px-3 py-1 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="active">Активна</option>
                  <option value="inactive">Неактивна</option>
                  <option value="maintenance">Обслуживание</option>
                </select>
              ) : (
                <span className="text-gray-900">{station.status}</span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-500">
                <Clock size={14} />
                <span>Последний heartbeat</span>
              </div>
              <span className="text-gray-900">{lastHeartbeat}</span>
            </div>
          </div>
        </div>

        {/* Location Card */}
        {station.location_name && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-3">Локация</h2>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary-50 rounded-lg">
                <MapPin size={20} className="text-primary-500" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{station.location_name}</p>
                {station.location_address && (
                  <p className="text-sm text-gray-500">{station.location_address}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pricing Card */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-3">Тарификация</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-500">
                <DollarSign size={14} />
                <span>Цена за кВт·ч</span>
              </div>
              {isEditing ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={editData.price_per_kwh ?? station.price_per_kwh ?? ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        price_per_kwh: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm text-right"
                    min="0"
                    step="0.1"
                  />
                  <span className="text-sm text-gray-500">сом</span>
                </div>
              ) : (
                <span className="font-medium text-gray-900">
                  {station.price_per_kwh ?? "—"} сом
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500">Сервисный сбор</span>
              {isEditing ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={editData.session_fee ?? station.session_fee ?? ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        session_fee: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm text-right"
                    min="0"
                    step="0.1"
                  />
                  <span className="text-sm text-gray-500">сом</span>
                </div>
              ) : (
                <span className="font-medium text-gray-900">
                  {station.session_fee ?? "—"} сом
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500">Мощность</span>
              <span className="font-medium text-gray-900">
                {station.power_capacity ?? "—"} кВт
              </span>
            </div>
          </div>
        </div>

        {/* Connectors Card */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-3">
            Коннекторы ({station.connectors_count})
          </h2>
          <div className="space-y-2">
            {station.connectors.length > 0 ? (
              station.connectors.map((connector) => (
                <div
                  key={connector.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Plug size={18} className="text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        #{connector.connector_number}
                        {connector.connector_type && ` • ${connector.connector_type}`}
                      </p>
                      {connector.power_kw && (
                        <p className="text-xs text-gray-500">{connector.power_kw} кВт</p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getConnectorStatusColor(
                      connector.status
                    )}`}
                  >
                    {connector.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                Нет данных о коннекторах
              </p>
            )}
          </div>
        </div>

        {/* Technical Info */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-3">Техническая информация</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">ID</span>
              <span className="text-gray-900 font-mono text-xs">{station.id}</span>
            </div>
            {station.manufacturer && (
              <div className="flex justify-between">
                <span className="text-gray-500">Производитель</span>
                <span className="text-gray-900">{station.manufacturer}</span>
              </div>
            )}
            {station.firmware_version && (
              <div className="flex justify-between">
                <span className="text-gray-500">Прошивка</span>
                <span className="text-gray-900">{station.firmware_version}</span>
              </div>
            )}
            {station.created_at && (
              <div className="flex justify-between">
                <span className="text-gray-500">Добавлена</span>
                <span className="text-gray-900">
                  {new Date(station.created_at).toLocaleDateString("ru-RU")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Edit Actions */}
        {isEditing && (
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="flex-1 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {updateMutation.isPending ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <Save size={18} />
              )}
              Сохранить
            </button>
          </div>
        )}

        {/* Update Error */}
        {updateMutation.isError && (
          <div className="p-3 bg-error-50 border border-error-200 rounded-lg">
            <p className="text-sm text-error-700">
              {updateMutation.error instanceof Error
                ? updateMutation.error.message
                : "Ошибка сохранения"}
            </p>
          </div>
        )}
      </div>

      {/* Admin Navigation */}
      <AdminBottomNavigation />
    </div>
  );
}
