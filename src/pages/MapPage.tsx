import { useRef } from "react";
import {
  StationMap,
  StationMapRef,
} from "../features/stations/components/StationMap";
import { useLocations } from "../features/locations/hooks/useLocations";
import { Navigation } from "lucide-react";

export const MapPage = () => {
  // Ref для управления картой
  const mapRef = useRef<StationMapRef>(null);

  // Получаем локации со станциями (requestGeolocation: true для определения расстояния)
  const { locations, isLoading, error, userLocation, refreshGeolocation } =
    useLocations(true);

  // Обработчик кнопки "Моё местоположение"
  const handleMyLocationClick = () => {
    if (userLocation) {
      mapRef.current?.panTo(userLocation.lat, userLocation.lng, 15);
    }
    refreshGeolocation();
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Map */}
      <div className="flex-1 relative">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="spinner" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full p-4 text-center">
            <p className="text-red-600">
              Ошибка загрузки станций. Попробуйте позже.
            </p>
          </div>
        ) : (
          <StationMap
            ref={mapRef}
            locations={locations}
            userLocation={
              userLocation ? [userLocation.lat, userLocation.lng] : undefined
            }
          />
        )}

        {/* Кнопка "Моё местоположение" */}
        <button
          onClick={handleMyLocationClick}
          className="absolute bottom-24 right-4 bg-white rounded-full shadow-lg p-4 hover:shadow-xl transition-shadow active:scale-95"
          title="Моё местоположение"
        >
          <div className="relative">
            <Navigation
              className={`w-6 h-6 ${userLocation ? "text-primary-600" : "text-gray-400"}`}
            />
            {userLocation && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-success-500 rounded-full"></div>
            )}
          </div>
        </button>
      </div>
    </div>
  );
};
