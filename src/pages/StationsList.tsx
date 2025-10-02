import { useState } from 'react';
import { ChevronLeft, Heart, Zap, Navigation } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStations } from '@/features/locations/hooks/useLocations';
import { useLocationUpdates } from '@/features/locations/hooks/useLocations';
import { useFavorites } from '@/features/favorites/hooks/useFavorites';
import { useAuthStatus } from '@/features/auth/hooks/useAuth';
import { DynamicPricingDisplay } from '@/features/pricing/components/DynamicPricingDisplay';

export const StationsList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStatus();
  const isFavoritesPage = location.pathname === '/favorites';
  const [selectedCity, setSelectedCity] = useState('Бишкек');
  const { toggleFavorite: toggleFavoriteApi, isFavorite } = useFavorites();

  const { stations, isLoading: loading } = useStations();

  // Подключаемся к real-time обновлениям для всех локаций
  useLocationUpdates(['all']);

  // Extract city from address (format: "address, city")
  const extractCity = (address: string) => {
    const parts = address.split(', ');
    return parts[parts.length - 1] || 'Бишкек';
  };

  const cities = [...new Set(stations.map(s => extractCity(s.locationAddress || '')))].sort();

  // Filter stations based on whether we're on the favorites page
  let filteredStations = stations;
  if (isFavoritesPage) {
    // On favorites page, show only favorite stations
    filteredStations = stations.filter(station => isFavorite(station.id));
  } else {
    // On regular stations page, filter by city
    filteredStations = stations.filter(station => extractCity(station.locationAddress || '') === selectedCity);
  }

  const toggleFavorite = (stationId: string) => {
    if (!user) {
      // Если пользователь не авторизован, перенаправляем на страницу авторизации
      navigate('/auth');
      return;
    }
    toggleFavoriteApi(stationId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загружаем станции...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="flex items-center p-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold ml-2">
            {isFavoritesPage ? 'Избранные станции' : 'Станции списком'}
          </h1>
        </div>

        {/* City Filter - only show on regular stations page */}
        {!isFavoritesPage && (
          <div className="px-4 pb-4">
            <div className="flex gap-2 overflow-x-auto">
              {cities.map(city => (
                <button
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                    selectedCity === city
                      ? 'bg-cyan-100 text-cyan-700 font-medium'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
            <Heart className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">Нет избранных станций</p>
            <p className="text-gray-400 text-sm mt-2">Добавьте станции в избранное,<br/>чтобы они появились здесь</p>
          </div>
        ) : (
          filteredStations.map(station => {
            const isFavoriteStation = isFavorite(station.id);
          
          return (
            <div 
              key={station.id}
              className="bg-white rounded-2xl p-4 shadow-sm"
            >
              {/* Station Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    station.status === 'active' ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <Zap className={`w-6 h-6 ${
                      station.status === 'active' ? 'text-green-600' : 'text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <h3 className={`font-semibold ${
                      station.status === 'active' ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {station.locationName || station.model}
                      {station.status !== 'active' && <span className="ml-2 text-xs text-red-500">
                        ({station.status === 'maintenance' ? 'На обслуживании' : 'Недоступна'})
                      </span>}
                    </h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <span>{station.locationAddress}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggleFavorite(station.id)}
                  className="p-2 -mr-2 -mt-2"
                >
                  <Heart
                    className={`w-5 h-5 transition-colors ${
                      isFavoriteStation ? 'fill-red-500 text-red-500' : 'text-gray-400'
                    }`}
                  />
                </button>
              </div>

              {/* Station Info */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Мощность: {station.power_capacity} кВт</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Разъемы: {station.connector_types.join(', ')}</span>
                  <span className="text-gray-400">({station.connectors_count} шт.)</span>
                </div>
                <div className="text-sm text-gray-600">
                  Тариф: {station.price_per_kwh} сом/кВт·ч
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
                    navigate('/', {
                      state: {
                        focusLocation: {
                          lat: station.latitude,
                          lng: station.longitude,
                          zoom: 16
                        },
                        selectedStationId: station.id
                      }
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
                  disabled={station.status !== 'active'}
                  className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                    station.status === 'active'
                      ? 'bg-cyan-500 text-white hover:bg-cyan-600'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {station.status === 'active' ? 'Зарядить' : 'Недоступна'}
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