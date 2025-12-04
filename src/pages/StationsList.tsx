import { useState } from "react";
import { ChevronLeft, Heart, Zap, Navigation } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useStations } from "@/features/stations/hooks/useStations";
import { useFavorites } from "@/features/favorites/hooks/useFavorites";
import { useAuthStatus } from "@/features/auth/hooks/useAuth";
import { DynamicPricingDisplay } from "@/features/pricing/components/DynamicPricingDisplay";
import { StationListSkeleton } from "@/shared/components/Skeleton";

export const StationsList = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
      <div className="min-h-screen bg-gray-50 pb-20">
        {/* Header skeleton */}
        <div className="bg-white shadow-sm p-4">
          <div className="h-8 bg-gray-200 rounded w-40 mb-4" />
          <div className="flex gap-2">
            <div className="h-10 bg-gray-200 rounded-full w-24" />
            <div className="h-10 bg-gray-200 rounded-full w-20" />
            <div className="h-10 bg-gray-200 rounded-full w-28" />
          </div>
        </div>
        <StationListSkeleton count={4} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header с safe-area */}
      <div className="bg-white shadow-sm sticky-header-safe z-10">
        <div className="flex items-center px-4 pb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2 ml-2">
            <img
              src="/icons/voltera-logo-square.svg"
              alt=""
              className="h-6 w-auto"
            />
            <h1 className="text-xl font-semibold">
              {isFavoritesPage ? "Избранные станции" : "Станции списком"}
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
                      ? "bg-primary-100 text-primary-700 font-medium"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
              className="h-16 w-auto mx-auto mb-3 opacity-20"
            />
            <Heart className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">Нет избранных станций</p>
            <p className="text-gray-400 text-sm mt-2">
              Добавьте станции в избранное,
              <br />
              чтобы они появились здесь
            </p>
          </div>
        ) : (
          filteredStations.map((station) => {
            const isFavoriteStation = isFavorite(station.location_id);

            return (
              <div
                key={station.id}
                className="bg-white rounded-2xl p-4 shadow-sm"
              >
                {/* Station Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        station.status === "active"
                          ? "bg-success-100"
                          : "bg-gray-100"
                      }`}
                    >
                      <Zap
                        className={`w-6 h-6 ${
                          station.status === "active"
                            ? "text-success-600"
                            : "text-gray-400"
                        }`}
                      />
                    </div>
                    <div>
                      <h3
                        className={`font-semibold ${
                          station.status === "active"
                            ? "text-gray-900"
                            : "text-gray-500"
                        }`}
                      >
                        {station.locationName || station.model}
                        {station.status !== "active" && (
                          <span className="ml-2 text-xs text-red-500">
                            (
                            {station.status === "maintenance"
                              ? "На обслуживании"
                              : "Недоступна"}
                            )
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
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
                          : "text-gray-400"
                      }`}
                    />
                  </button>
                </div>

                {/* Station Info */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">
                        Мощность: {station.power_capacity} кВт
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>
                      Разъемы:{" "}
                      {station.connector_types?.join(", ") || "Не указаны"}
                    </span>
                    <span className="text-gray-400">
                      ({station.connectors_count || 0} шт.)
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Тариф: {station.price_per_kwh ?? 0} сом/кВт·ч
                  </div>
                </div>

                {/* Dynamic Pricing Display */}
                <div className="mt-3">
                  <DynamicPricingDisplay
                    stationId={station.serial_number}
                    compact={true}
                  />
                </div>

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
                    className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <Navigation className="w-4 h-4" />
                    На карте
                  </button>
                  <button
                    onClick={() => {
                      navigate(`/charging/${station.serial_number}`);
                    }}
                    disabled={station.status !== "active"}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                      station.status === "active"
                        ? "bg-primary-500 text-white hover:bg-primary-600"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {station.status === "active" ? "Зарядить" : "Недоступна"}
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
