import { Search, Filter } from 'lucide-react';
import { StationMap } from '../features/stations/components/StationMap';
import { useNavigate } from 'react-router-dom';
import { useStations } from '../features/stations/hooks/useStations';
import type { Station } from '../api/types';

export const MapPage = () => {
  const navigate = useNavigate();
  // Показываем все станции на карте (включая недоступные)
  const { data: stations = [] } = useStations(false);

  const handleStationClick = (station: Station) => {
    navigate(`/charging/${station.id}`);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Search Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4">
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
        <StationMap stations={stations} onStationSelect={handleStationClick} />
      </div>
    </div>
  );
};