import { Search, Filter } from 'lucide-react';
import { StationMap } from '../features/stations/components/StationMap';
import { useLocations } from '../features/locations/hooks/useLocations';
import type { Location } from '../api/types';

export const MapPage = () => {
  // Получаем локации со станциями (requestGeolocation: true для определения расстояния)
  const { locations, isLoading, error, userLocation } = useLocations(true);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Search Bar - Fixed with safe-area-inset-top */}
      <div
        className="absolute left-0 right-0 z-10 px-4 pb-4"
        style={{
          top: 'env(safe-area-inset-top, 0px)',
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)'
        }}
      >
        <div className="relative">
          <input
            type="text"
            placeholder="Поиск станций..."
            className="w-full px-4 py-3 pl-10 pr-12 bg-white rounded-xl shadow-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <button className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Filter className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="spinner" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full p-4 text-center">
            <p className="text-red-600">Ошибка загрузки станций. Попробуйте позже.</p>
          </div>
        ) : (
          <StationMap
            locations={locations}
            userLocation={userLocation ? [userLocation.lat, userLocation.lng] : undefined}
          />
        )}
      </div>
    </div>
  );
};