import { Heart } from "lucide-react";
import type { Station } from "../../../api/types";
import type { StationWithLocation } from "../types";
import { useFavorites } from "../../favorites/hooks/useFavorites";
import { useAuthStatus } from "../../auth/hooks/useAuth";

interface StationCardProps {
  station: StationWithLocation;
  onSelect: () => void;
  showDistance?: boolean;
}

export function StationCard({
  station,
  onSelect,
  showDistance = true,
}: StationCardProps) {
  const { isAuthenticated } = useAuthStatus();
  const { isFavorite, toggleFavorite, isToggling } = useFavorites();
  const getStatusConfig = (status: Station["status"]) => {
    const configs = {
      active: {
        text: "Активна",
        color: "text-green-600 bg-green-50 border-green-200",
        icon: "🟢",
      },
      inactive: {
        text: "Неактивна",
        color: "text-gray-600 bg-gray-50 border-gray-200",
        icon: "⚫",
      },
      maintenance: {
        text: "Обслуживание",
        color: "text-purple-600 bg-purple-50 border-purple-200",
        icon: "🔧",
      },
    };
    return configs[status] || configs.inactive;
  };

  const statusConfig = getStatusConfig(station.status);

  const formatDistance = (distance: number) => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)} м`;
    }
    return `${distance.toFixed(1)} км`;
  };

  const openInMaps = () => {
    if (station.latitude && station.longitude) {
      const url = `https://yandex.ru/maps/?text=${station.latitude},${station.longitude}`;
      window.open(url, "_blank");
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      {/* Заголовок */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-gray-900 text-lg">
              {station.locationName || station.model}
            </h3>
            {isAuthenticated && (
              <button
                onClick={() => toggleFavorite(station.location_id)}
                disabled={isToggling}
                className="ml-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
                title={
                  isFavorite(station.location_id)
                    ? "Удалить из избранного"
                    : "Добавить в избранное"
                }
              >
                <Heart
                  className={`w-5 h-5 transition-colors ${
                    isFavorite(station.location_id)
                      ? "fill-red-500 text-red-500"
                      : "text-gray-400 hover:text-red-500"
                  }`}
                />
              </button>
            )}
          </div>
          <p className="text-gray-600 text-sm mt-1">
            {station.locationAddress || "Адрес не указан"}
          </p>
        </div>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}
        >
          {statusConfig.icon} {statusConfig.text}
        </span>
      </div>

      {/* Технические характеристики */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div className="flex items-center space-x-2">
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <span className="text-gray-600">Мощность:</span>
          <span className="font-medium">
            {station.power_capacity || "N/A"} кВт
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span className="text-gray-600">Разъемов:</span>
          <span className="font-medium">{station.connectors_count || 0}</span>
        </div>

        <div className="flex items-center space-x-2">
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
            />
          </svg>
          <span className="text-gray-600">Тариф:</span>
          <span className="font-medium">
            {station.price_per_kwh || "N/A"} сом/кВт⋅ч
          </span>
        </div>

        {showDistance && station.distance !== undefined && (
          <div className="flex items-center space-x-2">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="text-gray-600">Расстояние:</span>
            <span className="font-medium">
              {formatDistance(station.distance)}
            </span>
          </div>
        )}
      </div>

      {/* Кнопки действий */}
      <div className="flex space-x-2">
        <button
          onClick={onSelect}
          disabled={
            station.status === "inactive" || station.status === "maintenance"
          }
          className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
            station.status === "inactive" || station.status === "maintenance"
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          }`}
        >
          {station.status === "active" ? "Выбрать станцию" : "Недоступна"}
        </button>

        <button
          onClick={openInMaps}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
          title="Открыть в Яндекс.Картах"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </div>

      {/* Дополнительная информация для разных статусов */}
      {station.status !== "active" && (
        <div
          className={`mt-3 p-2 rounded-lg ${
            station.status === "maintenance" ? "bg-purple-50" : "bg-gray-50"
          }`}
        >
          <p
            className={`text-xs ${
              station.status === "maintenance"
                ? "text-purple-700"
                : "text-gray-600"
            }`}
          >
            {station.status === "maintenance" &&
              "Станция временно недоступна из-за технических работ"}
            {station.status === "inactive" &&
              "Станция не отвечает. Обратитесь в службу поддержки"}
          </p>
        </div>
      )}
    </div>
  );
}
