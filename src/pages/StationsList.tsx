import { useState } from "react";
import { ChevronLeft, Heart, Zap, Navigation } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useStations } from "@/features/stations/hooks/useStations";
import { useFavorites } from "@/features/favorites/hooks/useFavorites";
import { useAuthStatus } from "@/features/auth/hooks/useAuth";
import { StationListSkeleton } from "@/shared/components/Skeleton";

/**
 * Проверяет, доступна ли станция для зарядки.
 * Backend возвращает вычисленный статус: 'available', 'occupied', 'offline', 'maintenance'
 * Станция доступна если статус 'available' или 'occupied' (коннекторы заняты, но станция работает)
 * Для совместимости также принимает admin status 'active'
 */
function isStationAvailable(status: string): boolean {
  return status === "available" || status === "occupied" || status === "active";
}

export const StationsList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { user } = useAuthStatus();
  const isFavoritesPage = location.pathname === "/favorites";
  const { toggleFavorite: toggleFavoriteApi, isFavorite } = useFavorites();

  const { data: stations = [], isLoading: loading } = useStations(false); // Get all stations (not only available)

  // WS real-time для локаций отключён — используем периодическое обновление данных через React Query.

  // Extract unique cities from stations
  const cities = [
    ...new Set(stations.map((s) => s.city).filter(Boolean)),
  ].sort();
  const [selectedCity, setSelectedCity] = useState<string | null>(
    cities[0] || null,
  );

  // Filter stations based on whether we're on the favorites page
  let filteredStations = stations;
  if (isFavoritesPage) {
    // On favorites page, show only favorite stations by location_id
    filteredStations = stations.filter((station) =>
      isFavorite(station.location_id),
    );
  } else if (selectedCity) {
    // On regular stations page, filter by city
    filteredStations = stations.filter(
      (station) => station.city === selectedCity,
    );
  }

  const toggleFavorite = (stationId: string) => {
    if (!user) {
      // Если пользователь не авторизован, перенаправляем на страницу авторизации
      navigate("/auth");
      return;
    }
    toggleFavoriteApi(stationId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 transition-colors">
        {/* Header skeleton */}
        <div className="bg-white dark:bg-gray-800 shadow-sm p-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-4" />
          <div className="flex gap-2">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-full w-24" />
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-full w-20" />
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-full w-28" />
          </div>
        </div>
        <StationListSkeleton count={4} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 transition-colors">
      {/* Header с safe-area */}
      <div className="bg-white dark:bg-gray-800 shadow-sm sticky-header-safe z-10">
        <div className="flex items-center px-4 pb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>
          <div className="flex items-center gap-2 ml-2">
            <img
              src="/icons/voltera-logo-square.svg"
              alt=""
              className="h-6 w-auto dark:invert dark:brightness-200"
            />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {isFavoritesPage
                ? t("stationsList.favoritesTitle")
                : t("stationsList.title")}
            </h1>
          </div>
        </div>

        {/* City Filter - only show on regular stations page */}
        {!isFavoritesPage && (
          <div className="px-4 pb-4">
            <div className="flex gap-2 overflow-x-auto">
              {cities.map((city) => (
                <button
                  key={city}
                  onClick={() => setSelectedCity(city ?? null)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                    selectedCity === city
                      ? "bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 font-medium"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stations List */}
      <div className="p-4 space-y-4">
        {filteredStations.length === 0 && isFavoritesPage ? (
          <div className="text-center py-12">
            <img
              src="/icons/voltera-logo-square.svg"
              alt=""
              className="h-16 w-auto mx-auto mb-3 opacity-20 dark:invert dark:brightness-200"
            />
            <Heart className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              {t("stationsList.noFavorites")}
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-2 whitespace-pre-line">
              {t("stationsList.addFavoritesHint")}
            </p>
          </div>
        ) : (
          filteredStations.map((station) => {
            const isFavoriteStation = isFavorite(station.location_id);

            return (
              <div
                key={station.id}
                className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm"
              >
                {/* Station Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        isStationAvailable(station.status)
                          ? "bg-success-100 dark:bg-success-900/30"
                          : "bg-gray-100 dark:bg-gray-700"
                      }`}
                    >
                      <Zap
                        className={`w-6 h-6 ${
                          isStationAvailable(station.status)
                            ? "text-success-600 dark:text-success-400"
                            : "text-gray-400 dark:text-gray-500"
                        }`}
                      />
                    </div>
                    <div>
                      <h3
                        className={`font-semibold ${
                          isStationAvailable(station.status)
                            ? "text-gray-900 dark:text-white"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {station.locationName || station.model}
                        {!isStationAvailable(station.status) && (
                          <span className="ml-2 text-xs text-red-500 dark:text-red-400">
                            (
                            {station.status === "maintenance"
                              ? t("stationsList.onMaintenance")
                              : t("stationsList.unavailable")}
                            )
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                        <span>{station.locationAddress}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleFavorite(station.location_id)}
                    className="p-2 -mr-2 -mt-2"
                  >
                    <Heart
                      className={`w-5 h-5 transition-colors ${
                        isFavoriteStation
                          ? "fill-red-500 text-red-500"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    />
                  </button>
                </div>

                {/* Station Info */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-600 dark:text-gray-300">
                        {t("stationsList.power")}: {station.power_capacity}{" "}
                        {t("common.kw")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span>
                      {t("stationsList.connectors")}:{" "}
                      {station.connector_types?.join(", ") ||
                        t("stationsList.notSpecified")}
                    </span>
                    <span className="text-gray-400 dark:text-gray-500">
                      ({station.connectors_count || 0})
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {t("stationsList.tariff")}: {station.price_per_kwh ?? 0}{" "}
                    {t("common.som")}/{t("common.kwh")}
                  </div>
                </div>

                {/* Цена - используем данные из API вместо отдельного запроса */}
                {/* DynamicPricingDisplay убран из списка для оптимизации - данные уже есть в station */}

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => {
                      navigate("/", {
                        state: {
                          focusLocation: {
                            lat: station.latitude,
                            lng: station.longitude,
                            zoom: 16,
                          },
                          selectedStationId: station.id,
                        },
                      });
                    }}
                    className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Navigation className="w-4 h-4" />
                    {t("stationsList.onMap")}
                  </button>
                  <button
                    onClick={() => {
                      navigate(`/charging/${station.serial_number}`);
                    }}
                    disabled={!isStationAvailable(station.status)}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                      isStationAvailable(station.status)
                        ? "bg-primary-500 dark:bg-primary-600 text-white hover:bg-primary-600 dark:hover:bg-primary-500"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {isStationAvailable(station.status)
                      ? t("stationsList.charge")
                      : t("stationsList.unavailable")}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
