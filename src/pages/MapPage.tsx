import { StationMap } from "../features/stations/components/StationMap";
import { useLocations } from "../features/locations/hooks/useLocations";

export const MapPage = () => {
  // Получаем локации со станциями (requestGeolocation: true для определения расстояния)
  const { locations, isLoading, error, userLocation } = useLocations(true);

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
            locations={locations}
            userLocation={
              userLocation ? [userLocation.lat, userLocation.lng] : undefined
            }
          />
        )}
      </div>
    </div>
  );
};
